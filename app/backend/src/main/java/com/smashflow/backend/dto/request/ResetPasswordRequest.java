package com.smashflow.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Thiếu mã đặt lại mật khẩu") String token,

        @NotBlank(message = "Mật khẩu không được để trống.") @Size(min = 8, message = "Mật khẩu tối thiểu 8 kí tự.") String newPassword) {
}
