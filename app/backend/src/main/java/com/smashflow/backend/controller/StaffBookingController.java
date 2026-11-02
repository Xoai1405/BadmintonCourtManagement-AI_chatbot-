package com.smashflow.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.response.StaffBookingResponse;
import com.smashflow.backend.service.BookingService;
import com.smashflow.backend.service.CustomUserDetails;

import lombok.RequiredArgsConstructor;

/**
 * API booking lẻ dành cho Nhân viên / Quản lý.
 * Phân quyền STAFF, MANAGER được cấu hình trong SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/staff/bookings")
@RequiredArgsConstructor
public class StaffBookingController {

        private final BookingService bookingService;

        @GetMapping
        public ResponseEntity<List<StaffBookingResponse>> getBookings() {
                return ResponseEntity.ok(bookingService.getStaffBookings());
        }

        @GetMapping("/{bookingId}")
        public ResponseEntity<StaffBookingResponse> getBookingDetail(
                        @PathVariable Long bookingId) {
                return ResponseEntity.ok(bookingService.getStaffBookingDetail(bookingId));
        }

        @PatchMapping("/{bookingId}/confirm")
        public ResponseEntity<StaffBookingResponse> confirmBooking(
                        @PathVariable Long bookingId,
                        @AuthenticationPrincipal CustomUserDetails currentUser) {
                return ResponseEntity.ok(
                                bookingService.confirmBooking(bookingId, currentUser.getUserId()));
        }

        @PatchMapping("/{bookingId}/check-in")
        public ResponseEntity<StaffBookingResponse> checkIn(@PathVariable Long bookingId) {
                return ResponseEntity.ok(bookingService.checkInBooking(bookingId));
        }

        // Xác nhận thu đủ tiền (kết toán)
        @PatchMapping("/{bookingId}/settle")
        public ResponseEntity<StaffBookingResponse> settle(@PathVariable Long bookingId) {
                return ResponseEntity.ok(bookingService.settleBooking(bookingId));
        }

        @PatchMapping("/{bookingId}/complete")
        public ResponseEntity<StaffBookingResponse> complete(@PathVariable Long bookingId) {
                return ResponseEntity.ok(bookingService.completeBooking(bookingId));
        }

        @PatchMapping("/{bookingId}/no-show")
        public ResponseEntity<StaffBookingResponse> noShow(@PathVariable Long bookingId) {
                return ResponseEntity.ok(bookingService.noShowBooking(bookingId));
        }
}
