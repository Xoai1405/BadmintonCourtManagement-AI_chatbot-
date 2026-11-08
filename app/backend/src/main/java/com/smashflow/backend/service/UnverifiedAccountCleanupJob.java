package com.smashflow.backend.service;

import java.time.LocalDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.smashflow.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class UnverifiedAccountCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(UnverifiedAccountCleanupJob.class);
    private static final int RETENTION_DAYS = 7;

    private final UserRepository userRepo;

    // giây phút giờ ngày tháng thứ: 3:00:00 sáng mỗi ngày
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void deleteUnverifiedAccounts() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(RETENTION_DAYS);
        int deleted = userRepo.deleteUnverifiedCreatedBefore(cutoff);
        log.info("Đã xóa {} tài khoản chưa xác thực quá {} ngày", deleted, RETENTION_DAYS);
    }
}