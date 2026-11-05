package com.smashflow.backend.dto.request;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Nhân viên tạo booking lẻ tại quầy cho khách.
 * Khách hàng lấy từ customerId trong body, nhân viên lấy từ token đăng nhập.
 */
public record StaffCreateBookingRequest(
        @NotNull(message = "Vui lòng chọn khách hàng")
        Long customerId,

        @NotNull(message = "Vui lòng chọn sân")
        Long courtId,

        @NotNull(message = "Vui lòng chọn ngày đặt sân")
        LocalDate bookingDate,

        @NotNull(message = "Vui lòng chọn giờ bắt đầu")
        LocalTime startTime,

        @NotNull(message = "Vui lòng chọn giờ kết thúc")
        LocalTime endTime,

        // DB chỉ cho phép 'CASH' hoặc 'BANK_TRANSFER' (chk_payment_method)
        @NotBlank(message = "Vui lòng chọn phương thức thanh toán")
        @Pattern(regexp = "CASH|BANK_TRANSFER", message = "Phương thức thanh toán chỉ nhận CASH hoặc BANK_TRANSFER")
        String paymentMethod) {
}
