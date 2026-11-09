package com.smashflow.backend.modules.pricing.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smashflow.backend.modules.court.model.enums.CourtType;
import com.smashflow.backend.modules.pricing.model.PriceConfig;

public interface PriceConfigRepository
        extends JpaRepository<PriceConfig, Long> {

    Optional<PriceConfig> findByCourtType(CourtType courtType);
}