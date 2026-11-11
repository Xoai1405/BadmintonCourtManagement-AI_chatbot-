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
        List<Booking> expired = bookingRepo.findExpiredBookings(BookingStatus.PENDING, now);
        Set<Long> recurringIds = new HashSet<>();
        for (Booking booking : expired) {
            if (booking.getRecurringBooking() == null) cancel(booking, now);
            else recurringIds.add(booking.getRecurringBooking().getId());
        }
        for (Long recurringId : recurringIds) {
            RecurringBooking recurring = recurringRepo.findByIdForUpdate(recurringId).orElse(null);
            if (recurring == null || recurring.getStatus() != RecurBookingStatus.ACTIVE) continue;
            recurring.getBookings().stream().filter(b -> b.getBookingStatus() == BookingStatus.PENDING).forEach(b -> cancel(b, now));
            recurring.setStatus(RecurBookingStatus.CANCELLED);
            recurring.setCancelReason(EXPIRED_REASON);
            recurring.setCancelledAt(now);
        }
    }

    private void cancel(Booking booking, LocalDateTime now) {
        booking.setBookingStatus(BookingStatus.CANCELLED);
        booking.setCancelReason(EXPIRED_REASON);
        booking.setCancelledAt(now);
        booking.setExpireAt(null);
    }
}
