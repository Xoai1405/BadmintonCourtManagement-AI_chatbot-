package com.smashflow.backend.modules.identity.staff.dto.response;

import com.smashflow.backend.modules.identity.user.model.User;

public record StaffResponse(
        Long id,
        String fullName,
        String phone,
        String email,
        String status) {
    public static StaffResponse fromUser(User user) {
        return new StaffResponse(
                user.getId(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getEmail(),
                user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
    }
}