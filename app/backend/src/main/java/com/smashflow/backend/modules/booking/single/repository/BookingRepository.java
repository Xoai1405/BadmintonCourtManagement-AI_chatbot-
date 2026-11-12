package com.smashflow.backend.modules.booking.single.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

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

    List<Booking> findAllBookingsByCustomerId(Long customerId);

    // Booking lẻ của khách (không gồm các buổi thuộc gói lịch cố định)
    List<Booking> findByCustomer_IdAndRecurringBookingIsNull(Long customerId);

    // Kiểm tra trùng lịch khi xác nhận: bỏ qua chính booking đang xác nhận
    @Query("""
            select case when count(b) > 0 then true else false end
            from Booking b
            where b.court.id = :courtId
              and b.bookingDate = :bookingDate
              and b.id <> :excludeId
              and b.bookingStatus in :blockingStatuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    boolean existsOverlapExcluding(
            @Param("courtId") Long courtId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") Long excludeId,
            @Param("blockingStatuses") Collection<BookingStatus> blockingStatuses);

    // Danh sách booking lẻ cho nhân viên (không thuộc gói lịch cố định)
    @Query("""
            select b from Booking b
            where b.recurringBooking is null
            order by b.bookingDate desc, b.startTime desc
            """)
    List<Booking> findAllSingleBookings();

    // Khóa dòng booking khi nhân viên thao tác để tránh 2 người xác nhận cùng lúc
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    @Query("select b.id, r.id from Booking b left join b.recurringBooking r where b.bookingStatus = :status and b.expireAt is not null and b.expireAt <= :now")
    List<Object[]> findExpiredBookingRefs(@Param("status") BookingStatus status, @Param("now") LocalDateTime now);

    // Đếm lượt đặt theo khách: mỗi booking lẻ = 1 lượt, mỗi gói lịch cố định = 1
    // lượt.
    // Trả về [customerId, số lượt]; khách chưa có booking sẽ không có dòng.
    @Query("""
            select b.customer.id,
                   count(distinct case when r.id is null then b.id end)
                     + count(distinct r.id)
            from Booking b
            left join b.recurringBooking r
            where b.customer.id in :customerIds
              and b.bookingStatus <> :excludedStatus
            group by b.customer.id
            """)
    List<Object[]> countBookingsByCustomerIds(
            @Param("customerIds") Collection<Long> customerIds,
            @Param("excludedStatus") BookingStatus excludedStatus);

    boolean existsByCreatedByStaff_IdOrPaidByStaff_Id(Long createdByStaffId, Long paidByStaffId);

    @Query("""
            select coalesce(sum(b.totalAmount), 0)
            from Booking b
            where b.customer.id = :customerId
              and b.paymentStatus in :paidStatuses
              and b.bookingStatus <> :cancelledStatus
            """)
    BigDecimal calculateTotalSpendingByCustomerId(
            @Param("customerId") Long customerId,
            @Param("paidStatuses") Collection<PaymentStatus> paidStatuses,
            @Param("cancelledStatus") BookingStatus cancelledStatus);
}
