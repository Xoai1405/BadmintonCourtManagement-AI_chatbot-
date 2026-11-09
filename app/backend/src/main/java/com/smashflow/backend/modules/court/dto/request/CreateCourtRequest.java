package com.smashflow.backend.modules.court.dto.request;

import com.smashflow.backend.modules.court.model.enums.CourtStatus;
import com.smashflow.backend.modules.court.model.enums.CourtType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateCourtRequest(
        @NotBlank String name,
        String description,
        @NotNull CourtType courtType,
        @NotNull CourtStatus status

) {

}
