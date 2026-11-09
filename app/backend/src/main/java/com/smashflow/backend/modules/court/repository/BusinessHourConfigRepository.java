package com.smashflow.backend.modules.court.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smashflow.backend.modules.court.model.BusinessHourConfig;

public interface BusinessHourConfigRepository extends JpaRepository<BusinessHourConfig, Short> {
}