package com.smashflow.backend.dto.request;

import com.smashflow.backend.model.DayOfWeek;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record RecurringBookingPreviewRequest(
        @NotNull(message = "ID sân không được để trống")
        Long courtId,

        @NotNull(message = "Thời gian bắt đầu không được để trống")
        LocalTime startTime,

        @NotNull(message = "Thời gian kết thúc không được để trống")
        LocalTime endTime,

        @NotEmpty(message = "Phải chọn ít nhất một ngày trong tuần")
        List<DayOfWeek> daysOfWeek,

        @NotNull(message = "Ngày bắt đầu chu kỳ không được để trống")
        @FutureOrPresent(message = "Ngày bắt đầu phải từ hôm nay trở đi")
        LocalDate startDate,

        @NotNull(message = "Ngày kết thúc chu kỳ không được để trống")
        LocalDate endDate
) {

}