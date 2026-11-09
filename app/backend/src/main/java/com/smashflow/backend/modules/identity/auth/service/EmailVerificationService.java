package com.smashflow.backend.modules.identity.auth.service;

import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.smashflow.backend.modules.identity.auth.model.EmailVerificationToken;
import com.smashflow.backend.modules.identity.auth.repository.EmailVerificationTokenRepository;
import com.smashflow.backend.modules.identity.auth.util.TokenUtil;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class EmailVerificationService {

    private static final long TOKEN_TTL_HOURS = 24;

    private final EmailVerificationTokenRepository tokenRepo;
    private final EmailService emailService;
    private final String frontendUrl;
    private final UserRepository userRepo;
    private static final String INVALID_TOKEN = "Link xác thực không hợp lệ hoặc đã hết hạn";
    private static final long RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_EMAILS_PER_DAY = 5;

    public EmailVerificationService(EmailVerificationTokenRepository tokenRepo,
            EmailService emailService,
            @Value("${app.frontend-url}") String frontendUrl, UserRepository userRepo) {
        this.tokenRepo = tokenRepo;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
        this.userRepo = userRepo;
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

    @Transactional
    public void verify(String rawToken) {
        // 1. Hash token người dùng gửi lên rồi tìm trong DB
        EmailVerificationToken token = tokenRepo.findByTokenHash(TokenUtil.sha256(rawToken))
                .orElseThrow(() -> new IllegalArgumentException(INVALID_TOKEN));

        // 2. Kiểm tra còn dùng được không
        if (token.isUsed() || token.isExpired()) {
            throw new IllegalArgumentException(INVALID_TOKEN);
        }

        // 3. Đánh dấu user đã xác thực và token đã dùng
        token.getUser().setEmailVerified(true);
        token.setUsedAt(LocalDateTime.now());
    }

    @Transactional
    public void resend(String emailOrPhoneNumber) {
        String id = emailOrPhoneNumber.trim();
        User user = userRepo.findByEmailOrPhoneNumber(id, id).orElse(null);

        // Không có tài khoản hoặc đã xác thực: im lặng bỏ qua
        if (user == null || user.isEmailVerified()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        // Luật 1: mỗi 60 giây chỉ được gửi 1 thư
        boolean inCooldown = tokenRepo.findTopByUserOrderByCreatedAtDesc(user)
                .map(last -> last.getCreatedAt().isAfter(now.minusSeconds(RESEND_COOLDOWN_SECONDS)))
                .orElse(false);
        if (inCooldown) {
            return;
        }

        // Luật 2: tối đa 5 thư trong 24 giờ
        if (tokenRepo.countByUserAndCreatedAtAfter(user, now.minusDays(1)) >= MAX_EMAILS_PER_DAY) {
            return;
        }

        // Luật 3: link cũ hết hiệu lực, chỉ link mới nhất dùng được
        tokenRepo.findByUserAndUsedAtIsNull(user)
                .forEach(old -> old.setExpiresAt(now));

        sendVerificationEmail(user);
    }

}