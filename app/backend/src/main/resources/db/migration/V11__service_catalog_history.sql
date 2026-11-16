ALTER TABLE services ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE booking_services ADD COLUMN service_name_at_booking VARCHAR(100);
UPDATE booking_services bs SET service_name_at_booking = s.name FROM services s WHERE bs.service_id = s.id;
ALTER TABLE booking_services ALTER COLUMN service_name_at_booking SET NOT NULL;
