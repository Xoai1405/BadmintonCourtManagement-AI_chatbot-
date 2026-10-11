
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(100)  NOT NULL,                      
    phone_number    VARCHAR(15)   NOT NULL UNIQUE,                 
    email           VARCHAR(100)  NOT NULL UNIQUE,                 
    avatar_url      VARCHAR(255)  NULL,
    password_hash   VARCHAR(255)  NOT NULL,                        
    role            VARCHAR(20)   NOT NULL,                        
    status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',      
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_role   CHECK (role IN ('CUSTOMER', 'STAFF', 'MANAGER')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'LOCKED'))
);

CREATE INDEX idx_users_role ON users (role);



CREATE TABLE courts (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL,                            
    court_type  VARCHAR(30)  NOT NULL,                        
    image_url   VARCHAR(255) NULL,
    description VARCHAR(255) NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',          

    CONSTRAINT chk_courts_type   CHECK (court_type IN ('STANDARD_OUTDOOR', 'STANDARD_INDOOR', 'VIP_INDOOR')),
    CONSTRAINT chk_courts_status CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'CLOSED'))
);

CREATE INDEX idx_courts_status ON courts (status);



CREATE TABLE price_configs (
    id             BIGSERIAL      PRIMARY KEY,
    court_type     VARCHAR(30)    NOT NULL,                        
    start_time     TIME           NOT NULL,                       
    end_time       TIME           NOT NULL,                        
    price_per_hour DECIMAL(12,2)  NOT NULL,                        
    is_peak_hour   BOOLEAN        NOT NULL DEFAULT FALSE,         

    CONSTRAINT chk_price_configs_type CHECK (court_type IN ('STANDARD_OUTDOOR', 'STANDARD_INDOOR', 'VIP_INDOOR')),
    CONSTRAINT chk_price_configs_time CHECK (end_time > start_time)
);

CREATE INDEX idx_price_configs_type ON price_configs (court_type);


CREATE TABLE discount_configs (
    id               BIGSERIAL      PRIMARY KEY,
    min_months       INT            NOT NULL,                     
    discount_percent DECIMAL(5,2)   NOT NULL,                      
    status           VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',    

    CONSTRAINT chk_discount_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100)
);


