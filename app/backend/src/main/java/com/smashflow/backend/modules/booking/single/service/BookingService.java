package com.smashflow.backend.modules.booking.single.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.booking.single.dto.request.CreateBookingRequest;
import com.smashflow.backend.modules.booking.single.dto.response.BookingDetailResponse;
import com.smashflow.backend.modules.booking.single.dto.response.BookingResponse;
import com.smashflow.backend.modules.booking.single.exception.BookingConflictException;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.booking.staff.dto.request.StaffCreateBookingRequest;
import com.smashflow.backend.modules.booking.staff.dto.response.StaffBookingResponse;
import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.model.Court;
import com.smashflow.backend.modules.court.model.enums.CourtStatus;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.court.repository.CourtRepository;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.model.enums.Role;
import com.smashflow.backend.modules.identity.user.model.enums.UserStatus;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;
import com.smashflow.backend.modules.pricing.service.PricingService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BookingService {

        private final UserRepository userRepo;
        private final CourtRepository courtRepo;
        private final BookingRepository bookingRepo;
        private final BusinessHourConfigRepository businessHourConfigRepo;
        private final PricingService pricingService;
        private final RecurringBookingRepository recurringBookingRepo;

        public List<BookingResponse> getBooking(Long customerId) {
                userRepo.findById(customerId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy khách hàng"));

                // Chỉ lấy booking lẻ; buổi của gói cố định xem trong chi tiết gói
                List<Booking> listBooking = bookingRepo.findByCustomer_IdAndRecurringBookingIsNull(customerId);

                List<BookingResponse> res = new ArrayList<>();

                for (Booking x : listBooking) {
                        res.add(new BookingResponse(
                                        x.getId(),
                                        x.getBookingCode(),
                                        x.getCourt().getId(),
                                        x.getCourt().getName(),
                                        x.getCourt().getCourtType(),
                                        x.getCourt().getImageUrl(),
                                        x.getBookingDate(),
                                        x.getStartTime(),
                                        x.getEndTime(),
                                        x.getCourtPrice(),
                                        x.getTotalAmount(),
                                        x.getBookingStatus(),
                                        x.getPaymentStatus(),
                                        x.getExpireAt()));

                }

                return res;
        }

        public BookingDetailResponse getBookingDetail(
                        Long bookingId,
                        Long customerId) {

                Booking booking = bookingRepo.findById(bookingId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy thông tin booking"));

                // Chỉ cho phép khách hàng xem booking của chính mình
                if (!booking.getCustomer().getId().equals(customerId)) {
                        throw new ResourceNotFoundException(
                                        "Không tìm thấy thông tin booking");
                }

                return BookingDetailResponse.builder()
                                // Thông tin booking
                                .id(booking.getId())
                                .bookingCode(booking.getBookingCode())
                                .bookingDate(booking.getBookingDate())
                                .bookingStatus(booking.getBookingStatus().name())
                                .cancelReason(booking.getCancelReason())
                                .cancelledAt(booking.getCancelledAt())

                                // Thông tin sân
                                .courtId(booking.getCourt().getId())
                                .courtName(booking.getCourt().getName())
                                .courtType(booking.getCourt().getCourtType())
                                .courtImageUrl(booking.getCourt().getImageUrl())
                                .courtDescription(booking.getCourt().getDescription())

                                // Thời gian chơi
                                .startTime(booking.getStartTime())
                                .endTime(booking.getEndTime())

                                // Chi phí
                                .courtPrice(booking.getCourtPrice())
                                .servicePrice(booking.getServicePrice())
                                .totalAmount(booking.getTotalAmount())

                                // Trạng thái thanh toán
                                .paymentStatus(booking.getPaymentStatus())
                                .paymentMethod(booking.getPaymentMethod() == null
                                                ? null
                                                : booking.getPaymentMethod())

                                // Thông tin giữ chỗ và thanh toán
                                .createdAt(booking.getCreatedAt())
                                .expireAt(booking.getExpireAt())
                                .paidAt(booking.getPaidAt())
                                .paidByStaffName(booking.getPaidByStaff() == null
                                                ? null
                                                : booking.getPaidByStaff().getFullName())
                                .recurringBookingId(booking.getRecurringBooking() == null
                                                ? null
                                                : booking.getRecurringBooking().getId())
                                .discountPercent(booking.getRecurringBooking() == null
                                                ? null
                                                : booking.getRecurringBooking().getDiscountRate())

                                .build();
        }

        /** Khách xác nhận đã chuyển khoản; nhân viên có 30 phút để kiểm tra. */
        @Transactional
        public BookingResponse markPaymentSubmitted(Long bookingId, Long customerId) {
                Booking booking = bookingRepo.findByIdForUpdate(bookingId)
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin booking"));
                if (!booking.getCustomer().getId().equals(customerId) || booking.getRecurringBooking() != null) {
                        throw new ResourceNotFoundException("Không tìm thấy thông tin booking");
                }
                LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
                if (booking.getBookingStatus() != BookingStatus.PENDING || booking.getPaymentStatus() != PaymentStatus.UNPAID) {
                        throw new IllegalStateException("Booking không còn ở trạng thái chờ thanh toán");
                }
                if (booking.getExpireAt() == null || !booking.getExpireAt().isAfter(now)) {
                        throw new IllegalStateException("Booking đã hết hạn giữ chỗ");
                }
                booking.setPaymentStatus(PaymentStatus.PAID);
                booking.setPaymentMethod("BANK_TRANSFER");
                booking.setPaidAt(now);
                // expireAt được tái sử dụng làm hạn nhân viên xác nhận sau khi khách báo đã trả tiền.
                booking.setExpireAt(now.plusMinutes(30));
                Booking saved = bookingRepo.save(booking);
                return new BookingResponse(saved.getId(), saved.getBookingCode(), saved.getCourt().getId(), saved.getCourt().getName(),
                                saved.getCourt().getCourtType(), saved.getCourt().getImageUrl(), saved.getBookingDate(), saved.getStartTime(),
                                saved.getEndTime(), saved.getCourtPrice(), saved.getTotalAmount(), saved.getBookingStatus(), saved.getPaymentStatus(), saved.getExpireAt());
        }

        // ===================== NHÂN VIÊN =====================

        // Danh sách booking lẻ cho trang tra cứu của nhân viên
        public List<StaffBookingResponse> getStaffBookings() {
                return bookingRepo.findAllSingleBookings()
                                .stream()
                                .map(this::toStaffResponse)
                                .toList();
        }

        public StaffBookingResponse getStaffBookingDetail(Long bookingId) {
                Booking booking = bookingRepo.findById(bookingId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy booking"));
                return toStaffResponse(booking);
        }

        /**
         * Nhân viên xác nhận booking sau khi kiểm tra đã nhận tiền sân (FR-15, FR-24).
         * PENDING -> CONFIRMED, đồng thời ghi nhận tiền sân đã thanh toán.
         */
        @Transactional
        public StaffBookingResponse confirmBooking(Long bookingId, Long staffId) {
                Booking booking = bookingRepo.findByIdForUpdate(bookingId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy booking"));

                User staff = userRepo.findById(staffId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy nhân viên"));

                // Buổi thuộc gói cố định được xác nhận 1 lần cho cả gói
                if (booking.getRecurringBooking() != null) {
                        throw new IllegalStateException(
                                        "Buổi thuộc gói lịch cố định, vui lòng xác nhận tại trang chi tiết gói");
                }

                if (booking.getBookingStatus() != BookingStatus.PENDING) {
                        throw new IllegalStateException(
                                        "Chỉ xác nhận được booking đang chờ xác nhận");
                }

                if (booking.getPaymentStatus() != PaymentStatus.PAID) {
                        throw new IllegalStateException(
                                        "Khách chưa xác nhận đã thanh toán");
                }

                // FR-14: kiểm tra lại trùng lịch khi xác nhận
                boolean hasConflict = bookingRepo.existsOverlapExcluding(
                                booking.getCourt().getId(),
                                booking.getBookingDate(),
                                booking.getStartTime(),
                                booking.getEndTime(),
                                booking.getId(),
                                List.of(
                                                BookingStatus.CONFIRMED,
                                                BookingStatus.CHECKED_IN));

                if (hasConflict) {
                        throw new BookingConflictException(
                                        "Khung giờ này đã có booking khác được xác nhận");
                }

                booking.setBookingStatus(BookingStatus.CONFIRMED);
                // Khách đã báo chuyển khoản; nhân viên chỉ xác nhận booking, không ghi đè thời điểm khách báo trả.
                // Khách tự đặt thanh toán tiền sân bằng chuyển khoản / QR.
                // DB chỉ cho phép 'CASH' hoặc 'BANK_TRANSFER' (chk_payment_method).
                if (booking.getPaymentMethod() == null) {
                        booking.setPaymentMethod("BANK_TRANSFER");
                }
                booking.setPaidByStaff(staff);
                // Đã xác nhận thì không còn hạn giữ chỗ
                booking.setExpireAt(null);

                return toStaffResponse(bookingRepo.save(booking));
        }

        /**
         * Check-in: khách đã đến sân (FR-30). CONFIRMED -> CHECKED_IN.
         */
        @Transactional
        public StaffBookingResponse checkInBooking(Long bookingId) {
                Booking booking = lockBooking(bookingId);

                if (booking.getBookingStatus() != BookingStatus.CONFIRMED) {
                        throw new IllegalStateException(
                                        "Chỉ check-in được booking đã xác nhận");
                }

                booking.setBookingStatus(BookingStatus.CHECKED_IN);
                return toStaffResponse(bookingRepo.save(booking));
        }

        /**
         * Nhân viên chủ động hủy booking khi sân hư/bảo trì hoặc không thể phục vụ.
         * Có thể hủy cả booking đã thanh toán, nhưng giữ nguyên paymentStatus để không
         * làm mất dấu giao dịch và cho phép quy trình hoàn tiền được xử lý riêng.
         */
        @Transactional
        public StaffBookingResponse cancelBookingByStaff(Long bookingId, String reason) {
                Booking booking = lockBooking(bookingId);
                String trimmedReason = reason == null ? "" : reason.trim();

                if (trimmedReason.isEmpty()) {
                        throw new IllegalArgumentException("Vui lòng nhập lý do hủy booking");
                }
                if (booking.getBookingStatus() != BookingStatus.PENDING
                                && booking.getBookingStatus() != BookingStatus.CONFIRMED) {
                        throw new IllegalStateException("Chỉ có thể hủy booking đang chờ xác nhận hoặc đã xác nhận trước khi check-in");
                }

                booking.setBookingStatus(BookingStatus.CANCELLED);
                booking.setCancelReason(trimmedReason);
                booking.setCancelledAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
                booking.setExpireAt(null);
                Booking saved = bookingRepo.save(booking);
                updatePackageCompletion(saved);
                return toStaffResponse(saved);
        }

        /**
         * Xác nhận thu đủ tiền khi khách trả sân (kết toán).
         * Chỉ khi booking đang CHECKED_IN và tiền sân đã thanh toán (PAID).
         * Chỉ đổi trạng thái sang SETTLED; giữ nguyên paidAt / paidByStaff /
         * paymentMethod
         * (thông tin lúc nhân viên xác nhận tiền sân).
         */
        @Transactional
        public StaffBookingResponse settleBooking(Long bookingId) {
                Booking booking = lockBooking(bookingId);

                if (booking.getBookingStatus() != BookingStatus.CHECKED_IN) {
                        throw new IllegalStateException(
                                        "Chỉ thu tiền khi khách đã check-in");
                }

                if (booking.getPaymentStatus() == PaymentStatus.SETTLED) {
                        throw new IllegalStateException(
                                        "Booking đã được kết toán");
                }

                if (booking.getPaymentStatus() != PaymentStatus.PAID) {
                        throw new IllegalStateException(
                                        "Booking chưa thanh toán tiền sân");
                }

                booking.setPaymentStatus(PaymentStatus.SETTLED);

                return toStaffResponse(bookingRepo.save(booking));
        }

        /**
         * Hoàn thành (FR-19): chỉ khi đã check-in và đã kết toán.
         */
        @Transactional
        public StaffBookingResponse completeBooking(Long bookingId) {
                Booking booking = lockBooking(bookingId);

                if (booking.getBookingStatus() != BookingStatus.CHECKED_IN) {
                        throw new IllegalStateException(
                                        "Chỉ hoàn thành được booking đang chơi");
                }

                if (booking.getPaymentStatus() != PaymentStatus.SETTLED) {
                        throw new IllegalStateException(
                                        "Vui lòng xác nhận thu đủ tiền trước khi hoàn thành");
                }

                booking.setBookingStatus(BookingStatus.COMPLETED);
                Booking saved = bookingRepo.save(booking);
                updatePackageCompletion(saved);
                return toStaffResponse(saved);
        }

        /**
         * Bùng lịch (BR-15): chỉ sau giờ bắt đầu chơi 30 phút.
         * Đơn chuyển sang Đã kết toán, không hoàn tiền.
         */
        @Transactional
        public StaffBookingResponse noShowBooking(Long bookingId) {
                Booking booking = lockBooking(bookingId);

                if (booking.getBookingStatus() != BookingStatus.CONFIRMED) {
                        throw new IllegalStateException(
                                        "Chỉ đánh dấu bùng lịch cho booking đã xác nhận");
                }

                LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
                LocalDateTime allowedFrom = LocalDateTime.of(
                                booking.getBookingDate(),
                                booking.getStartTime()).plusMinutes(30);

                if (now.isBefore(allowedFrom)) {
                        throw new IllegalStateException(
                                        "Chỉ đánh dấu bùng lịch sau giờ bắt đầu chơi 30 phút");
                }

                booking.setBookingStatus(BookingStatus.NO_SHOW);
                // Giữ nguyên thông tin xác nhận tiền sân
                booking.setPaymentStatus(PaymentStatus.SETTLED);

                Booking saved = bookingRepo.save(booking);
                updatePackageCompletion(saved);
                return toStaffResponse(saved);
        }

        /**
         * Gói cố định tự chuyển COMPLETED khi mọi buổi đã Hoàn thành / Bùng lịch / Hủy.
         */
        private void updatePackageCompletion(Booking booking) {
                RecurringBooking recurring = booking.getRecurringBooking();
                if (recurring == null || recurring.getStatus() != RecurBookingStatus.ACTIVE) {
                        return;
                }

                boolean allFinished = recurring.getBookings().stream()
                                .allMatch(b -> b.getBookingStatus() == BookingStatus.COMPLETED
                                                || b.getBookingStatus() == BookingStatus.NO_SHOW
                                                || b.getBookingStatus() == BookingStatus.CANCELLED);

                if (allFinished) {
                        boolean allCancelled = recurring.getBookings().stream()
                                        .allMatch(b -> b.getBookingStatus() == BookingStatus.CANCELLED);
                        recurring.setStatus(allCancelled ? RecurBookingStatus.CANCELLED : RecurBookingStatus.COMPLETED);
                        recurringBookingRepo.save(recurring);
                }
        }

        private Booking lockBooking(Long bookingId) {
                return bookingRepo.findByIdForUpdate(bookingId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy booking"));
        }

        private StaffBookingResponse toStaffResponse(Booking b) {
                User customer = b.getCustomer();
                return new StaffBookingResponse(
                                b.getId(),
                                b.getBookingCode(),
                                new StaffBookingResponse.CustomerInfo(
                                                customer.getId(),
                                                customer.getFullName(),
                                                customer.getPhoneNumber(),
                                                customer.getEmail()),
                                b.getCourt().getId(),
                                b.getCourt().getName(),
                                b.getCourt().getCourtType(),
                                b.getBookingDate(),
                                b.getStartTime(),
                                b.getEndTime(),
                                b.getCourtPrice(),
                                b.getServicePrice(),
                                b.getTotalAmount(),
                                b.getBookingStatus(),
                                b.getPaymentStatus(),
                                b.getPaymentMethod(),
                                b.getPaidAt(),
                                b.getPaidByStaff() == null ? null : b.getPaidByStaff().getFullName(),
                                b.getCreatedByStaff() == null ? null : b.getCreatedByStaff().getFullName(),
                                b.getCancelReason(),
                                b.getCancelledAt(),
                                b.getExpireAt(),
                                b.getCreatedAt(),
                                b.getRecurringBooking() == null ? null : b.getRecurringBooking().getId(),
                                b.getRecurringBooking() == null ? null : b.getRecurringBooking().getStatus().name(),
                                b.getRecurringBooking() == null ? null : b.getRecurringBooking().getDiscountRate());
        }

        @Transactional
        public Booking createBooking(
                        CreateBookingRequest request,
                        Long customerId) {

                User customer = userRepo.findById(customerId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy khách hàng"));

                Court court = courtRepo.findById(request.courtId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy sân"));

                BusinessHourConfig businessConfig = businessHourConfigRepo.findById((short) 1)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Chưa có cấu hình giờ hoạt động"));

                LocalDateTime now = LocalDateTime.now(
                                ZoneId.of("Asia/Ho_Chi_Minh"));

                LocalDateTime bookingStart = LocalDateTime.of(
                                request.bookingDate(),
                                request.startTime());

                validateBookingRequest(
                                request,
                                bookingStart,
                                businessConfig);

                if (court.getStatus() != CourtStatus.ACTIVE) {
                        throw new IllegalArgumentException(
                                        "Sân hiện không hoạt động");
                }

                if (customer.getStatus() != UserStatus.ACTIVE) {
                        throw new IllegalArgumentException(
                                        "Tài khoản hiện không thể đặt sân");
                }

                boolean hasConflict = bookingRepo.existsOverlap(
                                court.getId(),
                                request.bookingDate(),
                                request.startTime(),
                                request.endTime(),
                                List.of(
                                                BookingStatus.PENDING,
                                                BookingStatus.CONFIRMED,
                                                BookingStatus.CHECKED_IN));

                if (hasConflict) {
                        throw new BookingConflictException(
                                        "Khung giờ này đã được đặt");
                }

                BigDecimal courtPrice = pricingService.calculateCourtPrice(
                                court.getCourtType(),
                                request.startTime(),
                                request.endTime());

                Booking booking = new Booking();

                booking.setBookingCode(generateBookingCode());
                booking.setCustomer(customer);
                booking.setCourt(court);

                booking.setBookingDate(request.bookingDate());
                booking.setStartTime(request.startTime());
                booking.setEndTime(request.endTime());

                booking.setCourtPrice(courtPrice);
                booking.setServicePrice(BigDecimal.ZERO);
                booking.setTotalAmount(courtPrice);

                booking.setBookingStatus(BookingStatus.PENDING);
                booking.setPaymentStatus(PaymentStatus.UNPAID);

                booking.setCreatedAt(now);
                booking.setExpireAt(now.plusMinutes(10));

                return bookingRepo.save(booking);
        }

        private void validateBookingRequest(
                        CreateBookingRequest request,
                        LocalDateTime bookingStart,
                        BusinessHourConfig businessConfig) {

                if (!bookingStart.isAfter(
                                LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")))) {
                        throw new IllegalArgumentException(
                                        "Không thể đặt khung giờ đã qua");
                }

                if (!request.endTime().isAfter(request.startTime())) {
                        throw new IllegalArgumentException(
                                        "Giờ kết thúc phải sau giờ bắt đầu");
                }

                if (!isHalfHourSlot(request.startTime())
                                || !isHalfHourSlot(request.endTime())) {
                        throw new IllegalArgumentException(
                                        "Giờ đặt sân phải theo mốc 30 phút");
                }

                if (request.startTime().isBefore(
                                businessConfig.getOpeningTime())
                                || request.endTime().isAfter(
                                                businessConfig.getClosingTime())) {

                        throw new IllegalArgumentException(
                                        "Sân chỉ hoạt động từ "
                                                        + businessConfig.getOpeningTime()
                                                        + " đến "
                                                        + businessConfig.getClosingTime());
                }
        }

        private boolean isHalfHourSlot(LocalTime time) {
                return time.getMinute() % 30 == 0
                                && time.getSecond() == 0
                                && time.getNano() == 0;
        }

        private String generateBookingCode() {
                return "BK" + UUID.randomUUID()
                                .toString()
                                .replace("-", "")
                                .substring(0, 16)
                                .toUpperCase();
        }

        /**
         * Nhân viên tạo booking lẻ tại quầy cho khách.
         * - Khách hàng lấy từ request.customerId(), nhân viên lấy từ token (staffId).
         * - Khách trả tiền tại quầy nên booking lưu luôn CONFIRMED + PAID, không có hạn
         * giữ chỗ.
         * - Validate giờ dùng lại validateBookingRequest của luồng khách tự đặt.
         */
        @Transactional
        public StaffBookingResponse createBookingByStaff(
                        StaffCreateBookingRequest request,
                        Long staffId) {

                User staff = userRepo.findById(staffId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy nhân viên"));

                User customer = userRepo.findById(request.customerId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy khách hàng"));

                if (customer.getRole() != Role.CUSTOMER) {
                        throw new IllegalArgumentException(
                                        "Tài khoản được chọn không phải khách hàng");
                }

                if (customer.getStatus() != UserStatus.ACTIVE) {
                        throw new IllegalArgumentException(
                                        "Tài khoản khách hàng đang bị khóa, không thể đặt sân");
                }

                Court court = courtRepo.findById(request.courtId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy sân"));

                if (court.getStatus() != CourtStatus.ACTIVE) {
                        throw new IllegalArgumentException(
                                        "Sân hiện không hoạt động");
                }

                BusinessHourConfig businessConfig = businessHourConfigRepo.findById((short) 1)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Chưa có cấu hình giờ hoạt động"));

                LocalDateTime now = LocalDateTime.now(
                                ZoneId.of("Asia/Ho_Chi_Minh"));

                validateBookingRequest(
                                new CreateBookingRequest(
                                                request.courtId(),
                                                request.bookingDate(),
                                                request.startTime(),
                                                request.endTime()),
                                LocalDateTime.of(request.bookingDate(), request.startTime()),
                                businessConfig);

                boolean hasConflict = bookingRepo.existsOverlap(
                                court.getId(),
                                request.bookingDate(),
                                request.startTime(),
                                request.endTime(),
                                List.of(
                                                BookingStatus.PENDING,
                                                BookingStatus.CONFIRMED,
                                                BookingStatus.CHECKED_IN));

                if (hasConflict) {
                        throw new BookingConflictException(
                                        "Khung giờ này đã được đặt");
                }

                BigDecimal courtPrice = pricingService.calculateCourtPrice(
                                court.getCourtType(),
                                request.startTime(),
                                request.endTime());

                Booking booking = new Booking();

                booking.setBookingCode(generateBookingCode());
                booking.setCustomer(customer);
                booking.setCreatedByStaff(staff);
                booking.setCourt(court);

                booking.setBookingDate(request.bookingDate());
                booking.setStartTime(request.startTime());
                booking.setEndTime(request.endTime());

                booking.setCourtPrice(courtPrice);
                booking.setServicePrice(BigDecimal.ZERO);
                booking.setTotalAmount(courtPrice);

                // Thanh toán tại quầy: xác nhận + đã thu tiền ngay
                booking.setBookingStatus(BookingStatus.CONFIRMED);
                booking.setPaymentStatus(PaymentStatus.PAID);
                booking.setPaymentMethod(request.paymentMethod());
                booking.setPaidAt(now);
                booking.setPaidByStaff(staff);
                booking.setExpireAt(null);

                booking.setCreatedAt(now);

                return toStaffResponse(bookingRepo.save(booking));
        }
}
