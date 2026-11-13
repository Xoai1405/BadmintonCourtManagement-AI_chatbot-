package com.smashflow.backend.modules.booking.staff.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.modules.booking.staff.dto.response.StaffCustomerResponse;
import com.smashflow.backend.modules.booking.staff.service.StaffCustomerService;

import lombok.RequiredArgsConstructor;

/**
 * Tìm khách hàng cho màn hình tạo booking tại quầy.
 * Phân quyền STAFF, MANAGER theo /api/v1/staff/** trong SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/staff/customers")
@RequiredArgsConstructor
public class StaffCustomerController {

    private final StaffCustomerService staffCustomerService;

    /**
     * GET /api/v1/staff/customers?name=&phone=&email=
     * Các tham số đều không bắt buộc, tìm gần đúng, không phân biệt hoa thường.
     */
    @GetMapping
    public ResponseEntity<List<StaffCustomerResponse>> searchCustomers(
            @RequestParam(defaultValue = "") String name,
            @RequestParam(defaultValue = "") String phone,
            @RequestParam(defaultValue = "") String email) {
        return ResponseEntity.ok(staffCustomerService.searchCustomers(name, phone, email));
    }
}
