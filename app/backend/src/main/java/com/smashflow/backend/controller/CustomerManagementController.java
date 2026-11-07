package com.smashflow.backend.controller;

import com.smashflow.backend.dto.response.customer.CustomerResponse;
import com.smashflow.backend.service.CustomerManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
public class CustomerManagementController {

    private final CustomerManagementService customerManagementService;

    // 1. Tìm kiếm và lấy danh sách khách hàng
    @GetMapping
    public ResponseEntity<List<CustomerResponse>> getCustomers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String email
    ) {
        return ResponseEntity.ok(customerManagementService.getCustomers(name, phone, email));
    }

    // 2. Lấy danh sách booking lịch sử của khách hàng
    @GetMapping("/{id}/bookings")
    public ResponseEntity<List<java.util.Map<String, Object>>> getCustomerBookings(@PathVariable Long id) {
        return ResponseEntity.ok(customerManagementService.getCustomerBookings(id));
    }

    // 3. Lấy chi tiết 1 booking hoặc gói cố định
    @GetMapping("/bookings/{bookingId}/detail")
    public ResponseEntity<java.util.Map<String, Object>> getBookingDetail(@PathVariable Long bookingId) {
        return ResponseEntity.ok(customerManagementService.getBookingDetail(bookingId));
    }
}