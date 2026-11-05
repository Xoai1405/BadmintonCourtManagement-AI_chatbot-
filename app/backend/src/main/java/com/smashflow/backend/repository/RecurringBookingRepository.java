package com.smashflow.backend.repository;

import com.smashflow.backend.model.RecurringBooking;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecurringBookingRepository extends JpaRepository<RecurringBooking, Long> {
    List<RecurringBooking> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    @EntityGraph(attributePaths = {"bookings"})
    Optional<RecurringBooking> findWithBookingsById(Long id);

    // Danh sách tất cả gói cho nhân viên, mới nhất trước
    List<RecurringBooking> findAllByOrderByCreatedAtDesc();

    // Khóa dòng gói khi nhân viên xác nhận / hủy để tránh thao tác đồng thời
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from RecurringBooking r where r.id = :id")
    Optional<RecurringBooking> findByIdForUpdate(@Param("id") Long id);

    // Kiểm tra có đơn nào đang dùng mốc chiết khấu này không
    boolean existsByDiscountConfigId(Long discountConfigId);
}
