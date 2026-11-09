package com.smashflow.backend.modules.pricing.dto.response;

import java.math.BigDecimal;

import com.smashflow.backend.modules.court.model.enums.CourtType;

public record PriceConfigResponse(
        Long id,
        CourtType courtType,
        BigDecimal priceNormalHour,
        BigDecimal pricePeakHour) {

}
