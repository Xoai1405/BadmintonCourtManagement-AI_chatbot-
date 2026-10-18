package com.smashflow.backend.repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.smashflow.backend.model.Booking;
import com.smashflow.backend.model.enums.BookingStatus;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("""
            select case when count(b) > 0 then true else false end
            from Booking b
            where b.court.id = :courtId
              and b.bookingDate = :bookingDate
              and b.bookingStatus in :blockingStatuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    boolean existsOverlap(
            @Param("courtId") Long courtId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("blockingStatuses") Collection<BookingStatus> blockingStatuses);

    List<Booking> findByCourt_IdAndBookingDateAndBookingStatusIn(
            Long courtId,
            LocalDate bookingDate,
            Collection<BookingStatus> bookingStatuses);
}