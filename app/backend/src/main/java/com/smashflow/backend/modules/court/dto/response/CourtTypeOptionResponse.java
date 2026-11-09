package com.smashflow.backend.modules.court.dto.response;

import com.smashflow.backend.modules.court.model.enums.CourtStatus;

public record CourtTypeOptionResponse(
        Long id,
        String courtName,
        CourtStatus courtStatus) {

}