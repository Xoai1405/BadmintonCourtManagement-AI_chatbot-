package com.smashflow.backend.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.booking.single.dto.request.RescheduleBookingRequest;
import com.smashflow.backend.modules.booking.single.exception.BookingConflictException;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.booking.single.service.BookingService;
import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.model.Court;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.court.repository.CourtRepository;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;
import com.smashflow.backend.modules.pricing.service.PricingService;

class BookingRescheduleTest {
    private static final LocalDate DAY = LocalDate.of(2026, 11, 16);
    private final BookingRepository bookings = mock(BookingRepository.class);
    private final BusinessHourConfigRepository hours = mock(BusinessHourConfigRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-16T08:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    private BookingService service;
    private Booking booking;

    @BeforeEach
    void setUp() {
        service = new BookingService(mock(UserRepository.class), mock(CourtRepository.class), bookings,
                hours, mock(PricingService.class), mock(RecurringBookingRepository.class), clock);
        User customer = new User();
        customer.setId(10L);
        Court court = new Court();
        court.setId(20L);
        booking = new Booking();
        booking.setId(30L);
        booking.setCustomer(customer);
        booking.setCourt(court);
        booking.setBookingDate(DAY);
        booking.setStartTime(LocalTime.of(18, 0));
        booking.setEndTime(LocalTime.of(19, 0));
        booking.setBookingStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setCourtPrice(new BigDecimal("120000"));
        booking.setServicePrice(new BigDecimal("10000"));
        booking.setTotalAmount(new BigDecimal("130000"));
        when(bookings.findByIdForUpdate(30L)).thenReturn(Optional.of(booking));
        when(bookings.saveAndFlush(booking)).thenReturn(booking);
        BusinessHourConfig config = new BusinessHourConfig();
        config.setOpeningTime(LocalTime.of(6, 0));
        config.setClosingTime(LocalTime.of(22, 0));
        when(hours.findById((short) 1)).thenReturn(Optional.of(config));
    }

    private RescheduleBookingRequest move(LocalDate date, int startHour, int startMinute, int endHour, int endMinute) {
        return new RescheduleBookingRequest(date, LocalTime.of(startHour, startMinute), LocalTime.of(endHour, endMinute));
    }

    @Test
    void customerCanMoveOwnPaidBookingWithoutChangingMoney() {
        var response = service.rescheduleBookingByCustomer(30L, move(DAY, 19, 0, 20, 0), 10L);
        assertEquals(LocalTime.of(19, 0), response.getStartTime());
        assertEquals(PaymentStatus.PAID, response.getPaymentStatus());
        assertEquals(new BigDecimal("120000"), response.getCourtPrice());
        assertEquals(new BigDecimal("130000"), response.getTotalAmount());
        assertEquals(20L, response.getCourtId());
    }

    @Test
    void anotherCustomerGetsNotFoundAndNothingIsSaved() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.rescheduleBookingByCustomer(30L, move(DAY, 19, 0, 20, 0), 11L));
        verify(bookings, never()).saveAndFlush(any());
    }

    @Test
    void missingBookingGetsNotFound() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.rescheduleBookingByStaff(999L, move(DAY, 19, 0, 20, 0)));
    }

    @Test
    void onlyPendingAndConfirmedCanMove() {
        for (BookingStatus status : List.of(BookingStatus.CHECKED_IN, BookingStatus.COMPLETED,
                BookingStatus.CANCELLED, BookingStatus.NO_SHOW)) {
            booking.setBookingStatus(status);
            assertThrows(IllegalStateException.class,
                    () -> service.rescheduleBookingByStaff(30L, move(DAY, 19, 0, 20, 0)));
        }
        booking.setBookingStatus(BookingStatus.PENDING);
        assertEquals(LocalTime.of(19, 0),
                service.rescheduleBookingByStaff(30L, move(DAY, 19, 0, 20, 0)).startTime());
    }

    @Test
    void exactlySixtyMinutesIsAllowedForBothOldAndNewStart() {
        booking.setStartTime(LocalTime.of(16, 0)); // fixed clock is 15:00 in Vietnam
        booking.setEndTime(LocalTime.of(17, 0));
        assertEquals(LocalTime.of(16, 0),
                service.rescheduleBookingByStaff(30L, move(DAY, 16, 0, 17, 0)).startTime());
    }

    @Test
    void oldAndNewStartsInsideSixtyMinutesAreRejected() {
        booking.setStartTime(LocalTime.of(15, 30));
        booking.setEndTime(LocalTime.of(16, 30));
        assertThrows(IllegalStateException.class,
                () -> service.rescheduleBookingByStaff(30L, move(DAY, 17, 0, 18, 0)));
        booking.setStartTime(LocalTime.of(18, 0));
        booking.setEndTime(LocalTime.of(19, 0));
        assertThrows(IllegalStateException.class,
                () -> service.rescheduleBookingByStaff(30L, move(DAY, 15, 30, 16, 30)));
    }

    @Test
    void recurringSessionMustHaveActivePackageAndStayInDateRange() {
        RecurringBooking recurring = new RecurringBooking();
        recurring.setId(40L);
        recurring.setStartDate(DAY);
        recurring.setEndDate(DAY.plusDays(7));
        recurring.setStatus(RecurBookingStatus.CANCELLED);
        recurring.setTotalAmount(new BigDecimal("700000"));
        booking.setRecurringBooking(recurring);
        assertThrows(IllegalStateException.class,
                () -> service.rescheduleBookingByStaff(30L, move(DAY.plusDays(1), 18, 0, 19, 0)));
        recurring.setStatus(RecurBookingStatus.ACTIVE);
        Booking otherSession = new Booking();
        otherSession.setBookingDate(DAY.plusDays(1));
        otherSession.setStartTime(LocalTime.of(18, 0));
        otherSession.setEndTime(LocalTime.of(19, 0));
        recurring.setBookings(List.of(booking, otherSession));
        assertThrows(IllegalArgumentException.class,
                () -> service.rescheduleBookingByStaff(30L, move(DAY.plusDays(8), 18, 0, 19, 0)));
        var response = service.rescheduleBookingByCustomer(30L,
                move(DAY.plusDays(7), 18, 0, 19, 0), 10L);
        assertEquals(40L, response.getRecurringBookingId());
        assertEquals(new BigDecimal("700000"), recurring.getTotalAmount());
        assertEquals(new BigDecimal("120000"), booking.getCourtPrice());
        assertEquals(DAY.plusDays(1), otherSession.getBookingDate());
        assertEquals(LocalTime.of(18, 0), otherSession.getStartTime());
    }

    @Test
    void durationHoursAndHalfHourSlotsAreChecked() {
        assertThrows(IllegalArgumentException.class,
                () -> service.rescheduleBookingByStaff(30L, move(DAY, 19, 0, 21, 0)));
        assertThrows(IllegalArgumentException.class,
                () -> service.rescheduleBookingByStaff(30L, move(DAY, 21, 30, 22, 30)));
        assertThrows(IllegalArgumentException.class,
                () -> service.rescheduleBookingByStaff(30L, move(DAY, 19, 15, 20, 15)));
    }

    @Test
    void overlapExcludesSelfAndThirtyMinuteShiftCanSucceed() {
        var request = move(DAY, 18, 30, 19, 30);
        service.rescheduleBookingByStaff(30L, request);
        verify(bookings).existsOverlapExcluding(eq(20L), eq(DAY), eq(request.startTime()),
                eq(request.endTime()), eq(30L), eq(List.of(BookingStatus.PENDING,
                        BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN)));
    }

    @Test
    void anotherBookingBlockingTheSlotReturnsConflict() {
        when(bookings.existsOverlapExcluding(anyLong(), any(), any(), any(), anyLong(), any()))
                .thenReturn(true);
        assertThrows(BookingConflictException.class,
                () -> service.rescheduleBookingByStaff(30L, move(DAY, 19, 0, 20, 0)));
        verify(bookings, never()).saveAndFlush(any());
    }
}
