package com.smashflow.backend.modules.identity.auth.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smashflow.backend.modules.identity.auth.model.EmailVerificationToken;
import com.smashflow.backend.modules.identity.user.model.User;

public interface EmailVerificationTokenRepository
        extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    // token mới nhất của user, để tính thời gian chờ
    Optional<EmailVerificationToken> findTopByUserOrderByCreatedAtDesc(User user);

    // đếm số token tạo từ một thời điểm, để giới hạn theo ngày
    long countByUserAndCreatedAtAfter(User user, LocalDateTime time);

    // các token chưa dùng, để vô hiệu khi gửi link mới
    List<EmailVerificationToken> findByUserAndUsedAtIsNull(User user);
}