package com.smashflow.backend.modules.booking.recurring.controller;

import com.smashflow.backend.modules.booking.recurring.dto.request.RecurringBookingPreviewRequest;
import com.smashflow.backend.modules.booking.recurring.dto.response.RecurringBookingDetailResponse;
import com.smashflow.backend.modules.booking.recurring.dto.response.RecurringBookingPreviewResponse;
import com.smashflow.backend.modules.booking.recurring.dto.response.RecurringBookingResponse;
import com.smashflow.backend.modules.booking.recurring.service.RecurringBookingManagementService;
import com.smashflow.backend.modules.booking.recurring.service.RecurringBookingService;
import com.smashflow.backend.modules.identity.security.userdetails.CustomUserDetails;

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
        private final RecurringBookingManagementService recurringBookingManagementService;

        /**
         * Danh sách gói lịch cố định của khách đang đăng nhập.
         * GET /api/recurring-bookings/me
         */
        @GetMapping("/me")
        public ResponseEntity<java.util.List<RecurringBookingDetailResponse>> getMyRecurringBookings(
                        @AuthenticationPrincipal CustomUserDetails currentUser) {
                return ResponseEntity.ok(
                                recurringBookingManagementService.getMyRecurringBookings(currentUser.getUserId()));
        }

        /**
         * Chi tiết gói (kèm danh sách buổi) — khách chỉ xem được gói của mình.
         * GET /api/recurring-bookings/{id}
         */
        @GetMapping("/{id}")
        public ResponseEntity<RecurringBookingDetailResponse> getMyRecurringBookingDetail(
                        @PathVariable Long id,
                        @AuthenticationPrincipal CustomUserDetails currentUser) {
                return ResponseEntity.ok(
                                recurringBookingManagementService.getMyRecurringBookingDetail(id,
                                                currentUser.getUserId()));
        }

        @PatchMapping("/{id}/payment-submitted")
        public ResponseEntity<RecurringBookingDetailResponse> markPaymentSubmitted(
                        @PathVariable Long id,
                        @AuthenticationPrincipal CustomUserDetails currentUser) {
                return ResponseEntity.ok(recurringBookingManagementService.markPaymentSubmitted(id, currentUser.getUserId()));
        }

        /**
         * SCRUM-19: Xem trước lịch đặt sân cố định — kiểm tra trùng lịch hàng loạt.
         * POST /api/recurring-bookings/preview
         * Request body: courtId, startTime, endTime, daysOfWeek[], startDate, endDate
         * Response: danh sách ngày trùng, tổng buổi, % chiết khấu, tổng tiền
         */
        @PostMapping("/preview")
        public ResponseEntity<RecurringBookingPreviewResponse> previewRecurringBooking(
                        @Valid @RequestBody RecurringBookingPreviewRequest request) {

                RecurringBookingPreviewResponse response = recurringBookingService.previewRecurringBooking(request);

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
                                currentUser.getUserId());

                return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }
}
