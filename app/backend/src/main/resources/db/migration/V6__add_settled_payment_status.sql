-- Kết toán booking: thêm trạng thái thanh toán SETTLED (đã kết toán).
-- PAID    = đã thanh toán tiền sân (nhân viên bấm Xác nhận)
-- SETTLED = đã kết toán (nhân viên bấm "Xác nhận thu đủ tiền" hoặc No-show)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE bookings ADD CONSTRAINT chk_payment_status
    CHECK (payment_status IN ('UNPAID', 'PAID', 'SETTLED'));
