package com.smashflow.backend.dto;

import com.smashflow.backend.model.enums.CourtStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourtTypeOptionResponse {
    private long id;
    private String courtName;
    private CourtStatus courtStatus;
}
