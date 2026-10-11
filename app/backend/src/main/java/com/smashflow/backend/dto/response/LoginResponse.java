package com.smashflow.backend.dto.response;

import com.smashflow.backend.model.enums.Role;

public record LoginResponse(
        String token,
        Long id,
        String fullName,
        String email,
        String phoneNumber,
        Role role) {

}
