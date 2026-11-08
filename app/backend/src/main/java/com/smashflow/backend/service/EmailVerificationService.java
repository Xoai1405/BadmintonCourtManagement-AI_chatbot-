package com.smashflow.backend.service;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.smashflow.backend.model.EmailVerificationToken;
import com.smashflow.backend.model.User;
import com.smashflow.backend.repository.EmailVerificationTokenRepository;
import com.smashflow.backend.util.TokenUtil;

@Service
public class EmailVerificationService {

    private static final long TOKEN_TTL_HOURS = 24;

    private final EmailVerificationTokenRepository tokenRepo;
    private final EmailService emailService;
    private final String frontendUrl;

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepo,
            EmailService emailService,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.tokenRepo = tokenRepo;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
    }

    public void sendVerificationEmail(User user) {
        String rawToken = TokenUtil.generateToken();

        EmailVerificationToken token = new EmailVerificationToken();
        token.setUser(user);
        token.setTokenHash(TokenUtil.sha256(rawToken)); // DB chỉ giữ hash
        token.setExpiresAt(LocalDateTime.now().plusHours(TOKEN_TTL_HOURS));
        tokenRepo.save(token);

        String link = frontendUrl + "/verify-email?token=" + rawToken; // mail giữ token gốc
        emailService.send(
                user.getEmail(),
                "Xác thực email SmashFlow",
                "Chào " + user.getFullName() + ",\n\n"
                        + "Bấm vào link sau để xác thực email (hết hạn sau 24 giờ):\n"
                        + link);
    }
}