package com.smashflow.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.request.recurringBooking.CancelRecurringBookingRequest;
import com.smashflow.backend.dto.request.recurringBooking.StaffCreateRecurringBookingRequest;
import com.smashflow.backend.dto.response.recurringBooking.RecurringBookingDetailResponse;
import com.smashflow.backend.dto.response.recurringBooking.RecurringBookingResponse;
import com.smashflow.backend.service.CustomUserDetails;
import com.smashflow.backend.service.RecurringBookingManagementService;
import com.smashflow.backend.service.RecurringBookingService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * API gói lịch cố định dành cho Nhân viên / Quản lý.
 * Phân quyền STAFF, MANAGER theo /api/v1/staff/** trong SecurityConfig.
 * Thao tác từng buổi (check-in, thu đủ tiền, hoàn thành, no-show) dùng
 * StaffBookingController.
 **/
@RestController
@RequestMapping("/api/v1/staff/recurring-bookings")
@RequiredArgsConstructor
public class StaffRecurringBookingController {

    private final RecurringBookingManagementService recurringService;
    private final RecurringBookingService recurringBookingService;

    @GetMapping
    public ResponseEntity<List<RecurringBookingDetailResponse>> getAll() {
        return ResponseEntity.ok(recurringService.getAllRecurringBookings());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecurringBookingDetailResponse> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(recurringService.getRecurringBookingDetail(id));
    }

    // Xác nhận đã nhận tiền sân trọn gói
    @PatchMapping("/{id}/confirm")
    public ResponseEntity<RecurringBookingDetailResponse> confirm(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.ok(
                recurringService.confirmRecurringBooking(id, currentUser.getUserId()));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<RecurringBookingDetailResponse> cancel(
            @PathVariable Long id,
            @Valid @RequestBody CancelRecurringBookingRequest request) {
        return ResponseEntity.ok(recurringService.cancelRecurringBooking(id, request.reason()));
    }

    // Tạo gói lịch cố định tại quầy: khách lấy từ body, nhân viên lấy từ token
    @PostMapping
    public ResponseEntity<RecurringBookingResponse> create(
            @Valid @RequestBody StaffCreateRecurringBookingRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recurringBookingService.createRecurringBookingByStaff(request, currentUser.getUserId()));
    }
}
