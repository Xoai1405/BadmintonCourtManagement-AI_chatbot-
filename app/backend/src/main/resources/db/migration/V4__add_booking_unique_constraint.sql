-- SCRUM-31: Chống race condition đặt trùng lịch cùng lúc
-- Partial unique index: chỉ chặn slot đang PENDING/CONFIRMED/CHECKED_IN,
-- cho phép đặt lại slot đã CANCELLED hoặc COMPLETED.

CREATE UNIQUE INDEX uq_booking_active_slot
    ON bookings (court_id, booking_date, start_time, end_time)
    WHERE booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN');