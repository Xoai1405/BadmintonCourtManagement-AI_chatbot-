package com.smashflow.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smashflow.backend.model.PriceConfig;
import com.smashflow.backend.model.enums.CourtType;

public interface PriceConfigRepository extends JpaRepository<PriceConfig, Long> {
    List<PriceConfig> findByCourtType(CourtType type);

    List<PriceConfig> findByCourtTypeOrderByStartTimeAsc(CourtType courtType);
}
