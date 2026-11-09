package com.smashflow.backend.modules.identity.auth.dto.response;

import com.smashflow.backend.modules.identity.user.model.enums.Role;

public record LoginResponse(
                String token,
                Long id,
                String fullName,
                String email,
                String phoneNumber,
                Role role) {

}
