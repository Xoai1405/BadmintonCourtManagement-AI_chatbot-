package com.smashflow.backend.modules.identity.auth.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smashflow.backend.modules.identity.auth.model.EmailVerificationToken;
import com.smashflow.backend.modules.identity.auth.model.PasswordResetToken;
import com.smashflow.backend.modules.identity.user.model.User;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    Optional<PasswordResetToken> findTopByUserOrderByCreatedAtDesc(User user);

    // đếm số token tạo từ một thời điểm, để giới hạn theo ngày
    long countByUserAndCreatedAtAfter(User user, LocalDateTime time);

    // các token chưa dùng, để vô hiệu khi gửi link mới
    List<PasswordResetToken> findByUserAndUsedAtIsNull(User user);
}
