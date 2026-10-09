package com.smashflow.backend.repository;

import com.smashflow.backend.model.RecurringBooking;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecurringBookingRepository extends JpaRepository<RecurringBooking, Long> {
    List<RecurringBooking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    @EntityGraph(attributePaths = {"bookings"})
    Optional<RecurringBooking> findWithBookingsById(Long id);
}