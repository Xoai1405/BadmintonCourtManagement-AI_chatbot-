package com.smashflow.backend.dto.response;

import com.smashflow.backend.model.enums.DiscountStatus;
import java.math.BigDecimal;

public record DiscountConfigResponse(
        Long id,
        Integer minMonths,
        BigDecimal discountPercent,
        DiscountStatus discountStatus
) {

}