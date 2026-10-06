package com.smashflow.backend.model;

import java.math.BigDecimal;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table (name="price_configs")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
public class PriceConfig {
    @Id 
    @GeneratedValue(strategy=GenerationType.IDENTITY) 
    private Long id;

    @Column(nullable=false, name="court_type")
    @Enumerated (EnumType.STRING)
    CourtType courtType;

    @Column (nullable=false, name="start_time") 
    private LocalTime startTime;

    @Column (nullable=false, name="end_time") 
    private LocalTime endTime;

    @Column (nullable=false, name="price_per_hour")
    private BigDecimal pricePerHour;
    
    @Column (nullable=false, name="is_peak_hour")
    private boolean isPeakHour;
}
