package com.smashflow.backend.modules.booking.recurring.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;

public record SingleConflictResponse(
        LocalDate date,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime) {

}