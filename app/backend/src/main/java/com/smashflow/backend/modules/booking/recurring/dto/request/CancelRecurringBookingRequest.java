package com.smashflow.backend.modules.booking.recurring.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Nhân viên hủy gói lịch cố định kèm lý do (FR-37).
 */
public record CancelRecurringBookingRequest(
                @NotBlank(message = "Vui lòng nhập lý do hủy gói") @Size(max = 500, message = "Lý do hủy tối đa 500 ký tự") String reason) {
}
