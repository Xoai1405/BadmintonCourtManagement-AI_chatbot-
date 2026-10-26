package com.smashflow.backend.dto.response;

import com.smashflow.backend.model.enums.CourtStatus;

public record CourtTypeOptionResponse(
        Long id,
        String courtName,
        CourtStatus courtStatus
) {

}