package com.smashflow.backend.modules.booking.single.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;

/** Cancels expired holds in the database, independent of whether a browser is open. */
@Service
public class BookingExpiryJob {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String EXPIRED_REASON = "Tự động hủy do quá hạn thanh toán hoặc xác nhận";
    private final BookingRepository bookingRepo;
    private final RecurringBookingRepository recurringRepo;

    public BookingExpiryJob(BookingRepository bookingRepo, RecurringBookingRepository recurringRepo) {
        this.bookingRepo = bookingRepo;
        this.recurringRepo = recurringRepo;
    }

    @Scheduled(fixedDelay = 5_000)
    @Transactional
    public void cancelExpiredPendingBookings() {
        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        List<Object[]> expiredRefs = bookingRepo.findExpiredBookingRefs(BookingStatus.PENDING, now);
        Set<Long> recurringIds = new HashSet<>();
        for (Object[] ref : expiredRefs) {
            Long bookingId = (Long) ref[0];
            Long recurringId = (Long) ref[1];
            if (recurringId != null) {
                recurringIds.add(recurringId);
            } else {
                bookingRepo.findByIdForUpdate(bookingId)
                        .filter(b -> isExpired(b, now))
                        .ifPresent(b -> cancel(b, now));
            }
        }
        for (Long recurringId : recurringIds) {
            RecurringBooking recurring = recurringRepo.findByIdForUpdate(recurringId).orElse(null);
            if (recurring == null || recurring.getStatus() != RecurBookingStatus.ACTIVE) continue;
            if (recurring.getBookings().stream().noneMatch(b -> isExpired(b, now))) continue;
            recurring.getBookings().stream().filter(b -> b.getBookingStatus() == BookingStatus.PENDING).forEach(b -> cancel(b, now));
            recurring.setStatus(RecurBookingStatus.CANCELLED);
            recurring.setCancelReason(EXPIRED_REASON);
            recurring.setCancelledAt(now);
        }
    }

    private boolean isExpired(Booking booking, LocalDateTime now) {
        return booking.getBookingStatus() == BookingStatus.PENDING
                && booking.getExpireAt() != null
                && !booking.getExpireAt().isAfter(now);
    }

    private void cancel(Booking booking, LocalDateTime now) {
        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setCancelReason(EXPIRED_REASON);
        booking.setCancelledAt(now);
        booking.setExpireAt(null);
    }
}
