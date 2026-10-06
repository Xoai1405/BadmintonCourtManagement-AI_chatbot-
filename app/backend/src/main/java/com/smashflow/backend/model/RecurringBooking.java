package com.smashflow.backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.smashflow.backend.model.enums.RecurBookingStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table (name ="recurring_bookings")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
public class RecurringBooking {
    @Id
    @GeneratedValue (strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn (nullable=false, name="customer_id")
    private User customer;

    @ManyToOne
    @JoinColumn (nullable=true, name="created_by_staff_id")
    private User createdByStaff;

    @ManyToOne 
    @JoinColumn (nullable=false, name="court_id")
    private Court court;

    @Column (nullable=false, name ="start_date")
    private LocalDate startDate;

    @Column (nullable=false, name ="end_date")
    private LocalDate endDate;

    @Column (nullable=false, name ="days_of_week")
    @Enumerated (EnumType.STRING)
    private DayOfWeek daysOfWeek;

    @Column (nullable=false, name ="start_time")
    private LocalTime startTime;

    @Column (nullable=false, name ="end_time")
    private LocalTime endTime;

    @Column (nullable=false) 
    private BigDecimal discountRate;

    @Column (nullable=false) 
    private BigDecimal totalAmount;

    @Column (nullable=false) 
    @Enumerated (EnumType.STRING)
    RecurBookingStatus status;

    @Column 
    private String cancelReason;

    @Column 
    private LocalDateTime cancelledAt;

    @Column (nullable=false)
    private LocalDateTime createdAt;
}
