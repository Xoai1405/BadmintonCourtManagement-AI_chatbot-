package com.smashflow.backend.modules.booking.addon.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.smashflow.backend.modules.booking.addon.model.BookingService;

public interface BookingServiceRepository extends JpaRepository<BookingService, Long> {
    List<BookingService> findByBooking_IdOrderByIdAsc(Long bookingId);
    Optional<BookingService> findByBooking_IdAndService_Id(Long bookingId, Long serviceId);
}
