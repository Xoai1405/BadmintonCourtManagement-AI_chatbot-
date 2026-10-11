package com.smashflow.backend.dto.response.conflict;

import java.util.List;

public record RecurringBookingConflictResponse(
        String errorCode,
        List<SingleConflictResponse> conflictingSlotList
) {

}