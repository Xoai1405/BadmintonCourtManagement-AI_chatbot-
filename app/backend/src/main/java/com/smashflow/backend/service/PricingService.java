package com.smashflow.backend.service;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

import org.springframework.stereotype.Service;

import com.smashflow.backend.exception.ResourceNotFoundException;
import com.smashflow.backend.model.PriceConfig;
import com.smashflow.backend.model.enums.CourtType;
import com.smashflow.backend.repository.PriceConfigRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PricingService {

    private final PriceConfigRepository priceConfigRepo;

    public SlotPrice getSlotPrice(
            CourtType courtType,
            LocalTime startTime,
            LocalTime endTime) {

        List<PriceConfig> configs = priceConfigRepo.findByCourtTypeOrderByStartTimeAsc(
                courtType);

        PriceConfig config = configs.stream()
                .filter(item -> !startTime.isBefore(item.getStartTime())
                        && !endTime.isAfter(item.getEndTime()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Chưa có cấu hình giá cho khung giờ "
                                + startTime + " - " + endTime));

        BigDecimal hourlyPrice = config.isPeakHour()
                ? config.getPricePeakHour()
                : config.getPriceNormalHour();

        return new SlotPrice(hourlyPrice, config.isPeakHour());
    }

    public BigDecimal calculateCourtPrice(
            CourtType courtType,
            LocalTime startTime,
            LocalTime endTime) {

        BigDecimal total = BigDecimal.ZERO;

        for (LocalTime slotStart = startTime; slotStart.isBefore(endTime); slotStart = slotStart.plusMinutes(30)) {

            LocalTime slotEnd = slotStart.plusMinutes(30);

            SlotPrice slotPrice = getSlotPrice(
                    courtType,
                    slotStart,
                    slotEnd);

            // price đang là giá mỗi giờ, slot là 30 phút
            total = total.add(
                    slotPrice.hourlyPrice()
                            .divide(BigDecimal.valueOf(2)));
        }

        return total;
    }

    public record SlotPrice(
            BigDecimal hourlyPrice,
            boolean isPeak) {
    }
}