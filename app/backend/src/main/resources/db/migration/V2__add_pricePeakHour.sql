ALter table price_configs
add price_peak_hour DECIMAL(12,2) NOT NULL; 

ALTER TABLE price_configs RENAME COLUMN price_per_hour TO price_normal_hour;

