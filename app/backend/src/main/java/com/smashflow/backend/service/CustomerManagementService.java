package com.smashflow.backend.service;

import com.smashflow.backend.dto.response.customer.CustomerResponse;
import com.smashflow.backend.model.Booking;
import com.smashflow.backend.model.User;
import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.PaymentStatus;
import com.smashflow.backend.model.enums.RecurBookingStatus;
import com.smashflow.backend.model.enums.Role;
import com.smashflow.backend.repository.BookingRepository;
import com.smashflow.backend.repository.RecurringBookingRepository;
import com.smashflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerManagementService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final RecurringBookingRepository recurringBookingRepository;

    private static final String DEFAULT_COURT_IMAGE = "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop";

    private static final List<PaymentStatus> PAID_STATUSES = List.of(
            PaymentStatus.PAID,
            PaymentStatus.SETTLED
    );

    // 1. Tìm kiếm và lấy danh sách khách hàng kèm thống kê
    public List<CustomerResponse> getCustomers(String name, String phone, String email) {
        String searchName = name != null ? name.trim() : "";
        String searchPhone = phone != null ? phone.trim() : "";
        String searchEmail = email != null ? email.trim() : "";

        List<User> customers = userRepository.searchCustomers(
                Role.CUSTOMER,
                searchName,
                searchPhone,
                searchEmail,
                Pageable.unpaged()
        );

        return customers.stream().map(customer -> {
            Long customerId = customer.getId();

            long singleBookingCount = bookingRepository
                    .findByCustomer_IdAndRecurringBookingIsNull(customerId)
                    .stream()
                    .filter(b -> b.getBookingStatus() != BookingStatus.CANCELLED)
                    .count();

            long recurringBookingCount = recurringBookingRepository
                    .countByCustomer_IdAndStatusNot(customerId, RecurBookingStatus.CANCELLED);

            long totalBookingCount = singleBookingCount + recurringBookingCount;

            BigDecimal totalSpending = bookingRepository.calculateTotalSpendingByCustomerId(
                    customerId,
                    PAID_STATUSES,
                    BookingStatus.CANCELLED
            );

            return new CustomerResponse(
                    customer.getId(),
                    customer.getFullName(),
                    customer.getPhoneNumber(),
                    customer.getEmail(),
                    customer.getStatus() != null ? customer.getStatus().name() : "ACTIVE",
                    totalBookingCount,
                    totalSpending != null ? totalSpending : BigDecimal.ZERO
            );
        }).toList();
    }

    // 2. Lấy danh sách lịch sử đặt sân của khách (gồm cả booking lẻ và các gói cố định)
    public List<java.util.Map<String, Object>> getCustomerBookings(Long customerId) {
        List<java.util.Map<String, Object>> list = new java.util.ArrayList<>();

        // A. Lấy các gói lịch cố định của khách
        List<com.smashflow.backend.model.RecurringBooking> recurringList = recurringBookingRepository
                .findByCustomerIdOrderByCreatedAtDesc(customerId);

        for (com.smashflow.backend.model.RecurringBooking r : recurringList) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", r.getId());
            map.put("code", "#" + r.getId());
            map.put("type", "RECURRING");
            map.put("status", r.getStatus() != null ? r.getStatus().name() : "ACTIVE");
            map.put("startDate", r.getStartDate().toString());
            map.put("endDate", r.getEndDate().toString());
            map.put("startTime", r.getStartTime().toString().substring(0, 5));
            map.put("endTime", r.getEndTime().toString().substring(0, 5));
            map.put("daysOfWeek", r.getDaysOfWeek() != null
                    ? r.getDaysOfWeek().stream().map(d -> d.ordinal() + 1).toList()
                    : List.of());
            map.put("amount", r.getTotalAmount());
            map.put("courtName", r.getCourt() != null ? r.getCourt().getName() : "Sân");
            map.put("courtLocation", r.getCourt() != null && r.getCourt().getCourtType() != null
                    && r.getCourt().getCourtType().name().contains("OUTDOOR") ? "Ngoài trời" : "Trong nhà");

            String img = (r.getCourt() != null && r.getCourt().getImageUrl() != null && !r.getCourt().getImageUrl().isBlank())
                    ? r.getCourt().getImageUrl() : DEFAULT_COURT_IMAGE;
            map.put("imageUrl", img);

            int sessionCount = r.getBookings() != null ? r.getBookings().size() : 0;
            map.put("sessionCount", sessionCount);

            list.add(map);
        }

        // B. Lấy các booking lẻ của khách (không thuộc gói cố định)
        List<Booking> singleBookings = bookingRepository.findAllBookingsByCustomerId(customerId)
                .stream()
                .filter(b -> b.getRecurringBooking() == null)
                .toList();

        for (Booking b : singleBookings) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", b.getId());
            map.put("code", b.getBookingCode());
            map.put("type", "SINGLE");
            map.put("status", b.getBookingStatus() != null ? b.getBookingStatus().name() : "PENDING");
            map.put("paymentStatus", b.getPaymentStatus() != null ? b.getPaymentStatus().name() : "UNPAID");
            map.put("startDate", b.getBookingDate().toString());
            map.put("endDate", b.getBookingDate().toString());
            map.put("startTime", b.getStartTime().toString().substring(0, 5));
            map.put("endTime", b.getEndTime().toString().substring(0, 5));
            map.put("amount", b.getTotalAmount());
            map.put("courtName", b.getCourt() != null ? b.getCourt().getName() : "Sân");
            map.put("courtLocation", b.getCourt() != null && b.getCourt().getCourtType() != null
                    && b.getCourt().getCourtType().name().contains("OUTDOOR") ? "Ngoài trời" : "Trong nhà");

            String img = (b.getCourt() != null && b.getCourt().getImageUrl() != null && !b.getCourt().getImageUrl().isBlank())
                    ? b.getCourt().getImageUrl() : DEFAULT_COURT_IMAGE;
            map.put("imageUrl", img);

            list.add(map);
        }

        return list;
    }

    // 3. Lấy chi tiết gói cố định hoặc booking lẻ cho Admin
    public java.util.Map<String, Object> getBookingDetail(Long bookingId) {
        // A. Thử tìm trong RecurringBooking (gói cố định)
        java.util.Optional<com.smashflow.backend.model.RecurringBooking> recurringOpt = recurringBookingRepository
                .findWithBookingsById(bookingId);

        if (recurringOpt.isPresent()) {
            com.smashflow.backend.model.RecurringBooking r = recurringOpt.get();
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", r.getId());
            map.put("code", "#" + r.getId());
            map.put("type", "RECURRING");
            map.put("status", r.getStatus() != null ? r.getStatus().name() : "ACTIVE");
            map.put("startDate", r.getStartDate().toString());
            map.put("endDate", r.getEndDate().toString());
            map.put("startTime", r.getStartTime().toString().substring(0, 5));
            map.put("endTime", r.getEndTime().toString().substring(0, 5));
            map.put("daysOfWeek", r.getDaysOfWeek() != null
                    ? r.getDaysOfWeek().stream().map(d -> d.ordinal() + 1).toList()
                    : List.of());
            map.put("amount", r.getTotalAmount());
            map.put("discountPercent", r.getDiscountRate() != null ? r.getDiscountRate() : java.math.BigDecimal.ZERO);
            map.put("courtName", r.getCourt() != null ? r.getCourt().getName() : "Sân");
            map.put("courtLocation", r.getCourt() != null && r.getCourt().getCourtType() != null
                    && r.getCourt().getCourtType().name().contains("OUTDOOR") ? "Ngoài trời" : "Trong nhà");

            String img = (r.getCourt() != null && r.getCourt().getImageUrl() != null && !r.getCourt().getImageUrl().isBlank())
                    ? r.getCourt().getImageUrl() : DEFAULT_COURT_IMAGE;
            map.put("imageUrl", img);
            map.put("courtDescription", (r.getCourt() != null && r.getCourt().getDescription() != null && !r.getCourt().getDescription().isBlank())
                    ? r.getCourt().getDescription() : "Chưa có mô tả");

            String typeLabel = "Sân tiêu chuẩn trong nhà";
            if (r.getCourt() != null && r.getCourt().getCourtType() != null) {
                typeLabel = switch (r.getCourt().getCourtType()) {
                    case VIP_INDOOR -> "Sân VIP trong nhà";
                    case STANDARD_OUTDOOR -> "Sân tiêu chuẩn ngoài trời";
                    default -> "Sân tiêu chuẩn trong nhà";
                };
            }
            map.put("courtTypeLabel", typeLabel);

            if (r.getCustomer() != null) {
                map.put("customer", java.util.Map.of(
                        "id", r.getCustomer().getId(),
                        "fullName", r.getCustomer().getFullName(),
                        "phone", r.getCustomer().getPhoneNumber(),
                        "email", r.getCustomer().getEmail()
                ));
            }

            List<java.util.Map<String, Object>> sessions = new java.util.ArrayList<>();
            int paidCount = 0;
            if (r.getBookings() != null) {
                for (Booking b : r.getBookings()) {
                    java.util.Map<String, Object> sMap = new java.util.HashMap<>();
                    sMap.put("id", b.getId());
                    sMap.put("code", b.getBookingCode());
                    sMap.put("type", "SINGLE");
                    sMap.put("packageCode", "#" + r.getId());
                    sMap.put("startDate", b.getBookingDate().toString());
                    sMap.put("endDate", b.getBookingDate().toString());
                    sMap.put("startTime", b.getStartTime().toString().substring(0, 5));
                    sMap.put("endTime", b.getEndTime().toString().substring(0, 5));
                    sMap.put("status", b.getBookingStatus() != null ? b.getBookingStatus().name() : "PENDING");
                    sMap.put("paymentStatus", b.getPaymentStatus() != null ? b.getPaymentStatus().name() : "UNPAID");

                    java.math.BigDecimal courtFee = b.getCourtPrice() != null ? b.getCourtPrice() : b.getTotalAmount();
                    java.math.BigDecimal serviceFee = b.getServicePrice() != null ? b.getServicePrice() : java.math.BigDecimal.ZERO;
                    sMap.put("courtFee", courtFee != null ? courtFee : java.math.BigDecimal.ZERO);
                    sMap.put("serviceFee", serviceFee);
                    sMap.put("amount", b.getTotalAmount() != null ? b.getTotalAmount() : courtFee);

                    com.smashflow.backend.model.Court court = b.getCourt() != null ? b.getCourt() : r.getCourt();
                    sMap.put("courtName", court != null ? court.getName() : "Sân");
                    sMap.put("courtLocation", court != null && court.getCourtType() != null
                            && court.getCourtType().name().contains("OUTDOOR") ? "Ngoài trời" : "Trong nhà");
                    sMap.put("courtTypeLabel", typeLabel);
                    sMap.put("imageUrl", img);
                    sMap.put("courtDescription", (court != null && court.getDescription() != null && !court.getDescription().isBlank())
                            ? court.getDescription() : "Chưa có mô tả");
                    sMap.put("createdAt", b.getCreatedAt() != null ? b.getCreatedAt().toString() : r.getCreatedAt().toString());

                    if (b.getPaymentStatus() == PaymentStatus.PAID || b.getPaymentStatus() == PaymentStatus.SETTLED) {
                        paidCount++;
                    }
                    sessions.add(sMap);
                }
            }
            map.put("sessions", sessions);
            map.put("sessionCount", sessions.size());
            map.put("paidSessionCount", paidCount);
            return map;
        }

        // B. Nếu là booking lẻ
        Booking b = bookingRepository.findById(bookingId).orElse(null);
        if (b != null) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            java.math.BigDecimal courtFee = b.getCourtPrice() != null ? b.getCourtPrice() : b.getTotalAmount();
            java.math.BigDecimal serviceFee = b.getServicePrice() != null ? b.getServicePrice() : java.math.BigDecimal.ZERO;
            map.put("courtFee", courtFee != null ? courtFee : java.math.BigDecimal.ZERO);
            map.put("serviceFee", serviceFee);
            map.put("createdAt", b.getCreatedAt() != null ? b.getCreatedAt().toString() : b.getBookingDate().toString() + "T00:00:00");
            map.put("id", b.getId());
            map.put("code", b.getBookingCode());
            map.put("type", "SINGLE");
            map.put("status", b.getBookingStatus() != null ? b.getBookingStatus().name() : "PENDING");
            map.put("paymentStatus", b.getPaymentStatus() != null ? b.getPaymentStatus().name() : "UNPAID");
            map.put("startDate", b.getBookingDate().toString());
            map.put("endDate", b.getBookingDate().toString());
            map.put("startTime", b.getStartTime().toString().substring(0, 5));
            map.put("endTime", b.getEndTime().toString().substring(0, 5));
            map.put("amount", b.getTotalAmount());
            map.put("courtName", b.getCourt() != null ? b.getCourt().getName() : "Sân");
            map.put("courtLocation", b.getCourt() != null && b.getCourt().getCourtType() != null
                    && b.getCourt().getCourtType().name().contains("OUTDOOR") ? "Ngoài trời" : "Trong nhà");

            String img = (b.getCourt() != null && b.getCourt().getImageUrl() != null && !b.getCourt().getImageUrl().isBlank())
                    ? b.getCourt().getImageUrl() : DEFAULT_COURT_IMAGE;
            map.put("imageUrl", img);
            map.put("courtDescription", (b.getCourt() != null && b.getCourt().getDescription() != null && !b.getCourt().getDescription().isBlank())
                    ? b.getCourt().getDescription() : "Chưa có mô tả");

            String typeLabel = "Sân tiêu chuẩn trong nhà";
            if (b.getCourt() != null && b.getCourt().getCourtType() != null) {
                typeLabel = switch (b.getCourt().getCourtType()) {
                    case VIP_INDOOR -> "Sân VIP trong nhà";
                    case STANDARD_OUTDOOR -> "Sân tiêu chuẩn ngoài trời";
                    default -> "Sân tiêu chuẩn trong nhà";
                };
            }
            map.put("courtTypeLabel", typeLabel);

            if (b.getCustomer() != null) {
                map.put("customer", java.util.Map.of(
                        "id", b.getCustomer().getId(),
                        "fullName", b.getCustomer().getFullName(),
                        "phone", b.getCustomer().getPhoneNumber(),
                        "email", b.getCustomer().getEmail()
                ));
            }
            return map;
        }

        return java.util.Map.of();
    }
}