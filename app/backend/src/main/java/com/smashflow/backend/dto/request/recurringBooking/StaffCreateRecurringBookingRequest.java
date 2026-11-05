package com.smashflow.backend.dto.request.recurringBooking;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.smashflow.backend.model.DayOfWeek;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * Nhân viên tạo gói lịch cố định tại quầy cho khách.
 * Khách hàng lấy từ customerId trong body, nhân viên lấy từ token đăng nhập.
 */
public record StaffCreateRecurringBookingRequest(
        @NotNull(message = "Vui lòng chọn khách hàng")
        Long customerId,

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
        LocalDate endDate,

        // DB chỉ cho phép 'CASH' hoặc 'BANK_TRANSFER' (chk_payment_method)
        @NotBlank(message = "Vui lòng chọn phương thức thanh toán")
        @Pattern(regexp = "CASH|BANK_TRANSFER", message = "Phương thức thanh toán chỉ nhận CASH hoặc BANK_TRANSFER")
        String paymentMethod) {

    // Dùng lại logic preview (check trùng lịch + tính tiền) của RecurringBookingService
    public RecurringBookingPreviewRequest toPreviewRequest() {
        return new RecurringBookingPreviewRequest(courtId, startTime, endTime, daysOfWeek, startDate, endDate);
    }
}
