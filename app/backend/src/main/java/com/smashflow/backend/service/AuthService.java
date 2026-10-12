package com.smashflow.backend.service;

import java.time.LocalDateTime;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.smashflow.backend.dto.request.LoginRequest;
import com.smashflow.backend.dto.request.RegisterRequest;
import com.smashflow.backend.dto.response.LoginResponse;
import com.smashflow.backend.dto.response.RegisterResponse;
import com.smashflow.backend.model.User;
import com.smashflow.backend.model.enums.Role;
import com.smashflow.backend.model.enums.UserStatus;
import com.smashflow.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtSer;

    public RegisterResponse register(RegisterRequest request) {
        if (userRepo.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }

        if (userRepo.existsByPhoneNumber(request.phoneNumber())) {
            throw new IllegalArgumentException("Số điện thoại đã được sử dụng");
        }

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setPhoneNumber(request.phoneNumber());
        user.setRole(Role.CUSTOMER);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(LocalDateTime.now());

        user = userRepo.save(user);

        return new RegisterResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhoneNumber());

    }

    public LoginResponse login(LoginRequest request) {
        String id = request.emailOrPhoneNumber();

        User user = userRepo.findByEmailOrPhoneNumber(id, id)
                .filter(u -> passwordEncoder.matches(request.password(), u.getPassword()))
                .orElseThrow(() -> new BadCredentialsException("Sai tài khoản hoặc mật khẩu"));

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new LockedException("Tài khoản đã bị khóa");
        }

        String token = jwtSer.generateToken(request.emailOrPhoneNumber());

        return new LoginResponse(token, user.getId(), user.getFullName(), user.getEmail(), user.getPhoneNumber(),
                user.getRole());
    }
}
