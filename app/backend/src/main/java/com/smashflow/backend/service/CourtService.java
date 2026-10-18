package com.smashflow.backend.service;

import java.sql.Time;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import java.time.ZoneId;

import com.smashflow.backend.dto.response.CourtAvailabilityResponse;
import com.smashflow.backend.dto.response.TimeSlotResponse;
import com.smashflow.backend.model.enums.SlotStatus;
import com.smashflow.backend.exception.ResourceNotFoundException;

import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.smashflow.backend.dto.response.CourtResponse;
import com.smashflow.backend.model.Court;
import com.smashflow.backend.model.PriceConfig;
import com.smashflow.backend.repository.BookingRepository;
import com.smashflow.backend.repository.CourtRepository;
import com.smashflow.backend.repository.PriceConfigRepository;
import com.smashflow.backend.model.Booking;
import com.smashflow.backend.model.enums.BookingStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CourtService {
    private final CourtRepository courtRepo;
    private final PriceConfigRepository priceConfigRepo;
    private final BookingRepository bookingRepo;

    public List<CourtResponse> getAllCourts() {
        List<Court> listCourt = courtRepo.findAll();
        List<CourtResponse> res = new ArrayList<>();
        for (Court x : listCourt) {
            List<PriceConfig> prices = priceConfigRepo.findByCourtType(x.getCourtType());

            if (prices.isEmpty()) {
                throw new ResourceNotFoundException(
                        "Không tìm thấy cấu hình giá cho sân ID: " + x.getId());
            }

            PriceConfig price = prices.get(0);

            res.add(new CourtResponse(
                    x.getId(),
                    x.getName(),
                    x.getCourtType(),
                    x.getImageUrl(),
                    x.getDescription(),
                    x.getStatus(),
                    price.getPriceNormalHour(),
                    price.getPricePeakHour()));

        }
        return res;
    }

    public CourtResponse getCourt(Long id) {
        Court res = courtRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tồn tại dữ liệu sân"));

        List<PriceConfig> prices = priceConfigRepo.findByCourtType(res.getCourtType());

        if (prices.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Không tìm thấy cấu hình giá cho sân ID: " + res.getId());
        }

        PriceConfig price = prices.get(0);
        return new CourtResponse(
                res.getId(),
                res.getName(),
                res.getCourtType(),
                res.getImageUrl(),
                res.getDescription(),
                res.getStatus(),
                price.getPriceNormalHour(),
                price.getPricePeakHour());

    }

    public CourtAvailabilityResponse getAvailability(Long courtId, LocalDate date) {
        Court court = courtRepo.findById(courtId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân"));

        List<PriceConfig> priceConfigs = priceConfigRepo.findByCourtTypeOrderByStartTimeAsc(
                court.getCourtType());

        if (priceConfigs.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Chưa có cấu hình giá cho sân này");
        }

        List<Booking> blockingBookings = bookingRepo.findByCourt_IdAndBookingDateAndBookingStatusIn(
                courtId,
                date,
                List.of(
                        BookingStatus.PENDING,
                        BookingStatus.CONFIRMED,
                        BookingStatus.CHECKED_IN));

        ZoneId vietnamZone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDateTime now = LocalDateTime.now(vietnamZone);

        List<TimeSlotResponse> slots = new ArrayList<>();

        for (LocalTime start = LocalTime.of(6, 0); start.isBefore(LocalTime.of(22, 0)); start = start.plusMinutes(30)) {

            LocalTime end = start.plusMinutes(30);

            LocalTime slotStart = start;
            LocalTime slotEnd = end;

            boolean isPast = date.isBefore(now.toLocalDate())
                    || (date.isEqual(now.toLocalDate())
                            && !slotStart.isAfter(now.toLocalTime()));

            boolean isBooked = blockingBookings.stream()
                    .anyMatch(booking -> booking.getStartTime().isBefore(slotEnd)
                            && booking.getEndTime().isAfter(slotStart));

            PriceConfig priceConfig = priceConfigs.stream()
                    .filter(config -> !slotStart.isBefore(config.getStartTime())
                            && !slotEnd.isAfter(config.getEndTime()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Chưa có cấu hình giá cho khung "
                                    + slotStart + " - " + slotEnd));

            boolean isPeak = priceConfig.isPeakHour();

            BigDecimal price = isPeak
                    ? priceConfig.getPricePeakHour()
                    : priceConfig.getPriceNormalHour();

            SlotStatus slotStatus;

            if (isPast) {
                slotStatus = SlotStatus.PAST;
            } else if (isBooked) {
                slotStatus = SlotStatus.BOOKED;
            } else {
                slotStatus = SlotStatus.AVAILABLE;
            }

            slots.add(new TimeSlotResponse(
                    slotStart,
                    slotEnd,
                    slotStatus,
                    isPeak,
                    price));
        }

        return new CourtAvailabilityResponse(courtId, date, slots);
    }
}