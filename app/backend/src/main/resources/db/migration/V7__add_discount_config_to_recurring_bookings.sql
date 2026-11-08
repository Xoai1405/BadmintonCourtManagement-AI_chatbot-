-- SCRUM-15: Thêm cột khóa ngoại discount_config_id vào bảng recurring_bookings
ALTER TABLE recurring_bookings
    ADD COLUMN discount_config_id BIGINT;

ALTER TABLE recurring_bookings
    ADD CONSTRAINT fk_recurring_bookings_discount_config
        FOREIGN KEY (discount_config_id) REFERENCES discount_configs(id);