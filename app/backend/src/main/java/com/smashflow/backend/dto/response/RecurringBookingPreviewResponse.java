package com.smashflow.backend.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record RecurringBookingPreviewResponse(
        List<SingleConflictResponse> conflictingSlotList,

        int totalSessions,

        BigDecimal discountPercent,

        BigDecimal totalPrice
) {

}