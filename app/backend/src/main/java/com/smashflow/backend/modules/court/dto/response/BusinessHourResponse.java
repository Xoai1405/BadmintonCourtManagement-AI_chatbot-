package com.smashflow.backend.modules.court.dto.response;

import java.time.LocalTime;

public record BusinessHourResponse(
                LocalTime openingTime,
                LocalTime closingTime,
                LocalTime peakStartTime,
                LocalTime peakEndTime) {
}
