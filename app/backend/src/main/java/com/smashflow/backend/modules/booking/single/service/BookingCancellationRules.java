package com.smashflow.backend.modules.booking.single.service;

import java.time.LocalDateTime;

import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;

public final class BookingCancellationRules {
    private BookingCancellationRules() {
    }

    public static String validateReason(String reason) {
        String trimmed = reason == null ? "" : reason.trim();
        if (trimmed.isEmpty() || trimmed.length() > 500) {
            throw new IllegalArgumentException("Vui lòng nhập lý do hủy từ 1 đến 500 ký tự");
        }
        return trimmed;
    }

    public static void validateCancellable(Booking booking, LocalDateTime now, boolean customerAction) {
        if (booking.getBookingStatus() != BookingStatus.PENDING
                && booking.getBookingStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Chỉ hủy được booking đang chờ hoặc đã xác nhận");
        }
        if (booking.getPaymentStatus() == PaymentStatus.SETTLED) {
            throw new IllegalStateException("Booking đã kết toán không thể hủy");
        }
        if (customerAction && LocalDateTime.of(booking.getBookingDate(), booking.getStartTime())
                .minusHours(2).isBefore(now)) {
            throw new IllegalStateException("Chỉ có thể hủy trước giờ chơi ít nhất 2 tiếng");
        }
    }

    public static void cancel(Booking booking, String reason, LocalDateTime now) {
        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setCancelReason(reason);
        booking.setCancelledAt(now);
        booking.setExpireAt(null);
    }
}
