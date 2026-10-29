
package com.smashflow.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.smashflow.backend.model.enums.CourtType;
import com.smashflow.backend.model.enums.PaymentStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingDetailResponse {

    // ===== Thông tin booking =====
    private Long id;
    private String bookingCode;

    // ===== Thông tin sân =====
    private Long courtId;
    private String courtName;
    private CourtType courtType;
    private String courtImageUrl;
    private String courtDescription;

    // ===== Thời gian chơi =====
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;

    // ===== Chi phí =====
    private BigDecimal courtPrice;
    private BigDecimal servicePrice;
    private BigDecimal totalAmount;

    // ===== Trạng thái booking =====
    private String bookingStatus;

    // ===== Trạng thái thanh toán =====
    private PaymentStatus paymentStatus;
    private String paymentMethod;

    // ===== Thông tin giữ chỗ và thanh toán =====
    private LocalDateTime createdAt;
    private LocalDateTime expireAt;
    private LocalDateTime paidAt;

    private String paidByStaffName;

    // ===== Thông tin hủy booking =====
    private String cancelReason;
    private LocalDateTime cancelledAt;

}
