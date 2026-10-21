package com.smashflow.backend.model;

import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "business_hour_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BusinessHourConfig {

    @Id
    private Short id;

    @Column(name = "opening_time", nullable = false)
    private LocalTime openingTime;

    @Column(name = "closing_time", nullable = false)
    private LocalTime closingTime;

    @Column(name = "peak_start_time", nullable = false)
    private LocalTime peakStartTime;

    @Column(name = "peak_end_time", nullable = false)
    private LocalTime peakEndTime;
}