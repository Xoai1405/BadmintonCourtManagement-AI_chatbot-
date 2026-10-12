package com.smashflow.backend.service;

import com.smashflow.backend.model.enums.Role;
import com.smashflow.backend.model.enums.UserStatus;

import lombok.Getter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;

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

    public CustomUserDetails(
            Long userId,
            String fullName,
            String avatarUrl,
            String phoneNumber,
            String email,
            String password,
            Role role,
            UserStatus status,
            LocalDateTime createdAt) {

        super(email, password, List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));

        this.userId = userId;
        this.fullName = fullName;
        this.avatarUrl = avatarUrl;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.role = role;
        this.status = status;
        this.createdAt = createdAt;
    }
}