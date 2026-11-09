package com.smashflow.backend.modules.pricing.dto.response;

import java.math.BigDecimal;

import com.smashflow.backend.modules.pricing.model.enums.DiscountStatus;

public record DiscountConfigResponse(
                Long id,
                Integer minMonths,
                BigDecimal discountPercent,
                DiscountStatus status) {

}
