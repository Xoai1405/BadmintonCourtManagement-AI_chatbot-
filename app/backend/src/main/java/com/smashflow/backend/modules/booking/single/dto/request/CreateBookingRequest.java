package com.smashflow.backend.modules.booking.single.dto.request;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotNull;

public record CreateBookingRequest(
                @NotNull Long courtId,
                @NotNull LocalDate bookingDate,
                @NotNull LocalTime startTime,
                @NotNull LocalTime endTime) {
}