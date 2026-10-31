package com.smashflow.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Nhân viên xác nhận thu đủ tiền (kết toán) khi khách trả sân.
 * paymentMethod: CASH hoặc BANK_TRANSFER.
 */
public record SettleBookingRequest(
        @NotBlank(message = "Vui lòng chọn phương thức thanh toán") String paymentMethod) {
}
