CREATE INDEX IF NOT EXISTS idx_bookings_report_date ON bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_users_role_created_at ON users (role, created_at);
