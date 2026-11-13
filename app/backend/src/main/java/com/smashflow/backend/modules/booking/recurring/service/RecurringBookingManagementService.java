package com.smashflow.backend.modules.booking.recurring.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.recurring.dto.response.RecurringBookingDetailResponse;
import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.booking.single.exception.BookingConflictException;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Xem / xác nhận / hủy gói đặt lịch cố định.
 *
 * Quy ước (theo tài liệu yêu cầu):
 * - Tiền sân gói thanh toán trọn gói khi đặt (BR-11). Nhân viên xác nhận 1 lần
 * cho cả gói:
 * tất cả các buổi chuyển CONFIRMED + PAID.
 * - Mỗi buổi check-in / thu đủ tiền / hoàn thành / bùng lịch riêng (BR-12),
 * dùng chung API của booking lẻ (StaffBookingController).
 * - Chỉ hủy được gói khi chưa thanh toán (BR-14). Các buổi đã kết thúc giữ
 * nguyên (BR-13).
 */
@Service
@RequiredArgsConstructor
public class RecurringBookingManagementService {

        private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

        private final RecurringBookingRepository recurringBookingRepo;
        private final BookingRepository bookingRepo;
        private final UserRepository userRepo;

        // ===================== KHÁCH HÀNG =====================

        @Transactional(readOnly = true)
        public List<RecurringBookingDetailResponse> getMyRecurringBookings(Long customerId) {
                return recurringBookingRepo.findByCustomerIdOrderByCreatedAtDesc(customerId)
                                .stream()
                                .map(r -> toResponse(r, false))
                                .toList();
        }

        @Transactional(readOnly = true)
        public RecurringBookingDetailResponse getMyRecurringBookingDetail(Long id, Long customerId) {
                RecurringBooking recurring = recurringBookingRepo.findWithBookingsById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói lịch cố định"));

                // Khách chỉ xem được gói của chính mình
                if (!recurring.getCustomer().getId().equals(customerId)) {
                        throw new ResourceNotFoundException("Không tìm thấy gói lịch cố định");
                }

                return toResponse(recurring, true);
        }

