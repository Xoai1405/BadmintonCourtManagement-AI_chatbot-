package com.smashflow.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.CourtType;
import com.smashflow.backend.model.enums.PaymentStatus;

public record BookingResponse(
                Long id,
                String bookingCode,
                Long courtId,
                String courtName,
                CourtType courtType,
                String courtImageUrl,
                LocalDate bookingDate,
                LocalTime startTime,
                LocalTime endTime,
                BigDecimal courtPrice,
                BigDecimal totalAmount,
                BookingStatus bookingStatus,
                PaymentStatus paymentStatus,
                LocalDateTime expireAt) {
}