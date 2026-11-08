package com.smashflow.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ResendVerificationRequest(
        @NotBlank(message = "Vui lòng nhập email hoặc số điện thoại") String emailOrPhoneNumber) {
}
