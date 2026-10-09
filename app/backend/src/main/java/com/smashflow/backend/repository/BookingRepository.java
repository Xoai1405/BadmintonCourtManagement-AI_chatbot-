package com.smashflow.backend.repository;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.smashflow.backend.model.Booking;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByRecurringBookingIdOrderByBookingDateAscStart_timeAsc(Long recurringBookingId);
}
