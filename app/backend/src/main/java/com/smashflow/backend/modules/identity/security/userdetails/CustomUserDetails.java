package com.smashflow.backend.modules.identity.security.userdetails;

import lombok.Getter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

import com.smashflow.backend.modules.identity.user.model.enums.Role;
import com.smashflow.backend.modules.identity.user.model.enums.UserStatus;

import java.time.LocalDateTime;
import java.util.List;

@Getter
public class CustomUserDetails extends User {

    private final Long userId;
    private final String fullName;
    private final String avatarUrl;
    private final String phoneNumber;
    private final String email;
    private final Role role;
    private final UserStatus status;
    private final LocalDateTime createdAt;
    private final LocalDateTime passwordChangedAt;

    public CustomUserDetails(
            Long userId,
            String fullName,
            String avatarUrl,
            String phoneNumber,
            String email,
            String password,
            Role role,
            UserStatus status,
            LocalDateTime createdAt,
            LocalDateTime passwordChangedAt) {

        super(email, password, List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));

        this.userId = userId;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.role = role;
        this.status = status;
        this.createdAt = createdAt;
        this.passwordChangedAt = passwordChangedAt;
    }
}