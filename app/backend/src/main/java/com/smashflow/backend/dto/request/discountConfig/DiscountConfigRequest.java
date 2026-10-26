package com.smashflow.backend.dto.request.discountConfig;

import com.smashflow.backend.model.enums.DiscountStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record DiscountConfigRequest(
    @NotNull(message = "Số tháng tối thiểu không được để trống")
    @Min(value = 0, message = "Số tháng tối thiểu phải từ 1 trở lên")
    Integer minMonths,

    @NotNull(message = "Phần trăm chiết khấu không được để trống")
    @DecimalMin(value = "0.0", message = "Chiết khấu tối thiểu là 0%")
    @DecimalMax(value = "100.0", message = "Chiết khấu tối đa là 100%")
    BigDecimal discountPercent,

    @NotNull(message = "Trạng thái không được để trống")
    DiscountStatus status
) {

}