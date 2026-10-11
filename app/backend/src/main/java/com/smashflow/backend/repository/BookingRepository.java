package com.smashflow.backend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.smashflow.backend.model.Booking;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    @Query("select b from Booking b where b.recurringBooking.id = :id "
            + "order by b.bookingDate asc, b.start_time asc")
    List<Booking> findByRecurringId(@Param("id") Long id);
}
