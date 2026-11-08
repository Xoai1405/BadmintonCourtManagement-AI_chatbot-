package com.smashflow.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
        @NotBlank(message = "Thiếu mã xác thực") String token) {
}