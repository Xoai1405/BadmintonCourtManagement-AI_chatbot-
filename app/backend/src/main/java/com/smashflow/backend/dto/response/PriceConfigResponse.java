package com.smashflow.backend.dto.response;

import java.math.BigDecimal;

import com.smashflow.backend.model.enums.CourtType;

public record PriceConfigResponse(
        Long id,
        CourtType courtType,
        BigDecimal priceNormalHour,
        BigDecimal pricePeakHour) {

}
