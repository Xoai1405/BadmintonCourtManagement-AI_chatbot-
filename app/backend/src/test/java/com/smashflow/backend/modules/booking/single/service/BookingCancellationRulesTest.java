package com.smashflow.backend.modules.booking.single.service;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.junit.jupiter.api.Test;

import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;

class BookingCancellationRulesTest {
    private final LocalDateTime now = LocalDateTime.of(2026, 11, 12, 10, 0);

    @Test
    void customerCanCancelAtExactlyTwoHoursButNotOneSecondLater() {
        Booking booking = booking(BookingStatus.CONFIRMED, LocalTime.NOON);
        assertDoesNotThrow(() -> BookingCancellationRules.validateCancellable(booking, now, true));
        assertThrows(IllegalStateException.class,
                () -> BookingCancellationRules.validateCancellable(booking, now.plusSeconds(1), true));
        assertDoesNotThrow(() -> BookingCancellationRules.validateCancellable(booking, now.plusSeconds(1), false));
    }

    @Test
    void onlyPendingAndConfirmedCanBeCancelled() {
        for (BookingStatus status : BookingStatus.values()) {
            Booking booking = booking(status, LocalTime.NOON);
            if (status == BookingStatus.PENDING || status == BookingStatus.CONFIRMED) {
                assertDoesNotThrow(() -> BookingCancellationRules.validateCancellable(booking, now, true));
            } else {
                assertThrows(IllegalStateException.class,
                        () -> BookingCancellationRules.validateCancellable(booking, now, true));
            }
        }
        Booking settled = booking(BookingStatus.CONFIRMED, LocalTime.NOON);
        settled.setPaymentStatus(PaymentStatus.SETTLED);
        assertThrows(IllegalStateException.class,
                () -> BookingCancellationRules.validateCancellable(settled, now, true));
    }

    @Test
    void reasonIsTrimmedAndLimitedToFiveHundredCharacters() {
        assertEquals("hủy", BookingCancellationRules.validateReason("  hủy  "));
        assertThrows(IllegalArgumentException.class, () -> BookingCancellationRules.validateReason("  "));
        assertThrows(IllegalArgumentException.class, () -> BookingCancellationRules.validateReason("x".repeat(501)));
        assertEquals(500, BookingCancellationRules.validateReason(" " + "x".repeat(500) + " ").length());
    }

    @Test
    void cancellationKeepsPaymentHistoryAndClearsHold() {
        Booking booking = booking(BookingStatus.CONFIRMED, LocalTime.NOON);
        booking.setPaymentStatus(PaymentStatus.PAID);
        booking.setPaymentMethod("BANK_TRANSFER");
        booking.setPaidAt(now.minusDays(1));
        booking.setExpireAt(now.plusMinutes(30));

        BookingCancellationRules.cancel(booking, "lý do", now);

        assertEquals(BookingStatus.CANCELLED, booking.getBookingStatus());
        assertEquals("lý do", booking.getCancelReason());
        assertEquals(now, booking.getCancelledAt());
        assertNull(booking.getExpireAt());
        assertEquals(PaymentStatus.PAID, booking.getPaymentStatus());
        assertEquals("BANK_TRANSFER", booking.getPaymentMethod());
        assertEquals(now.minusDays(1), booking.getPaidAt());
    }

    private Booking booking(BookingStatus status, LocalTime startTime) {
        Booking booking = new Booking();
        booking.setBookingStatus(status);
        booking.setBookingDate(LocalDate.of(2026, 11, 12));
        booking.setStartTime(startTime);
        return booking;
    }
}
