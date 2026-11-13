package com.smashflow.backend.modules.booking.single.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Lý do bắt buộc khi nhân viên chủ động hủy booking hoặc một buổi của gói. */
public record CancelBookingRequest(
        @NotBlank(message = "Vui lòng nhập lý do hủy booking")
        @Size(max = 500, message = "Lý do hủy không được vượt quá 500 ký tự")
        String reason) {
}
