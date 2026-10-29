package com.smashflow.backend.controller;

import com.smashflow.backend.dto.request.recurringBooking.RecurringBookingPreviewRequest;
import com.smashflow.backend.dto.response.recurringBooking.RecurringBookingPreviewResponse;
import com.smashflow.backend.dto.response.recurringBooking.RecurringBookingResponse;
import com.smashflow.backend.service.CustomUserDetails;
import com.smashflow.backend.service.RecurringBookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recurring-bookings")
@RequiredArgsConstructor
public class RecurringBookingController {

    private final RecurringBookingService recurringBookingService;

    /**
     * SCRUM-19: Xem trước lịch đặt sân cố định — kiểm tra trùng lịch hàng loạt.
     * POST /api/recurring-bookings/preview
     * Request body: courtId, startTime, endTime, daysOfWeek[], startDate, endDate
     * Response: danh sách ngày trùng, tổng buổi, % chiết khấu, tổng tiền
     */
    @PostMapping("/preview")
    public ResponseEntity<RecurringBookingPreviewResponse> previewRecurringBooking(
            @Valid @RequestBody RecurringBookingPreviewRequest request) {

        RecurringBookingPreviewResponse response =
                recurringBookingService.previewRecurringBooking(request);

        return ResponseEntity.ok(response);
    }






    /**
     * SCRUM-31: Lưu đơn đặt lịch cố định vào Database
     * POST /api/recurring-bookings
     */
    @PostMapping
    public ResponseEntity<RecurringBookingResponse> createRecurringBooking(
            @Valid @RequestBody RecurringBookingPreviewRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {

        RecurringBookingResponse response = recurringBookingService.createRecurringBooking(
                request,
                currentUser.getUserId()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
