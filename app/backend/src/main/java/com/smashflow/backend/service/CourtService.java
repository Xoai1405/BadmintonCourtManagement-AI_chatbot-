package com.smashflow.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.smashflow.backend.dto.response.CourtAvailabilityResponse;
import com.smashflow.backend.dto.response.CourtResponse;
import com.smashflow.backend.dto.response.TimeSlotResponse;
import com.smashflow.backend.exception.ResourceNotFoundException;
import com.smashflow.backend.model.Booking;
import com.smashflow.backend.model.BusinessHourConfig;
import com.smashflow.backend.model.Court;
import com.smashflow.backend.model.PriceConfig;
import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.SlotStatus;
import com.smashflow.backend.repository.BookingRepository;
import com.smashflow.backend.repository.BusinessHourConfigRepository;
import com.smashflow.backend.repository.CourtRepository;
import com.smashflow.backend.repository.PriceConfigRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CourtService {

        private final CourtRepository courtRepo;
        private final PriceConfigRepository priceConfigRepo;
        private final BusinessHourConfigRepository businessHourConfigRepo;
        private final BookingRepository bookingRepo;
        private final PricingService pricingService;

        public List<CourtResponse> getAllCourts() {
                List<Court> courts = courtRepo.findAll();
                List<CourtResponse> responses = new ArrayList<>();

                for (Court court : courts) {
                        PriceConfig priceConfig = getPriceConfig(court);

                        responses.add(toCourtResponse(court, priceConfig));
                }

                return responses;
        }

        public CourtResponse getCourt(Long id) {
                Court court = courtRepo.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tồn tại dữ liệu sân"));

                PriceConfig priceConfig = getPriceConfig(court);

                return toCourtResponse(court, priceConfig);
        }

        public CourtAvailabilityResponse getAvailability(
                        Long courtId,
                        LocalDate date) {

                Court court = courtRepo.findById(courtId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy sân"));

                PriceConfig priceConfig = getPriceConfig(court);
                BusinessHourConfig businessConfig = getBusinessHourConfig();

                List<Booking> blockingBookings = bookingRepo.findByCourt_IdAndBookingDateAndBookingStatusIn(
                                courtId,
                                date,
                                List.of(
                                                BookingStatus.PENDING,
                                                BookingStatus.CONFIRMED,
                                                BookingStatus.CHECKED_IN));

                LocalDateTime now = LocalDateTime.now(
                                ZoneId.of("Asia/Ho_Chi_Minh"));

                List<TimeSlotResponse> slots = new ArrayList<>();

                for (LocalTime slotStart = businessConfig.getOpeningTime(); slotStart
                                .isBefore(businessConfig.getClosingTime()); slotStart = slotStart.plusMinutes(30)) {
                        // Lưu giá trị slotStart hiện tại để sử dụng an toàn
                        // trong lambda và các xử lý bên dưới.
                        LocalTime currentSlotStart = slotStart;

                        LocalTime slotEnd = currentSlotStart.plusMinutes(30);

                        // Kiểm tra slot đã qua hay chưa
                        boolean isPast = date.isBefore(now.toLocalDate())
                                        || (date.isEqual(now.toLocalDate())
                                                        && !currentSlotStart.isAfter(now.toLocalTime()));

                        // Kiểm tra slot có bị đặt trùng với booking nào không
                        boolean isBooked = blockingBookings.stream()
                                        .anyMatch(booking -> booking.getStartTime().isBefore(slotEnd)
                                                        && booking.getEndTime().isAfter(currentSlotStart));

                        // Tính giá cho slot
                        PricingService.SlotPrice slotPrice = pricingService.getSlotPrice(
                                        priceConfig,
                                        businessConfig,
                                        currentSlotStart,
                                        slotEnd);

                        // Xác định trạng thái slot
                        SlotStatus status;

                        if (isPast) {
                                status = SlotStatus.PAST;
                        } else if (isBooked) {
                                status = SlotStatus.BOOKED;
                        } else {
                                status = SlotStatus.AVAILABLE;
                        }

                        // Thêm slot vào danh sách kết quả
                        slots.add(new TimeSlotResponse(
                                        currentSlotStart,
                                        slotEnd,
                                        status,
                                        slotPrice.isPeak(),
                                        slotPrice.hourlyPrice()));
                }

                return new CourtAvailabilityResponse(courtId, date, slots);
        }

        private PriceConfig getPriceConfig(Court court) {
                return priceConfigRepo.findByCourtType(court.getCourtType())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Chưa có cấu hình giá cho loại sân: "
                                                                + court.getCourtType()));
        }

        private BusinessHourConfig getBusinessHourConfig() {
                return businessHourConfigRepo.findById((short) 1)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Chưa có cấu hình giờ hoạt động"));
        }

        private CourtResponse toCourtResponse(
                        Court court,
                        PriceConfig priceConfig) {

                return new CourtResponse(
                                court.getId(),
                                court.getName(),
                                court.getCourtType(),
                                court.getImageUrl(),
                                court.getDescription(),
                                court.getStatus(),
                                priceConfig.getPriceNormalHour(),
                                priceConfig.getPricePeakHour());
        }
}