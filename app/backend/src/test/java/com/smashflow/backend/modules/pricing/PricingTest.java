package com.smashflow.backend.modules.pricing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.model.enums.CourtType;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.pricing.model.PriceConfig;
import com.smashflow.backend.modules.pricing.repository.PriceConfigRepository;
import com.smashflow.backend.modules.pricing.service.PricingService;

@ExtendWith(MockitoExtension.class)
class PricingTest {

    @Mock
    private PriceConfigRepository priceConfigRepo;

    @Mock
    private BusinessHourConfigRepository businessHourConfigRepo;

    @InjectMocks
    private PricingService pricingService;

    private PriceConfig priceConfig;
    private BusinessHourConfig businessConfig;

    @BeforeEach
    void setUp() {
        businessConfig = new BusinessHourConfig();
        businessConfig.setOpeningTime(LocalTime.of(5, 0));
        businessConfig.setClosingTime(LocalTime.of(23, 0));
        businessConfig.setPeakStartTime(LocalTime.of(17, 0));
        businessConfig.setPeakEndTime(LocalTime.of(20, 0));

        priceConfig = new PriceConfig();
        priceConfig.setCourtType(CourtType.STANDARD_INDOOR);
        priceConfig.setPriceNormalHour(new BigDecimal("100000"));
        priceConfig.setPricePeakHour(new BigDecimal("160000"));
    }

    @Test
    @DisplayName("Giá 1: Tính phí khung giờ thường (08:00 - 10:00, 2 tiếng) -> 200.000đ")
    void testCalculateCourtPrice_NormalHours() {
        when(priceConfigRepo.findByCourtType(CourtType.STANDARD_INDOOR)).thenReturn(Optional.of(priceConfig));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));

        BigDecimal price = pricingService.calculateCourtPrice(
                CourtType.STANDARD_INDOOR, LocalTime.of(8, 0), LocalTime.of(10, 0));

        assertEquals(new BigDecimal("200000"), price);
    }

    @Test
    @DisplayName("Giá 2: Tính phí khung giờ cao điểm (18:00 - 20:00, 2 tiếng) -> 320.000đ")
    void testCalculateCourtPrice_PeakHours() {
        when(priceConfigRepo.findByCourtType(CourtType.STANDARD_INDOOR)).thenReturn(Optional.of(priceConfig));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));

        BigDecimal price = pricingService.calculateCourtPrice(
                CourtType.STANDARD_INDOOR, LocalTime.of(18, 0), LocalTime.of(20, 0));

        assertEquals(new BigDecimal("320000"), price);
    }

    @Test
    @DisplayName("Giá 3: Tính phí vắt ngang giữa giờ thường và cao điểm (16:30 - 18:00, 1.5 tiếng) -> 210.000đ")
    void testCalculateCourtPrice_MixedHours() {
        when(priceConfigRepo.findByCourtType(CourtType.STANDARD_INDOOR)).thenReturn(Optional.of(priceConfig));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));

        BigDecimal price = pricingService.calculateCourtPrice(
                CourtType.STANDARD_INDOOR, LocalTime.of(16, 30), LocalTime.of(18, 0));

        assertEquals(new BigDecimal("210000"), price);
    }

    @Test
    @DisplayName("Giá 4: Báo lỗi khi chưa cấu hình giá cho loại sân")
    void testCalculateCourtPrice_PriceConfigNotFound_ShouldThrowException() {
        when(priceConfigRepo.findByCourtType(CourtType.STANDARD_INDOOR)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                pricingService.calculateCourtPrice(CourtType.STANDARD_INDOOR, LocalTime.of(8, 0), LocalTime.of(10, 0))
        );
    }

    @Test
    @DisplayName("Giá 5 (Biên): Báo lỗi khi thiếu cấu hình giờ hoạt động hệ thống")
    void testCalculateCourtPrice_BusinessHourNotFound_ShouldThrowException() {
        when(priceConfigRepo.findByCourtType(CourtType.STANDARD_INDOOR)).thenReturn(Optional.of(priceConfig));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                pricingService.calculateCourtPrice(CourtType.STANDARD_INDOOR, LocalTime.of(8, 0), LocalTime.of(10, 0))
        );

        assertTrue(ex.getMessage().contains("giờ hoạt động"));
    }
}