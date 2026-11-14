package com.smashflow.backend.modules.booking.addon.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import com.smashflow.backend.modules.booking.addon.model.Service;

public interface ServiceRepository extends JpaRepository<Service, Long> {
    List<Service> findByDeletedAtIsNullOrderByIdAsc();
    Optional<Service> findByIdAndDeletedAtIsNull(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Service s where s.id = :id and s.deletedAt is null")
    Optional<Service> findAvailableByIdForUpdate(@Param("id") Long id);
}
