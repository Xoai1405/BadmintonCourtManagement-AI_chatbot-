package com.smashflow.backend.dto.response;

public record RegisterResponse(
    Long id,
    String fullName,
    String email, 
    String phoneNumber
) {
    
}
