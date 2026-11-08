-- Prevent concurrent bookings from overlapping on the same court.
-- [) allows one booking to start exactly when another booking ends.
-- Inactive bookings do not block the slot.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Xóa ràng buộc nếu nó đã tồn tại trong DB
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_active_bookings;

ALTER TABLE bookings
    ADD CONSTRAINT no_overlapping_active_bookings
    EXCLUDE USING gist (
        court_id WITH =,
        tsrange(
            booking_date + start_time,
            booking_date + end_time,
            '[)'
        ) WITH &&
    )
    WHERE (booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN'));
