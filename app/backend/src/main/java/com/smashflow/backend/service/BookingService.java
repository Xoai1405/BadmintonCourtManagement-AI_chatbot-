package com.smashflow.backend.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.smashflow.backend.dto.request.CreateBookingRequest;
import com.smashflow.backend.dto.response.BookingDetailResponse;
import com.smashflow.backend.dto.response.BookingResponse;
import com.smashflow.backend.exception.BookingConflictException;
import com.smashflow.backend.exception.ResourceNotFoundException;
import com.smashflow.backend.model.Booking;
import com.smashflow.backend.model.BusinessHourConfig;
import com.smashflow.backend.model.Court;
import com.smashflow.backend.model.User;
import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.CourtStatus;
import com.smashflow.backend.model.enums.PaymentStatus;
import com.smashflow.backend.model.enums.UserStatus;
import com.smashflow.backend.repository.BookingRepository;
import com.smashflow.backend.repository.BusinessHourConfigRepository;
import com.smashflow.backend.repository.CourtRepository;
import com.smashflow.backend.repository.UserRepository;

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

        public List<BookingResponse> getBooking(Long customerId) {
                userRepo.findById(customerId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy khách hàng"));

                List<Booking> listBooking = bookingRepo.findAllBookingsByCustomerId(customerId);

                List<BookingResponse> res = new ArrayList<>();

                for (Booking x : listBooking) {
                        res.add(new BookingResponse(
                                        x.getId(),
                                        x.getBookingCode(),
                                        x.getCourt().getId(),
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

                                .build();
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
}