-- Thêm cột đánh dấu email đã được xác thực hay chưa
ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Các tài khoản đã tồn tại trước tính năng này coi như đã xác thực
UPDATE users SET email_verified = TRUE;