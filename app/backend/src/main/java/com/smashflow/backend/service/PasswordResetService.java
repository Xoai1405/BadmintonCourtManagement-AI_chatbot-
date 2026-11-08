package com.smashflow.backend.service;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import com.smashflow.backend.model.PasswordResetToken;
import com.smashflow.backend.model.User;
import com.smashflow.backend.model.enums.UserStatus;
import com.smashflow.backend.repository.PasswordResetTokenRepository;
import com.smashflow.backend.repository.UserRepository;
import com.smashflow.backend.util.TokenUtil;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    private static final long TOKEN_TTL_MINUTES = 30;
    private static final long REQUEST_COOLDOWN_SECONDS = 60;
    private static final int MAX_EMAILS_PER_DAY = 5;

    private final UserRepository userRepo;
    private final PasswordResetTokenRepository tokenRepo;
    private final EmailService emailService;
    private final String frontendUrl;

    public PasswordResetService(UserRepository userRepo,
            PasswordResetTokenRepository tokenRepo,
            EmailService emailService,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.userRepo = userRepo;
        this.tokenRepo = tokenRepo;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
    }

    @Transactional
    public void requestReset(String rawEmail) {

        User user = userRepo.findByEmail(rawEmail.trim()).orElse(null);
        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        // Chưa đủ 60 giây
        boolean inCooldown = tokenRepo.findTopByUserOrderByCreatedAtDesc(user)
                .map(last -> last.getCreatedAt().isAfter(now.minusSeconds(REQUEST_COOLDOWN_SECONDS)))
                .orElse(false);
        if (inCooldown) {
            return;
        }

        // Quá 5 thư trong 24 giờ
        if (tokenRepo.countByUserAndCreatedAtAfter(user, now.minusDays(1)) >= MAX_EMAILS_PER_DAY) {
            return;
        }

        // Link cũ hết hiệu lực
        tokenRepo.findByUserAndUsedAtIsNull(user)
                .forEach(old -> old.setExpiresAt(now));

        // Sinh token mới: DB giữ hash, email giữ token gốc
        String rawToken = TokenUtil.generateToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(TokenUtil.sha256(rawToken));
        token.setExpiresAt(now.plusMinutes(TOKEN_TTL_MINUTES));
        tokenRepo.save(token);

        String link = frontendUrl + "/reset-password?token=" + rawToken;

        // Gửi lỗi: hủy mọi thay đổi DB nhưng không báo lỗi ra ngoài
        try {
            emailService.send(
                    user.getEmail(),
                    "Đặt lại mật khẩu SmashFlow",
                    "Chào " + user.getFullName() + ",\n\n"
                            + "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n"
                            + "Bấm vào link sau để đặt mật khẩu mới (hết hạn sau 30 phút):\n"
                            + link + "\n\n"
                            + "Nếu bạn không yêu cầu, hãy bỏ qua email này. Mật khẩu hiện tại vẫn giữ nguyên.");
        } catch (MailException e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            log.warn("Không gửi được email đặt lại mật khẩu cho user {}", user.getId(), e);
        }
    }
}