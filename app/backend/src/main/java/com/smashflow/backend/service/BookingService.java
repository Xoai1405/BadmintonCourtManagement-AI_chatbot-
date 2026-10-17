package com.smashflow.backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import java.util.List;

import java.time.ZoneId;
import java.util.UUID;

import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.PaymentStatus;
import java.math.BigDecimal;
import com.smashflow.backend.exception.BookingConflictException;
import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.dto.request.CreateBookingRequest;
import com.smashflow.backend.exception.BookingConflictException;
import com.smashflow.backend.exception.ResourceNotFoundException;
import com.smashflow.backend.model.Booking;
import com.smashflow.backend.model.Court;
import com.smashflow.backend.model.User;
import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.CourtStatus;
import com.smashflow.backend.model.enums.PaymentStatus;
import com.smashflow.backend.model.enums.UserStatus;
import com.smashflow.backend.repository.BookingRepository;
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
    private final PricingService pricingService;

    private boolean isHalfHourSlot(LocalTime time) {
        return time.getMinute() % 30 == 0
                && time.getSecond() == 0
                && time.getNano() == 0;
    }

    @Transactional
    public Booking createBooking(
            CreateBookingRequest request,

            Long customerId) {

        // Lấy customer và court từ database
        User customer = userRepo.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khách hàng"));

        Court court = courtRepo.findById(request.courtId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân"));

        // Validate ngày/giờ, sân ACTIVE, mốc 30 phút
        LocalDateTime now = LocalDateTime.now(
                ZoneId.of("Asia/Ho_Chi_Minh"));

        LocalDateTime bookingStart = LocalDateTime.of(
                request.bookingDate(),
                request.startTime());

        if (!bookingStart.isAfter(now)) {
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

        if (request.startTime().isBefore(LocalTime.of(6, 0))
                || request.endTime().isAfter(LocalTime.of(22, 0))) {
            throw new IllegalArgumentException(
                    "Sân chỉ hoạt động từ 06:00 đến 22:00");
        }

        if (court.getStatus() != CourtStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Sân hiện không hoạt động");
        }

        if (customer.getStatus() != UserStatus.ACTIVE) {
            throw new IllegalArgumentException(
                    "Tài khoản hiện không thể đặt sân");
        }
        // existsOverlap(...)
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

        // Tính courtPrice từ từng slot 30 phút và PriceConfig
        BigDecimal courtPrice = pricingService.calculateCourtPrice(
                court.getCourtType(),
                request.startTime(),
                request.endTime());
        // Tạo booking PENDING, UNPAID
        LocalDateTime createdAt = LocalDateTime.now(
                ZoneId.of("Asia/Ho_Chi_Minh"));

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

        booking.setExpireAt(createdAt.plusMinutes(10));
        booking.setCreatedAt(createdAt);

        return bookingRepo.save(booking);

    }

    private String generateBookingCode() {
        return "BK" + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 16)
                .toUpperCase();
    }
}
