package com.smashflow.backend.dto.response.recurringBooking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.CourtType;
import com.smashflow.backend.model.enums.PaymentStatus;

/**
 * Gói đặt lịch cố định (dùng chung cho khách hàng và nhân viên).
 *
 * paymentStatus của gói:
 *   UNPAID = chưa thanh toán tiền sân gói (đang giữ chỗ, chờ nhân viên xác nhận)
 *   PAID   = nhân viên đã xác nhận đã nhận tiền sân trọn gói (BR-11)
 * Kết toán tính theo từng buổi: settledSessionCount / sessionCount.
 */
public record RecurringBookingDetailResponse(
        Long recurringBookingId,
        String code,
        CustomerInfo customer,
        Long courtId,
        String courtName,
        CourtType courtType,
        String courtImageUrl,
        String courtDescription,
        LocalDate startDate,
        LocalDate endDate,
        List<String> daysOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        BigDecimal discountPercent,
        BigDecimal totalAmount,
        String status,
        String paymentStatus,
        String paymentMethod,
        LocalDateTime paidAt,
        String paidByStaffName,
        LocalDateTime expireAt,
        int sessionCount,
        int completedSessionCount,
        int settledSessionCount,
        String cancelReason,
        LocalDateTime cancelledAt,
        LocalDateTime createdAt,
        List<SessionInfo> sessions) {

    public record CustomerInfo(
            Long userId,
            String fullName,
            String phoneNumber,
            String email) {
    }

    public record SessionInfo(
            Long bookingId,
            String bookingCode,
            LocalDate bookingDate,
            LocalTime startTime,
            LocalTime endTime,
            BookingStatus bookingStatus,
            PaymentStatus paymentStatus,
            BigDecimal courtPrice,
            BigDecimal servicePrice,
            BigDecimal totalAmount) {
    }
}
