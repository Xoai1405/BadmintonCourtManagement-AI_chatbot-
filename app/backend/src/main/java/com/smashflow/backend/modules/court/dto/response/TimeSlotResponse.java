package com.smashflow.backend.modules.court.dto.response;

import java.math.BigDecimal;
import java.time.LocalTime;

import com.smashflow.backend.modules.booking.single.model.enums.SlotStatus;

public record TimeSlotResponse(
                LocalTime startTime,
                LocalTime endTime,
                SlotStatus status,
                boolean isPeak,
                BigDecimal price) {
}