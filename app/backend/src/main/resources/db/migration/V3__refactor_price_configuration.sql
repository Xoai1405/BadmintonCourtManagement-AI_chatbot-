-- 1. Kiểm tra dữ liệu cũ trước khi gộp.
-- Mỗi loại sân bắt buộc phải có đúng:
-- - 1 cấu hình giờ thường
-- - 1 cấu hình giờ cao điểm
DO $$
BEGIN
    IF EXISTS (
        SELECT court_type
        FROM price_configs
        GROUP BY court_type
        HAVING COUNT(*) FILTER (WHERE is_peak_hour = FALSE) <> 1
            OR COUNT(*) FILTER (WHERE is_peak_hour = TRUE) <> 1
    ) THEN
        RAISE EXCEPTION
            'Mỗi loại sân phải có đúng 1 cấu hình giờ thường và 1 cấu hình giờ cao điểm';
    END IF;
END $$;


-- 2. Cấu hình giờ hoạt động và giờ cao điểm dùng chung cho toàn hệ thống.
-- id = 1 nghĩa là hiện tại hệ thống chỉ có một bộ cấu hình.
CREATE TABLE business_hour_configs (
    id SMALLINT PRIMARY KEY DEFAULT 1,

    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,

    peak_start_time TIME NOT NULL,
    peak_end_time TIME NOT NULL,

    CONSTRAINT chk_business_hour_singleton
        CHECK (id = 1),

    CONSTRAINT chk_opening_before_closing
        CHECK (opening_time < closing_time),

    CONSTRAINT chk_peak_time_in_business_hours
        CHECK (
            peak_start_time >= opening_time
            AND peak_end_time <= closing_time
            AND peak_start_time < peak_end_time
        )
);

INSERT INTO business_hour_configs (
    id,
    opening_time,
    closing_time,
    peak_start_time,
    peak_end_time
)
VALUES (
    1,
    TIME '06:00',
    TIME '22:00',
    TIME '17:00',
    TIME '22:00'
);


-- 3. Tạo bảng giá mới:
-- mỗi loại sân chỉ có một dòng giá.
CREATE TABLE price_configs_new (
    id BIGSERIAL PRIMARY KEY,

    court_type VARCHAR(30) NOT NULL,

    price_normal_hour DECIMAL(12, 2) NOT NULL,
    price_peak_hour DECIMAL(12, 2) NOT NULL,

    CONSTRAINT chk_price_config_court_type
        CHECK (
            court_type IN (
                'STANDARD_OUTDOOR',
                'STANDARD_INDOOR',
                'VIP_INDOOR'
            )
        ),

    CONSTRAINT chk_price_normal_positive
        CHECK (price_normal_hour > 0),

    CONSTRAINT chk_price_peak_positive
        CHECK (price_peak_hour > 0),

    CONSTRAINT uq_price_config_court_type
        UNIQUE (court_type)
);


-- 4. Gộp 2 dòng cũ thành 1 dòng mới cho từng loại sân.
INSERT INTO price_configs_new (
    court_type,
    price_normal_hour,
    price_peak_hour
)
SELECT
    court_type,
    MAX(price_normal_hour) FILTER (WHERE is_peak_hour = FALSE),
    MAX(price_peak_hour) FILTER (WHERE is_peak_hour = TRUE)
FROM price_configs
GROUP BY court_type;


-- 5. Thay bảng cũ bằng bảng mới.
DROP TABLE price_configs;

ALTER TABLE price_configs_new
RENAME TO price_configs;