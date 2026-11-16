package com.smashflow.backend.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import com.smashflow.backend.modules.booking.addon.dto.request.BookingServiceRequest;
import com.smashflow.backend.modules.booking.addon.enums.ServiceStatus;
import com.smashflow.backend.modules.booking.addon.model.BookingService;
import com.smashflow.backend.modules.booking.addon.repository.BookingServiceRepository;
import com.smashflow.backend.modules.booking.addon.repository.ServiceRepository;
import com.smashflow.backend.modules.booking.addon.service.BookingAddonService;
import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;

class BookingAddonServiceTest {
    private final BookingRepository bookingRepo = mock(BookingRepository.class);
    private final BookingServiceRepository lineRepo = mock(BookingServiceRepository.class);
    private final ServiceRepository serviceRepo = mock(ServiceRepository.class);
    private final BookingAddonService addons = new BookingAddonService(bookingRepo, lineRepo, serviceRepo);
    private Booking booking;
    private com.smashflow.backend.modules.booking.addon.model.Service service;

    @BeforeEach void setup() {
        booking = new Booking();
        booking.setId(10L);
        booking.setBookingStatus(BookingStatus.CHECKED_IN);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setCourtPrice(new BigDecimal("156000"));
        service = new com.smashflow.backend.modules.booking.addon.model.Service();
        service.setId(2L);
        service.setName("Thuê vợt");
        service.setUnitPrice(new BigDecimal("20000"));
        service.setStatus(ServiceStatus.ACTIVE);
    }

    @Test void addSnapshotsNameAndPriceThenRecalculates() {
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
        when(serviceRepo.findAvailableByIdForUpdate(2L)).thenReturn(Optional.of(service));
        when(lineRepo.save(any())).thenAnswer(call -> {
            BookingService line = call.getArgument(0);
            when(lineRepo.findByBooking_IdOrderByIdAsc(10L)).thenReturn(List.of(line));
            return line;
        });
        var lines = addons.add(10L, new BookingServiceRequest(2L, 2));
        assertEquals("Thuê vợt", lines.getFirst().name());
        assertEquals(new BigDecimal("40000"), booking.getServicePrice());
        assertEquals(new BigDecimal("196000"), booking.getTotalAmount());
        service.setName("Tên mới");
        service.setUnitPrice(new BigDecimal("30000"));
        assertEquals("Thuê vợt", lines.getFirst().name());
        assertEquals(new BigDecimal("20000"), lines.getFirst().priceAtBooking());
    }

    @Test void addingExistingLineUsesOriginalPriceAndLimitsQuantity() {
        BookingService line = line(2, new BigDecimal("20000"));
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
        when(serviceRepo.findAvailableByIdForUpdate(2L)).thenReturn(Optional.of(service));
        when(lineRepo.findByBooking_IdAndService_Id(10L, 2L)).thenReturn(Optional.of(line));
        when(lineRepo.findByBooking_IdOrderByIdAsc(10L)).thenReturn(List.of(line));
        addons.add(10L, new BookingServiceRequest(2L, 3));
        assertEquals(5, line.getQuantity());
        assertEquals(new BigDecimal("100000"), line.getSubtotal());
        assertThrows(IllegalArgumentException.class, () -> addons.add(10L, new BookingServiceRequest(2L, 95)));
    }

    @Test void removeRecalculatesAndSettledBookingIsFrozen() {
        BookingService line = line(2, new BigDecimal("20000"));
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
        when(lineRepo.findByBooking_IdAndService_Id(10L, 2L)).thenReturn(Optional.of(line));
        addons.remove(10L, 2L);
        assertEquals(BigDecimal.ZERO, booking.getServicePrice());
        assertEquals(new BigDecimal("156000"), booking.getTotalAmount());
        verify(lineRepo).delete(line);
        booking.setPaymentStatus(PaymentStatus.SETTLED);
        assertThrows(IllegalStateException.class, () -> addons.remove(10L, 2L));
        verify(lineRepo, times(1)).delete(line);
    }

    @Test void rejectsWrongStatusInactivePackageAndUnavailableService() {
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        assertThrows(IllegalStateException.class, () -> addons.add(10L, new BookingServiceRequest(2L, 1)));
        booking.setBookingStatus(BookingStatus.CHECKED_IN);
        RecurringBooking recurring = new RecurringBooking();
        recurring.setStatus(RecurBookingStatus.CANCELLED);
        booking.setRecurringBooking(recurring);
        assertThrows(IllegalStateException.class, () -> addons.add(10L, new BookingServiceRequest(2L, 1)));
        booking.setRecurringBooking(null);
        when(serviceRepo.findAvailableByIdForUpdate(2L)).thenReturn(Optional.of(service));
        service.setStatus(ServiceStatus.OUT_OF_STOCK);
        assertThrows(IllegalStateException.class, () -> addons.add(10L, new BookingServiceRequest(2L, 1)));
    }

    private BookingService line(int quantity, BigDecimal price) {
        BookingService line = new BookingService();
        line.setBooking(booking);
        line.setService(service);
        line.setServiceNameAtBooking(service.getName());
        line.setPriceAtBooking(price);
        line.setQuantity(quantity);
        line.setSubtotal(price.multiply(BigDecimal.valueOf(quantity)));
        return line;
    }
}
