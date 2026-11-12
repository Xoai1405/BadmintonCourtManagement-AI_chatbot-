package com.smashflow.backend.modules.booking.recurring.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.court.model.Court;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class RecurringSessionCancellationTest {
    @Mock RecurringBookingRepository recurringRepo;
    @Mock BookingRepository bookingRepo;
    @Mock UserRepository userRepo;
    @InjectMocks RecurringBookingManagementService service;

    private RecurringBooking recurring;
    private Booking first;
    private Booking second;

    @BeforeEach
    void setUp() {
        User customer = new User();
        customer.setId(3L);
        Court court = new Court();
        court.setId(4L);
        recurring = new RecurringBooking();
        recurring.setId(7L);
        recurring.setCustomer(customer);
        recurring.setCourt(court);
        recurring.setStatus(RecurBookingStatus.ACTIVE);
        recurring.setStartDate(LocalDate.now().plusDays(2));
        recurring.setEndDate(LocalDate.now().plusDays(3));
        recurring.setDaysOfWeek(List.of());
        recurring.setStartTime(LocalTime.NOON);
        recurring.setEndTime(LocalTime.of(13, 0));
        recurring.setDiscountRate(BigDecimal.TEN);
        recurring.setTotalAmount(BigDecimal.valueOf(200_000));
        first = session(10L, BookingStatus.CONFIRMED, PaymentStatus.PAID);
        second = session(11L, BookingStatus.CONFIRMED, PaymentStatus.PAID);
        recurring.setBookings(new ArrayList<>(List.of(first, second)));
        when(recurringRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(recurring));
    }

    @Test
    void customerCancelsOnlyOwnSessionAndKeepsPackagePrice() {
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(first));
        when(bookingRepo.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.cancelSessionForCustomer(7L, 10L, 3L, "  vắng mặt  ");

        assertEquals(RecurBookingStatus.ACTIVE, recurring.getStatus());
        assertEquals(BigDecimal.valueOf(200_000), recurring.getTotalAmount());
        assertEquals(BookingStatus.CANCELLED, first.getBookingStatus());
        assertEquals(PaymentStatus.PAID, first.getPaymentStatus());
        assertEquals(BookingStatus.CONFIRMED, second.getBookingStatus());
        assertEquals("vắng mặt", response.sessions().get(0).cancelReason());
        assertNotNull(response.sessions().get(0).cancelledAt());
        verify(recurringRepo, never()).save(any());
    }

    @Test
    void lastSessionCancellationCompletesPackage() {
        second.setBookingStatus(BookingStatus.COMPLETED);
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(first));
        when(bookingRepo.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.cancelSessionForStaff(7L, 10L, "lý do");

        assertEquals("COMPLETED", response.status());
        verify(recurringRepo).save(recurring);
    }

    @Test
    void customerCannotCancelAnotherCustomersPackage() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.cancelSessionForCustomer(7L, 10L, 9L, "lý do"));
        verify(bookingRepo, never()).findByIdForUpdate(any());
    }

    @Test
    void sessionMustBelongToNamedPackage() {
        first.setRecurringBooking(null);
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(first));
        assertThrows(ResourceNotFoundException.class,
                () -> service.cancelSessionForCustomer(7L, 10L, 3L, "lý do"));
        verify(bookingRepo, never()).save(any());
    }

    @Test
    void sessionFromAnotherPackageIsRejected() {
        RecurringBooking other = new RecurringBooking();
        other.setId(8L);
        first.setRecurringBooking(other);
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(first));
        assertThrows(ResourceNotFoundException.class,
                () -> service.cancelSessionForCustomer(7L, 10L, 3L, "lý do"));
        verify(bookingRepo, never()).save(any());
    }

    @Test
    void inactivePackageAndFinishedSessionAreRejected() {
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(first));
        recurring.setStatus(RecurBookingStatus.COMPLETED);
        assertThrows(IllegalStateException.class,
                () -> service.cancelSessionForStaff(7L, 10L, "lý do"));
        recurring.setStatus(RecurBookingStatus.ACTIVE);
        first.setBookingStatus(BookingStatus.CHECKED_IN);
        assertThrows(IllegalStateException.class,
                () -> service.cancelSessionForStaff(7L, 10L, "lý do"));
        verify(bookingRepo, never()).save(any());
    }

    @Test
    void paymentSubmissionSkipsCancelledSession() {
        first.setBookingStatus(BookingStatus.CANCELLED);
        first.setPaymentStatus(PaymentStatus.UNPAID);
        second.setBookingStatus(BookingStatus.PENDING);
        second.setPaymentStatus(PaymentStatus.UNPAID);
        second.setExpireAt(LocalDateTime.now().plusHours(1));

        service.markPaymentSubmitted(7L, 3L);

        assertEquals(PaymentStatus.UNPAID, first.getPaymentStatus());
        assertEquals(PaymentStatus.PAID, second.getPaymentStatus());
        verify(bookingRepo).saveAll(List.of(second));
    }

    @Test
    void staffConfirmationSkipsCancelledSession() {
        first.setBookingStatus(BookingStatus.CANCELLED);
        first.setPaymentStatus(PaymentStatus.UNPAID);
        second.setBookingStatus(BookingStatus.PENDING);
        User staff = new User();
        staff.setId(8L);
        when(userRepo.findById(8L)).thenReturn(Optional.of(staff));

        service.confirmRecurringBooking(7L, 8L);

        assertEquals(BookingStatus.CANCELLED, first.getBookingStatus());
        assertEquals(PaymentStatus.UNPAID, first.getPaymentStatus());
        assertEquals(BookingStatus.CONFIRMED, second.getBookingStatus());
        verify(bookingRepo).saveAll(List.of(second));
    }

    private Booking session(Long id, BookingStatus status, PaymentStatus payment) {
        Booking booking = new Booking();
        booking.setId(id);
        booking.setBookingCode("BK" + id);
        booking.setCustomer(recurring.getCustomer());
        booking.setCourt(recurring.getCourt());
        booking.setRecurringBooking(recurring);
        booking.setBookingDate(LocalDate.now().plusDays(2));
        booking.setStartTime(LocalTime.NOON);
        booking.setEndTime(LocalTime.of(13, 0));
        booking.setBookingStatus(status);
        booking.setPaymentStatus(payment);
        booking.setCourtPrice(BigDecimal.valueOf(100_000));
        booking.setServicePrice(BigDecimal.ZERO);
        booking.setTotalAmount(BigDecimal.valueOf(100_000));
        return booking;
    }
}