        /** Khách báo đã chuyển khoản tiền gói; nhân viên phải xác nhận trong 30 phút. */
        @Transactional
        public RecurringBookingDetailResponse markPaymentSubmitted(Long id, Long customerId) {
                RecurringBooking recurring = recurringBookingRepo.findByIdForUpdate(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói lịch cố định"));
                if (!recurring.getCustomer().getId().equals(customerId)) {
                        throw new ResourceNotFoundException("Không tìm thấy gói lịch cố định");
                }
                LocalDateTime now = LocalDateTime.now(VN_ZONE);
                List<Booking> sessions = recurring.getBookings();
                if (recurring.getStatus() != RecurBookingStatus.ACTIVE
                                || sessions.stream().anyMatch(b -> b.getPaymentStatus() != PaymentStatus.UNPAID)
                                || sessions.stream().anyMatch(b -> b.getExpireAt() == null || !b.getExpireAt().isAfter(now))) {
                        throw new IllegalStateException("Gói không còn ở trạng thái chờ thanh toán");
                }
                for (Booking session : sessions) {
                        session.setPaymentStatus(PaymentStatus.PAID);
                        session.setPaymentMethod("BANK_TRANSFER");
                        session.setPaidAt(now);
                        session.setExpireAt(now.plusMinutes(30));
                }
                bookingRepo.saveAll(sessions);
                return toResponse(recurring, true);
        }

        // ===================== NHÂN VIÊN =====================

        @Transactional(readOnly = true)
        public List<RecurringBookingDetailResponse> getAllRecurringBookings() {
                return recurringBookingRepo.findAllByOrderByCreatedAtDesc()
                                .stream()
                                .map(r -> toResponse(r, false))
                                .toList();
        }

        @Transactional(readOnly = true)
        public RecurringBookingDetailResponse getRecurringBookingDetail(Long id) {
                RecurringBooking recurring = recurringBookingRepo.findWithBookingsById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói lịch cố định"));
                return toResponse(recurring, true);
        }

        /**
         * Nhân viên xác nhận đã nhận tiền sân trọn gói.
         * Tất cả các buổi đang chờ xác nhận chuyển CONFIRMED + PAID.
         */
        @Transactional
        public RecurringBookingDetailResponse confirmRecurringBooking(Long id, Long staffId) {
                RecurringBooking recurring = recurringBookingRepo.findByIdForUpdate(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói lịch cố định"));

                User staff = userRepo.findById(staffId)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên"));

                if (recurring.getStatus() != RecurBookingStatus.ACTIVE) {
                        throw new IllegalStateException("Chỉ xác nhận được gói đang hoạt động");
                }

                List<Booking> sessions = recurring.getBookings();

                if (sessions.stream().anyMatch(b -> b.getPaymentStatus() != PaymentStatus.PAID)) {
                        throw new IllegalStateException("Gói đã được thanh toán trước đó");
                }

                List<Booking> pending = sessions.stream()
                                .filter(b -> b.getBookingStatus() == BookingStatus.PENDING)
                                .toList();

                if (pending.isEmpty()) {
                        throw new IllegalStateException("Gói không còn buổi nào chờ xác nhận");
                }

                // FR-14 / BR-10: kiểm tra lại trùng lịch cho từng buổi trước khi xác nhận
                for (Booking session : pending) {
                        boolean hasConflict = bookingRepo.existsOverlapExcluding(
                                        session.getCourt().getId(),
                                        session.getBookingDate(),
                                        session.getStartTime(),
                                        session.getEndTime(),
                                        session.getId(),
                                        List.of(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN));

                        if (hasConflict) {
                                throw new BookingConflictException(
                                                "Buổi ngày " + session.getBookingDate()
                                                                + " đã có booking khác được xác nhận");
                        }
                }

                LocalDateTime now = LocalDateTime.now(VN_ZONE);

                for (Booking session : pending) {
                        session.setBookingStatus(BookingStatus.CONFIRMED);
                        // DB chỉ cho phép 'CASH' hoặc 'BANK_TRANSFER' (chk_payment_method)
                        if (session.getPaymentMethod() == null) {
                                session.setPaymentMethod("BANK_TRANSFER");
                        }
                        session.setPaidByStaff(staff);
                        session.setExpireAt(null);
                }

                bookingRepo.saveAll(pending);
                return toResponse(recurring, true);
        }

        /**
         * Nhân viên hủy gói (FR-37). Chỉ khi gói chưa thanh toán (BR-14).
         * Các buổi đang chờ xác nhận chuyển Đã hủy; buổi đã kết thúc giữ nguyên
         * (BR-13).
         */
        @Transactional
        public RecurringBookingDetailResponse cancelRecurringBooking(Long id, String reason) {
                RecurringBooking recurring = recurringBookingRepo.findByIdForUpdate(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói lịch cố định"));

                if (recurring.getStatus() != RecurBookingStatus.ACTIVE) {
                        throw new IllegalStateException("Chỉ hủy được gói đang hoạt động");
                }

                String trimmedReason = reason == null ? "" : reason.trim();
                if (trimmedReason.isEmpty()) {
                        throw new IllegalArgumentException("Vui lòng nhập lý do hủy gói");
                }

                List<Booking> sessions = recurring.getBookings();

                LocalDateTime now = LocalDateTime.now(VN_ZONE);

                List<Booking> toCancel = sessions.stream()
                                .filter(b -> b.getBookingStatus() == BookingStatus.PENDING
                                                || b.getBookingStatus() == BookingStatus.CONFIRMED)
                                .toList();

                if (toCancel.isEmpty()) {
                        throw new IllegalStateException("Gói không còn buổi nào có thể hủy trước check-in");
                }

                for (Booking session : toCancel) {
                        session.setBookingStatus(BookingStatus.CANCELLED);
                        session.setCancelReason(trimmedReason);
                        session.setCancelledAt(now);
                        session.setExpireAt(null);
                }
                bookingRepo.saveAll(toCancel);

                recurring.setStatus(RecurBookingStatus.CANCELLED);
                recurring.setCancelReason(trimmedReason);
                recurring.setCancelledAt(now);
                recurringBookingRepo.save(recurring);

                return toResponse(recurring, true);
        }

        // ===================== MAPPING =====================

        private RecurringBookingDetailResponse toResponse(RecurringBooking r, boolean includeSessions) {
                List<Booking> sessions = r.getBookings().stream()
                                .sorted(Comparator.comparing(Booking::getBookingDate)
                                                .thenComparing(Booking::getStartTime))
                                .toList();

                // Gói đã thanh toán khi có buổi đã được xác nhận tiền sân
                Booking paidSession = sessions.stream()
                                .filter(b -> b.getPaymentStatus() != PaymentStatus.UNPAID)
                                .findFirst()
                                .orElse(null);

                // Hạn giữ chỗ của gói = hạn sớm nhất của các buổi đang chờ
                LocalDateTime expireAt = r.getStatus() != RecurBookingStatus.ACTIVE
                                ? null
                                : sessions.stream()
                                                .filter(b -> b.getBookingStatus() == BookingStatus.PENDING)
                                                .map(Booking::getExpireAt)
                                                .filter(Objects::nonNull)
                                                .min(Comparator.naturalOrder())
                                                .orElse(null);

                int completed = (int) sessions.stream()
                                .filter(b -> b.getBookingStatus() == BookingStatus.COMPLETED)
                                .count();
                int settled = (int) sessions.stream()
                                .filter(b -> b.getPaymentStatus() == PaymentStatus.SETTLED)
                                .count();

                User customer = r.getCustomer();

                List<RecurringBookingDetailResponse.SessionInfo> sessionInfos = includeSessions
                                ? sessions.stream()
                                                .map(b -> new RecurringBookingDetailResponse.SessionInfo(
                                                                b.getId(),
                                                                b.getBookingCode(),
                                                                b.getBookingDate(),
                                                                b.getStartTime(),
                                                                b.getEndTime(),
                                                                b.getBookingStatus(),
                                                                b.getPaymentStatus(),
                                                                b.getCourtPrice(),
                                                                b.getServicePrice(),
                                                                b.getTotalAmount()))
                                                .toList()
                                : List.of();

                return new RecurringBookingDetailResponse(
                                r.getId(),
                                "#" + r.getId(),
                                new RecurringBookingDetailResponse.CustomerInfo(
                                                customer.getId(),
                                                customer.getFullName(),
                                                customer.getPhoneNumber(),
                                                customer.getEmail()),
                                r.getCourt().getId(),
                                r.getCourt().getName(),
                                r.getCourt().getCourtType(),
                                r.getCourt().getImageUrl(),
                                r.getCourt().getDescription(),
                                r.getStartDate(),
                                r.getEndDate(),
                                r.getDaysOfWeek().stream().map(Enum::name).toList(),
                                r.getStartTime(),
                                r.getEndTime(),
                                r.getDiscountRate(),
                                r.getTotalAmount(),
                                r.getStatus().name(),
                                paidSession != null ? "PAID" : "UNPAID",
                                paidSession != null ? paidSession.getPaymentMethod() : null,
                                paidSession != null ? paidSession.getPaidAt() : null,
                                paidSession != null && paidSession.getPaidByStaff() != null
                                                ? paidSession.getPaidByStaff().getFullName()
                                                : null,
                                expireAt,
                                sessions.size(),
                                completed,
                                settled,
                                r.getCancelReason(),
                                r.getCancelledAt(),
                                r.getCreatedAt(),
                                sessionInfos);
        }
}
