package com.smashflow.backend.modules.booking.single.dto.request;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotNull;

/** Thời gian mới cho booking; sân và thời lượng được giữ nguyên. */
public record RescheduleBookingRequest(
        @NotNull(message = "Vui lòng chọn ngày chơi mới") LocalDate bookingDate,
        @NotNull(message = "Vui lòng chọn giờ bắt đầu mới") LocalTime startTime,
        @NotNull(message = "Vui lòng chọn giờ kết thúc mới") LocalTime endTime) {
}
