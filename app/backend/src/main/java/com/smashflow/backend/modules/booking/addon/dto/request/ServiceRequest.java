package com.smashflow.backend.modules.booking.addon.dto.request;

import java.math.BigDecimal;
import com.smashflow.backend.modules.booking.addon.enums.Category;
import jakarta.validation.constraints.NotNull;

public record ServiceRequest(String name, @NotNull Category category, @NotNull BigDecimal unitPrice) {
}
