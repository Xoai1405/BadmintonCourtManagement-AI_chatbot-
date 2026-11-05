package com.smashflow.backend.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.response.StaffCustomerResponse;
import com.smashflow.backend.model.User;
import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.Role;
import com.smashflow.backend.repository.BookingRepository;
import com.smashflow.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Tìm khách hàng cho màn hình tạo booking tại quầy.
 * Phân quyền STAFF, MANAGER theo /api/v1/staff/** trong SecurityConfig.
 */
@RestController
@RequestMapping("/api/v1/staff/customers")
@RequiredArgsConstructor
public class StaffCustomerController {

    // Từ 3 lượt đặt trở lên được xem là khách quen
    private static final long FREQUENT_CUSTOMER_THRESHOLD = 3;
    private static final int MAX_RESULTS = 50;

    private final UserRepository userRepo;
    private final BookingRepository bookingRepo;

    /**
     * GET /api/v1/staff/customers?name=&phone=&email=
     * Các tham số đều không bắt buộc, tìm gần đúng, không phân biệt hoa thường.
     */
    @GetMapping
    public ResponseEntity<List<StaffCustomerResponse>> searchCustomers(
            @RequestParam(defaultValue = "") String name,
            @RequestParam(defaultValue = "") String phone,
            @RequestParam(defaultValue = "") String email) {

        List<User> customers = userRepo.searchCustomers(
                Role.CUSTOMER,
                name.trim(),
                // Bỏ ký tự không phải số và đầu số 0 / 84 để "0914..." khớp cả "+84914..."
                phone.replaceAll("\\D", "").replaceFirst("^(84|0)", ""),
                email.trim(),
                PageRequest.of(0, MAX_RESULTS));

        if (customers.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        // Đếm lượt đặt của tất cả khách trong 1 query (tránh N+1)
        Map<Long, Long> bookingCounts = new HashMap<>();
        List<Long> customerIds = customers.stream().map(User::getId).toList();
        for (Object[] row : bookingRepo.countBookingsByCustomerIds(customerIds, BookingStatus.CANCELLED)) {
            bookingCounts.put((Long) row[0], ((Number) row[1]).longValue());
        }

        List<StaffCustomerResponse> response = customers.stream()
                .map(user -> {
                    long total = bookingCounts.getOrDefault(user.getId(), 0L);
                    return new StaffCustomerResponse(
                            user.getId(),
                            user.getFullName(),
                            user.getPhoneNumber(),
                            user.getEmail(),
                            user.getStatus() == null ? null : user.getStatus().name(),
                            total,
                            total >= FREQUENT_CUSTOMER_THRESHOLD);
                })
                .toList();

        return ResponseEntity.ok(response);
    }
}