CREATE TABLE recurring_bookings (
    id                   BIGSERIAL      PRIMARY KEY,
    customer_id          BIGINT         NOT NULL,                 
    created_by_staff_id  BIGINT         NULL,                     
    court_id             BIGINT         NOT NULL,                 
    start_date           DATE           NOT NULL,                  
    end_date             DATE           NOT NULL,                  
    days_of_week         VARCHAR(50)    NOT NULL,                  --(vd: MON,WED,FRI)
    start_time           TIME           NOT NULL,                  
    end_time             TIME           NOT NULL,                  
    discount_rate        DECIMAL(5,2)   NOT NULL DEFAULT 0.00,     
    total_amount         DECIMAL(12,2)  NOT NULL,                  
    status               VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE', 
    cancel_reason        TEXT           NULL,
    cancelled_at         TIMESTAMP      NULL,
    created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recurring_customer FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_recurring_staff    FOREIGN KEY (created_by_staff_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_recurring_court    FOREIGN KEY (court_id) REFERENCES courts (id) ON DELETE RESTRICT,

    CONSTRAINT chk_recurring_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_recurring_dates  CHECK (end_date >= start_date),
    CONSTRAINT chk_recurring_time   CHECK (end_time > start_time)
);

CREATE INDEX idx_recurring_customer ON recurring_bookings (customer_id);
CREATE INDEX idx_recurring_court    ON recurring_bookings (court_id);
CREATE INDEX idx_recurring_status   ON recurring_bookings (status);


CREATE TABLE bookings (
    id                    BIGSERIAL      PRIMARY KEY,
    booking_code          VARCHAR(20)    NOT NULL UNIQUE,         
    customer_id           BIGINT         NOT NULL,                
    created_by_staff_id   BIGINT         NULL,                     
    recurring_booking_id  BIGINT         NULL,                    
    court_id              BIGINT         NOT NULL,                
    booking_date          DATE           NOT NULL,                 
    start_time            TIME           NOT NULL,                 
    end_time              TIME           NOT NULL,                 
    court_price           DECIMAL(12,2)  NOT NULL,                 
    service_price         DECIMAL(12,2)  NOT NULL DEFAULT 0.00,   
    total_amount          DECIMAL(12,2)  NOT NULL,                 
    booking_status        VARCHAR(20)    NOT NULL DEFAULT 'PENDING', 
    payment_status        VARCHAR(20)    NOT NULL DEFAULT 'UNPAID', 
    payment_method        VARCHAR(20)    NULL,                     
    cancel_reason         TEXT           NULL,                     
    cancelled_at          TIMESTAMP      NULL,
    expire_at             TIMESTAMP      NULL,                     
    created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    paid_at               TIMESTAMP      NULL,                     
    paid_by_staff_id      BIGINT         NULL,                     

    CONSTRAINT fk_booking_customer   FOREIGN KEY (customer_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_staff      FOREIGN KEY (created_by_staff_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_booking_recurring  FOREIGN KEY (recurring_booking_id) REFERENCES recurring_bookings (id) ON DELETE SET NULL,
    CONSTRAINT fk_booking_court      FOREIGN KEY (court_id) REFERENCES courts (id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_paid_by    FOREIGN KEY (paid_by_staff_id) REFERENCES users (id) ON DELETE SET NULL,

    CONSTRAINT chk_booking_status CHECK (booking_status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    CONSTRAINT chk_payment_status CHECK (payment_status IN ('UNPAID', 'PAID')),
    CONSTRAINT chk_payment_method CHECK (payment_method IS NULL OR payment_method IN ('CASH', 'BANK_TRANSFER')),
    CONSTRAINT chk_booking_time   CHECK (end_time > start_time)
);

-- Index phục vụ kiểm tra trùng lịch và tra cứu lịch trống 
CREATE INDEX idx_booking_conflict  ON bookings (court_id, booking_date, start_time, end_time);
CREATE INDEX idx_booking_customer  ON bookings (customer_id);
CREATE INDEX idx_booking_recurring ON bookings (recurring_booking_id);
CREATE INDEX idx_booking_status    ON bookings (booking_status);
CREATE INDEX idx_booking_expire    ON bookings (expire_at);        


CREATE TABLE services (
    id         BIGSERIAL      PRIMARY KEY,
    name       VARCHAR(100)   NOT NULL,                           
    category   VARCHAR(30)    NOT NULL,                           
    unit_price DECIMAL(12,2)  NOT NULL,                           
    status     VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',          

    CONSTRAINT chk_service_category CHECK (category IN ('DRINK', 'RACKET_RENTAL', 'OTHER')),
    CONSTRAINT chk_service_status   CHECK (status IN ('ACTIVE', 'OUT_OF_STOCK'))
);


CREATE TABLE booking_services (
    id                BIGSERIAL      PRIMARY KEY,
    booking_id        BIGINT         NOT NULL,                    
    service_id        BIGINT         NOT NULL,                     
    quantity          INT            NOT NULL,                     
    price_at_booking  DECIMAL(12,2)  NOT NULL,                     
    subtotal          DECIMAL(12,2)  NOT NULL,                     

    CONSTRAINT fk_bs_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE,
    CONSTRAINT fk_bs_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT,
    CONSTRAINT chk_bs_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_bs_booking ON booking_services (booking_id);

CREATE TABLE faqs (
    id          BIGSERIAL    PRIMARY KEY,
    question    TEXT         NOT NULL,                            
    answer      TEXT         NOT NULL,                           
    category    VARCHAR(50)  NULL,                                
    updated_by  BIGINT       NULL,                                 
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_faq_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
);

--  trigger tự cập nhật updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

