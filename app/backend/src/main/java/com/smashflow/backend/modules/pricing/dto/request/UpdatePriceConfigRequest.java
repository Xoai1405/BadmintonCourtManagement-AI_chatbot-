package com.smashflow.backend.modules.pricing.dto.request;

import java.math.BigDecimal;

import com.smashflow.backend.modules.court.model.enums.CourtType;

import jakarta.validation.constraints.NotNull;

public record UpdatePriceConfigRequest(
                @NotNull CourtType courtType,
                @NotNull BigDecimal priceNormalHour,
                @NotNull BigDecimal pricePeakHour

) {

}
