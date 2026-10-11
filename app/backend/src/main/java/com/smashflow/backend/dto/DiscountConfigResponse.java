package com.smashflow.backend.dto;

import com.smashflow.backend.model.enums.DiscountStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiscountConfigResponse {
    private Long id;
    private Integer minMonths;
    private BigDecimal discountPercent;
    private DiscountStatus discountStatus;
}
