package com.smashflow.backend.modules.booking.single.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.court.model.Court;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.court.repository.CourtRepository;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;
import com.smashflow.backend.modules.pricing.service.PricingService;

@ExtendWith(MockitoExtension.class)
class BookingServiceCancellationTest {
    @Mock UserRepository userRepo;
    @Mock CourtRepository courtRepo;
    @Mock BookingRepository bookingRepo;
    @Mock BusinessHourConfigRepository businessHourConfigRepo;
    @Mock PricingService pricingService;
    @Mock RecurringBookingRepository recurringBookingRepo;
    @InjectMocks BookingService service;

    private Booking booking;

    @BeforeEach
    void setUp() {
        booking = new Booking();
        booking.setId(10L);
        booking.setBookingCode("BK10");
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setBookingDate(LocalDate.now().plusDays(2));
        booking.setStartTime(LocalTime.NOON);
        User customer = new User();
        customer.setId(3L);
        booking.setCustomer(customer);
        Court court = new Court();
        court.setId(4L);
        booking.setCourt(court);
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));
    }

    @Test
    void customerCancelsOwnPaidSingleBooking() {
        when(bookingRepo.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.cancelSingleBookingForCustomer(10L, 3L, "  đổi kế hoạch  ");
        assertEquals("CANCELLED", result.getBookingStatus());
        assertEquals("đổi kế hoạch", result.getCancelReason());
        assertEquals(PaymentStatus.PAID, result.getPaymentStatus());
        verify(bookingRepo).save(booking);
    }

    @Test
    void customerCannotCancelAnotherCustomersBooking() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.cancelSingleBookingForCustomer(10L, 9L, "lý do"));
        verify(bookingRepo, never()).save(any());
    }

    @Test
    void singleEndpointRejectsRecurringSession() {
        booking.setRecurringBooking(new RecurringBooking());
        assertThrows(ResourceNotFoundException.class,
                () -> service.cancelSingleBookingForCustomer(10L, 3L, "lý do"));
        assertThrows(IllegalStateException.class,
                () -> service.cancelSingleBookingForStaff(10L, "lý do"));
        verify(bookingRepo, never()).save(any());
    }

    @Test
    void staffCanCancelPaidSingleBooking() {
        when(bookingRepo.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.cancelSingleBookingForStaff(10L, " khách yêu cầu ");
        assertEquals(BookingStatus.CANCELLED, result.bookingStatus());
        assertEquals(PaymentStatus.PAID, result.paymentStatus());
        assertEquals("khách yêu cầu", result.cancelReason());
    }
}
