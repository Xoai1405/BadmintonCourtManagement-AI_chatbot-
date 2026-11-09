package com.smashflow.backend.modules.booking.recurring.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record RecurringBookingPreviewResponse(
        List<SingleConflictResponse> conflictingSlotList,

        int totalSessions,

        BigDecimal discountPercent,

        BigDecimal totalPrice) {

}