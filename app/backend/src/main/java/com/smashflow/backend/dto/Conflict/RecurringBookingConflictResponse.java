package com.smashflow.backend.dto.Conflict;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecurringBookingConflictResponse {
    private String errorCode;
    private List<SingleConflictResponse> conflictingSlotList;
}