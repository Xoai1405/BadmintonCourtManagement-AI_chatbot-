package com.smashflow.backend.modules.booking.staff.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.modules.booking.single.service.BookingService;
import com.smashflow.backend.modules.booking.addon.dto.BookingServiceRequest;
import com.smashflow.backend.modules.booking.addon.service.BookingAddonService;
import com.smashflow.backend.modules.booking.single.dto.request.CancelBookingRequest;
import com.smashflow.backend.modules.booking.single.dto.request.RescheduleBookingRequest;
import com.smashflow.backend.modules.booking.staff.dto.request.StaffCreateBookingRequest;
import com.smashflow.backend.modules.booking.staff.dto.response.StaffBookingResponse;
import com.smashflow.backend.modules.identity.security.userdetails.CustomUserDetails;

import jakarta.validation.Valid;
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
        private final BookingAddonService addonService;

        @PostMapping("/{bookingId}/services")
        public ResponseEntity<StaffBookingResponse> addService(@PathVariable Long bookingId,
                        @Valid @RequestBody BookingServiceRequest request) {
                addonService.add(bookingId, request);
                return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.getStaffBookingDetail(bookingId));
        }

        @DeleteMapping("/{bookingId}/services/{serviceId}")
        public StaffBookingResponse removeService(@PathVariable Long bookingId, @PathVariable Long serviceId) {
                addonService.remove(bookingId, serviceId);
                return bookingService.getStaffBookingDetail(bookingId);
        }

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

        @PatchMapping("/{bookingId}/cancel")
        public ResponseEntity<StaffBookingResponse> cancel(
                        @PathVariable Long bookingId,
                        @Valid @RequestBody CancelBookingRequest request) {
                return ResponseEntity.ok(bookingService.cancelBookingByStaff(bookingId, request.reason()));
        }

        @PatchMapping("/{bookingId}/reschedule")
        public ResponseEntity<StaffBookingResponse> reschedule(
                        @PathVariable Long bookingId,
                        @Valid @RequestBody RescheduleBookingRequest request) {
                return ResponseEntity.ok(bookingService.rescheduleBookingByStaff(bookingId, request));
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

        // Tạo booking lẻ tại quầy: khách lấy từ body, nhân viên lấy từ token
        @PostMapping
        public ResponseEntity<StaffBookingResponse> createBooking(
                        @Valid @RequestBody StaffCreateBookingRequest request,
                        @AuthenticationPrincipal CustomUserDetails currentUser) {
                return ResponseEntity.status(HttpStatus.CREATED)
                                .body(bookingService.createBookingByStaff(request, currentUser.getUserId()));
        }
}
