package com.smashflow.backend.controller;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.request.CreateBookingRequest;
import com.smashflow.backend.dto.response.BookingDetailResponse;
import com.smashflow.backend.dto.response.BookingResponse;
import com.smashflow.backend.model.Booking;
import com.smashflow.backend.service.BookingService;
import com.smashflow.backend.service.CustomUserDetails;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

        private final BookingService bookingService;
        // private final CustomUserDetails userDetails;

        @PostMapping
        public ResponseEntity<BookingResponse> createBooking(
                        @Valid @RequestBody CreateBookingRequest request,
                        @AuthenticationPrincipal CustomUserDetails currentUser) {

                Booking booking = bookingService.createBooking(
                                request,
                                currentUser.getUserId());

                BookingResponse response = new BookingResponse(
                                booking.getId(),
                                booking.getBookingCode(),
                                booking.getCourt().getId(),
                                booking.getCourt().getName(),
                                booking.getCourt().getCourtType(),
                                booking.getCourt().getImageUrl(),
                                booking.getBookingDate(),
                                booking.getStartTime(),
                                booking.getEndTime(),
                                booking.getCourtPrice(),
                                booking.getTotalAmount(),
                                booking.getBookingStatus(),
                                booking.getPaymentStatus(),
                                booking.getExpireAt());

                return ResponseEntity.status(HttpStatus.CREATED).body(response);
        }

        @GetMapping("/me")
        public ResponseEntity<List<BookingResponse>> getBooking(
                        @AuthenticationPrincipal CustomUserDetails currentUser) {
                List<BookingResponse> res = new ArrayList<>();
                res = bookingService.getBooking(currentUser.getUserId());
                return ResponseEntity.status(HttpStatus.OK).body(res);
        }

        @GetMapping("/detail/{bookingId}")
        public ResponseEntity<BookingDetailResponse> getBookingDetail(
                        @PathVariable Long bookingId,
                        @AuthenticationPrincipal CustomUserDetails currentUser) {

                BookingDetailResponse response = bookingService.getBookingDetail(
                                bookingId,
                                currentUser.getUserId());

                return ResponseEntity.ok(response);
        }

}