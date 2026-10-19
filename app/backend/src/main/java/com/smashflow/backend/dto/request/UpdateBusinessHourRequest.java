package com.smashflow.backend.dto.request;

import java.time.LocalTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateBusinessHourRequest(
        @NotNull LocalTime openingTime,
        @NotNull LocalTime closingTime,
        @NotNull LocalTime peakStartTime,
        @NotNull LocalTime peakEndTime

) {
}
