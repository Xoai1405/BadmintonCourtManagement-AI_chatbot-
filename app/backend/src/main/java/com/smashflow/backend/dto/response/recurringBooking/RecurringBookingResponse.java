package com.smashflow.backend.dto.response.recurringBooking;

import com.smashflow.backend.model.enums.RecurBookingStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record RecurringBookingResponse(
    Long recurringBookingId,

    String courtName,

    LocalTime startTime,

    LocalTime endTime,

    LocalDate startDate,

    LocalDate endDate,

    int totalSessions,

    BigDecimal discountPercent,

    BigDecimal totalPrice,

    String status
) {
}
