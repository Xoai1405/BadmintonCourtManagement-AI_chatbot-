package com.smashflow.backend.modules.court.dto.response;

import java.math.BigDecimal;

import com.smashflow.backend.modules.court.model.enums.CourtStatus;
import com.smashflow.backend.modules.court.model.enums.CourtType;

public record CourtResponse(
        Long id,
        String name,
        CourtType courtType,
        String imageUrl,
        String description,
        CourtStatus status,
        BigDecimal priceNormalHour,
        BigDecimal pricePeakHour) {
}