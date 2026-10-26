package com.smashflow.backend.dto.request;

import com.smashflow.backend.model.enums.CourtStatus;
import com.smashflow.backend.model.enums.CourtType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateCourtRequest(
        @NotNull Long courtId,
        @NotBlank String name,
        String description,
        @NotNull CourtType courtType,
        @NotNull CourtStatus status

) {

}