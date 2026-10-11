package com.smashflow.backend.dto.response.conflict;

import java.time.LocalDate;
import java.time.LocalTime;

public record SingleConflictResponse(
        LocalDate date,
        String dayOfWeek,
        LocalTime startTime,
        LocalTime endTime
) {

}