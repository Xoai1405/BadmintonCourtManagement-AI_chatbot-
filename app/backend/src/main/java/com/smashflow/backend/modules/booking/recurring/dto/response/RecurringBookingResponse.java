package com.smashflow.backend.modules.booking.recurring.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;

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

        String status) {
}
