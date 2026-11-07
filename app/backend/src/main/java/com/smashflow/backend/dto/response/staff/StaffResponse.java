package com.smashflow.backend.dto.response.staff;

import com.smashflow.backend.model.User;

public record StaffResponse(
        Long id,
        String fullName,
        String phone,
        String email,
        String status
) {
    public static StaffResponse fromUser(User user) {
        return new StaffResponse(
                user.getId(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getEmail(),
                user.getStatus() != null ? user.getStatus().name() : "ACTIVE"
        );
    }
}