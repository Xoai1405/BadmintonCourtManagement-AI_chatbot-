package com.smashflow.backend.modules.booking.single.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CancelBookingRequest(
        @NotBlank(message = "Vui lòng nhập lý do hủy booking") String reason) {
}
