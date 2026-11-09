package com.smashflow.backend.modules.court.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smashflow.backend.modules.court.model.Court;

public interface CourtRepository extends JpaRepository<Court, Long> {
    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

}
