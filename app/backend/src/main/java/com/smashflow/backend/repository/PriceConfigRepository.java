package com.smashflow.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smashflow.backend.model.PriceConfig;
import com.smashflow.backend.model.enums.CourtType;

public interface PriceConfigRepository
        extends JpaRepository<PriceConfig, Long> {

    Optional<PriceConfig> findByCourtType(CourtType courtType);
}