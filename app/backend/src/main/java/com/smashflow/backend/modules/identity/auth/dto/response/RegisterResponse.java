package com.smashflow.backend.modules.identity.auth.dto.response;

public record RegisterResponse(
        Long id,
        String fullName,
        String email,
        String phoneNumber) {

}
