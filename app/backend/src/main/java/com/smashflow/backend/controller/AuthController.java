package com.smashflow.backend.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.request.ForgotPasswordRequest;
import com.smashflow.backend.dto.request.LoginRequest;
import com.smashflow.backend.dto.request.RegisterRequest;
import com.smashflow.backend.dto.request.ResendVerificationRequest;
import com.smashflow.backend.dto.request.ResetPasswordRequest;
import com.smashflow.backend.dto.request.VerifyEmailRequest;
import com.smashflow.backend.dto.response.LoginResponse;
import com.smashflow.backend.dto.response.RegisterResponse;
import com.smashflow.backend.service.AuthService;
import com.smashflow.backend.service.EmailService;
import com.smashflow.backend.service.EmailVerificationService;
import com.smashflow.backend.service.PasswordResetService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authSer;
    private final EmailService emailService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        RegisterResponse res = authSer.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authSer.login(request);
        return ResponseEntity.ok(response);
    }

    private final EmailVerificationService emailVerificationService;

    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        emailVerificationService.verify(request.token());
        return ResponseEntity.ok(Map.of("message", "Xác thực email thành công"));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request) {
        emailVerificationService.resend(request.emailOrPhoneNumber());
        return ResponseEntity.ok(Map.of("message",
                "Nếu tài khoản tồn tại và chưa xác thực, chúng tôi đã gửi lại link. Vui lòng kiểm tra hộp thư."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(Map.of("message",
                "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. "
                        + "Link có hiệu lực trong 30 phút."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(Map.of("message",
                "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới."));
    }
}
