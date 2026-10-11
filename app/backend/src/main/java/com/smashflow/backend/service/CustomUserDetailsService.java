package com.smashflow.backend.service;

import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.smashflow.backend.model.User;
import com.smashflow.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepo;

    @Override
    public CustomUserDetails loadUserByUsername(String emailOrPhoneNumber) {
        User u = userRepo.findByEmailOrPhoneNumber(emailOrPhoneNumber, emailOrPhoneNumber)
                .orElseThrow(() -> new UsernameNotFoundException("User không tồn tại"));
        return new CustomUserDetails(u.getId(), u.getFullName(), u.getAvatarUrl(), u.getPhoneNumber(), u.getEmail(),
                u.getPassword(), u.getRole(), u.getStatus(), u.getCreatedAt());
    }
}