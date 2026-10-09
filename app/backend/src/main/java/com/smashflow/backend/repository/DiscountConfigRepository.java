package com.smashflow.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.smashflow.backend.model.DiscountConfig;
import com.smashflow.backend.model.enums.DiscountStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiscountConfigRepository extends JpaRepository<DiscountConfig, Long> {
    List<DiscountConfig> findByStatusOrderByMinMonthsAsc(DiscountStatus status);

    @Query("SELECT d FROM DiscountConfig d " +
            "WHERE d.status = :status AND d.minMonths <= :months " +
            "ORDER BY d.minMonths DESC, d.discountPercent DESC LIMIT 1")
    Optional<DiscountConfig> findApplicableDiscount(
            @Param("status") DiscountStatus status,
            @Param("months") Integer months
    );
}
