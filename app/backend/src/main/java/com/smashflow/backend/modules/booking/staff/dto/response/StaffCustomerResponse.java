package com.smashflow.backend.modules.booking.staff.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Thông tin khách hàng hiển thị ở màn hình tạo booking tại quầy.
 * totalBookings = số booking lẻ + số gói lịch cố định (không tính đã hủy).
 */
public record StaffCustomerResponse(
                Long userId,
                String fullName,
                String phoneNumber,
                String email,
                String status,
                long totalBookings,
                // Giữ đúng tên "isFrequent" trong JSON cho frontend
                @JsonProperty("isFrequent") boolean isFrequent) {
}
