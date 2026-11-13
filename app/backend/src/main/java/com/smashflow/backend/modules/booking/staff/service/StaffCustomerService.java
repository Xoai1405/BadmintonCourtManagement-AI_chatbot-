package com.smashflow.backend.modules.booking.staff.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.booking.staff.dto.response.StaffCustomerResponse;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.model.enums.Role;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

/**
 * Tìm khách hàng cho màn hình tạo booking tại quầy (nhân viên).
 */
@Service
@RequiredArgsConstructor
public class StaffCustomerService {

    // Từ 3 lượt đặt trở lên được xem là khách quen
    private static final long FREQUENT_CUSTOMER_THRESHOLD = 3;
    private static final int MAX_RESULTS = 50;

    private final UserRepository userRepo;
    private final BookingRepository bookingRepo;

    /**
     * Tìm khách theo tên / SĐT / email (gần đúng, không phân biệt hoa thường),
     * kèm số lượt đặt và cờ khách quen. Tham số null hoặc rỗng = bỏ qua điều kiện đó.
     */
    @Transactional(readOnly = true)
    public List<StaffCustomerResponse> searchCustomers(String name, String phone, String email) {

        List<User> customers = userRepo.searchCustomers(
                Role.CUSTOMER,
                normalizeText(name),
                normalizePhone(phone),
                normalizeText(email),
                PageRequest.of(0, MAX_RESULTS));

        if (customers.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> bookingCounts = countBookings(customers);

        return customers.stream()
                .map(user -> toResponse(user, bookingCounts.getOrDefault(user.getId(), 0L)))
                .toList();
    }

    // Đếm lượt đặt của tất cả khách trong 1 query (tránh N+1)
    private Map<Long, Long> countBookings(List<User> customers) {
        List<Long> customerIds = customers.stream().map(User::getId).toList();
        Map<Long, Long> bookingCounts = new HashMap<>();
        for (Object[] row : bookingRepo.countBookingsByCustomerIds(customerIds, BookingStatus.CANCELLED)) {
            bookingCounts.put((Long) row[0], ((Number) row[1]).longValue());
        }
        return bookingCounts;
    }

    private StaffCustomerResponse toResponse(User user, long totalBookings) {
        return new StaffCustomerResponse(
                user.getId(),
                user.getFullName(),
                user.getPhoneNumber(),
                user.getEmail(),
                user.getStatus() == null ? null : user.getStatus().name(),
                totalBookings,
                totalBookings >= FREQUENT_CUSTOMER_THRESHOLD);
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim();
    }

    // Bỏ ký tự không phải số và đầu số 0 / 84 để "0914..." khớp cả "+84914..."
    private String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("\\D", "").replaceFirst("^(84|0)", "");
    }
}
