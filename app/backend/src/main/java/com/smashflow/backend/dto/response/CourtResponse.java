package com.smashflow.backend.dto.response;

import java.math.BigDecimal;

import com.smashflow.backend.model.enums.CourtStatus;
import com.smashflow.backend.model.enums.CourtType;

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