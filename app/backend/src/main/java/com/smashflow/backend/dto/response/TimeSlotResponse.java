package com.smashflow.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalTime;

import com.smashflow.backend.model.enums.SlotStatus;

public record TimeSlotResponse(
        LocalTime startTime,
        LocalTime endTime,
        SlotStatus status,
        boolean isPeak,
        BigDecimal price) {
}