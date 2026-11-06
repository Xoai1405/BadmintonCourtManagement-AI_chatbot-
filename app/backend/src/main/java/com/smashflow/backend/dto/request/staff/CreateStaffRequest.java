package com.smashflow.backend.dto.request.staff;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateStaffRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        String fullName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^\\+?[\\d\\s().-]{9,16}$", message = "Số điện thoại không hợp lệ")
        String phone,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        String email
) {
}