package com.smashflow.backend.modules.booking.single.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;

@ExtendWith(MockitoExtension.class)
class BookingExpiryJobTest {
    @Mock BookingRepository bookingRepo;
    @Mock RecurringBookingRepository recurringRepo;
    @InjectMocks BookingExpiryJob job;

    @Test
    void staleSingleExpiryResultDoesNotOverwriteManualCancellation() {
        Booking booking = new Booking();
        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setCancelReason("Khách yêu cầu");
        booking.setExpireAt(null);
        when(bookingRepo.findExpiredBookingRefs(eq(BookingStatus.PENDING), any()))
                .thenReturn(List.<Object[]>of(new Object[] {10L, null}));
        when(bookingRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(booking));

        job.cancelExpiredPendingBookings();

        assertEquals("Khách yêu cầu", booking.getCancelReason());
        verify(recurringRepo, never()).findByIdForUpdate(any());
    }

    @Test
    void stalePackageExpiryResultDoesNotOverwriteCancelledSession() {
        Booking cancelled = new Booking();
        cancelled.setBookingStatus(BookingStatus.CANCELLED);
        cancelled.setCancelReason("Khách yêu cầu");
        Booking pending = new Booking();
        pending.setBookingStatus(BookingStatus.PENDING);
        pending.setExpireAt(LocalDateTime.now().plusHours(1));
        RecurringBooking recurring = new RecurringBooking();
        recurring.setStatus(RecurBookingStatus.ACTIVE);
        recurring.setBookings(List.of(cancelled, pending));
        when(bookingRepo.findExpiredBookingRefs(eq(BookingStatus.PENDING), any()))
                .thenReturn(List.<Object[]>of(new Object[] {10L, 7L}));
        when(recurringRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(recurring));

        job.cancelExpiredPendingBookings();

        assertEquals("Khách yêu cầu", cancelled.getCancelReason());
        assertEquals(BookingStatus.PENDING, pending.getBookingStatus());
        assertEquals(RecurBookingStatus.ACTIVE, recurring.getStatus());
    }

    @Test
    void expiredPackageCancelsPendingButKeepsEarlierManualReason() {
        Booking cancelled = new Booking();
        cancelled.setBookingStatus(BookingStatus.CANCELLED);
        cancelled.setCancelReason("Khách yêu cầu");
        Booking pending = new Booking();
        pending.setBookingStatus(BookingStatus.PENDING);
        pending.setExpireAt(LocalDateTime.now().minusHours(1));
        RecurringBooking recurring = new RecurringBooking();
        recurring.setStatus(RecurBookingStatus.ACTIVE);
        recurring.setBookings(List.of(cancelled, pending));
        when(bookingRepo.findExpiredBookingRefs(eq(BookingStatus.PENDING), any()))
                .thenReturn(List.<Object[]>of(new Object[] {11L, 7L}));
        when(recurringRepo.findByIdForUpdate(7L)).thenReturn(Optional.of(recurring));

        job.cancelExpiredPendingBookings();

        assertEquals("Khách yêu cầu", cancelled.getCancelReason());
        assertEquals(BookingStatus.CANCELLED, pending.getBookingStatus());
        assertNull(pending.getExpireAt());
        assertEquals(RecurBookingStatus.CANCELLED, recurring.getStatus());
    }
}
