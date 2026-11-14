package com.smashflow.backend.modules.booking.addon.dto;

import com.smashflow.backend.modules.booking.addon.enums.ServiceStatus;
import jakarta.validation.constraints.NotNull;

public record ServiceStatusRequest(@NotNull ServiceStatus status) {
}
