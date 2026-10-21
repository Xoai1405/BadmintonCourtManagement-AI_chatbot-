package com.smashflow.backend.dto.request;

import java.math.BigDecimal;

import com.smashflow.backend.model.enums.CourtType;

import jakarta.validation.constraints.NotNull;

public record UpdatePriceConfigRequest(
        @NotNull CourtType courtType,
        @NotNull BigDecimal priceNormalHour,
        @NotNull BigDecimal pricePeakHour

) {

}
