package com.smashflow.backend.service;

import java.math.BigDecimal;
import java.time.LocalTime;

import org.springframework.stereotype.Service;

import com.smashflow.backend.exception.ResourceNotFoundException;
import com.smashflow.backend.model.BusinessHourConfig;
import com.smashflow.backend.model.PriceConfig;
import com.smashflow.backend.model.enums.CourtType;
import com.smashflow.backend.repository.BusinessHourConfigRepository;
import com.smashflow.backend.repository.PriceConfigRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PricingService {

        private final PriceConfigRepository priceConfigRepo;
        private final BusinessHourConfigRepository businessHourConfigRepo;

        public SlotPrice getSlotPrice(
                        CourtType courtType,
                        LocalTime startTime,
                        LocalTime endTime) {

                PriceConfig priceConfig = getPriceConfig(courtType);
                BusinessHourConfig businessConfig = getBusinessHourConfig();

                return calculateSlotPrice(
                                priceConfig,
                                businessConfig,
                                startTime,
                                endTime);
        }

        public SlotPrice getSlotPrice(
                        PriceConfig priceConfig,
                        BusinessHourConfig businessConfig,
                        LocalTime startTime,
                        LocalTime endTime) {

                return calculateSlotPrice(
                                priceConfig,
                                businessConfig,
                                startTime,
                                endTime);
        }

        public BigDecimal calculateCourtPrice(
                        CourtType courtType,
                        LocalTime startTime,
                        LocalTime endTime) {

                PriceConfig priceConfig = getPriceConfig(courtType);
                BusinessHourConfig businessConfig = getBusinessHourConfig();

                BigDecimal total = BigDecimal.ZERO;

                for (LocalTime slotStart = startTime; slotStart
                                .isBefore(endTime); slotStart = slotStart.plusMinutes(30)) {
                        LocalTime slotEnd = slotStart.plusMinutes(30);

                        SlotPrice slotPrice = calculateSlotPrice(
                                        priceConfig,
                                        businessConfig,
                                        slotStart,
                                        slotEnd);

                        // Giá lưu theo giờ, mỗi slot kéo dài 30 phút.
                        BigDecimal priceForSlot = slotPrice.hourlyPrice()
                                        .divide(BigDecimal.valueOf(2));

                        total = total.add(priceForSlot);
                }

                return total;
        }

        private PriceConfig getPriceConfig(CourtType courtType) {
                return priceConfigRepo.findByCourtType(courtType)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Chưa có cấu hình giá cho loại sân: " + courtType));
        }

        private BusinessHourConfig getBusinessHourConfig() {
                return businessHourConfigRepo.findById((short) 1)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Chưa có cấu hình giờ hoạt động của hệ thống"));
        }

        private SlotPrice calculateSlotPrice(
                        PriceConfig priceConfig,
                        BusinessHourConfig businessConfig,
                        LocalTime startTime,
                        LocalTime endTime) {

                boolean isPeak = isPeakSlot(
                                startTime,
                                endTime,
                                businessConfig);

                BigDecimal hourlyPrice = isPeak
                                ? priceConfig.getPricePeakHour()
                                : priceConfig.getPriceNormalHour();

                return new SlotPrice(hourlyPrice, isPeak);
        }

        private boolean isPeakSlot(
                        LocalTime startTime,
                        LocalTime endTime,
                        BusinessHourConfig businessConfig) {

                return !startTime.isBefore(businessConfig.getPeakStartTime())
                                && !endTime.isAfter(businessConfig.getPeakEndTime());
        }

        public record SlotPrice(
                        BigDecimal hourlyPrice,
                        boolean isPeak) {
        }
}