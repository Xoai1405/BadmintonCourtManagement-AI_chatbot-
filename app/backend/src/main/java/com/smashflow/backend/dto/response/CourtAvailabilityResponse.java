package com.smashflow.backend.dto.response;

import java.time.LocalDate;
import java.util.List;

public record CourtAvailabilityResponse(
        Long courtId,
        LocalDate date,
        List<TimeSlotResponse> slots) {
}