package com.smashflow.backend.modules.booking.addon.dto;

import java.math.BigDecimal;
import com.smashflow.backend.modules.booking.addon.enums.Category;
import com.smashflow.backend.modules.booking.addon.enums.ServiceStatus;

public record ServiceResponse(Long serviceId, String name, Category category, BigDecimal unitPrice,
        ServiceStatus status) {
}
