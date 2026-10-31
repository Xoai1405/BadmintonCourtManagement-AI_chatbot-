package com.smashflow.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.CourtType;
import com.smashflow.backend.model.enums.PaymentStatus;

/**
 * Booking lẻ hiển thị cho nhân viên (tra cứu + chi tiết).
 * Có thêm thông tin khách hàng và nhân viên xác nhận.
 */
public record StaffBookingResponse(
        Long bookingId,
        String bookingCode,
        CustomerInfo customer,
        Long courtId,
        String courtName,
        CourtType courtType,
        LocalDate bookingDate,
        LocalTime startTime,
        LocalTime endTime,
        BigDecimal courtPrice,
        BigDecimal servicePrice,
        BigDecimal totalAmount,
        BookingStatus bookingStatus,
        PaymentStatus paymentStatus,
        String paymentMethod,
        LocalDateTime paidAt,
        String paidBy,
        String createdByStaffName,
        String cancelReason,
        LocalDateTime cancelledAt,
        LocalDateTime expireAt,
        LocalDateTime createdAt) {

    public record CustomerInfo(
            Long userId,
            String fullName,
            String phoneNumber,
            String email) {
    }
}
