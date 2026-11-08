package com.smashflow.backend.dto.response.customer;

import java.math.BigDecimal;

public record CustomerResponse(
        Long id,
        String fullName,
        String phone,
        String email,
        String status,
        long bookingCount,
        BigDecimal totalSpending
) {
}