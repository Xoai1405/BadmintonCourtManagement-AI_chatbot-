package com.smashflow.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smashflow.backend.model.BusinessHourConfig;

public interface BusinessHourConfigRepository extends JpaRepository<BusinessHourConfig, Short> {
}