package com.smashflow.backend.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.smashflow.backend.model.enums.BookingStatus;
import com.smashflow.backend.model.enums.PaymentStatus;

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
@Table(name="bookings")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
public class Booking {
    @Id 
    @GeneratedValue (strategy= GenerationType.IDENTITY)
    private Long id;


    
    @Column (nullable=false, unique=true, name ="booking_code") 
    private String bookingCode;

    @ManyToOne 
    @JoinColumn (nullable=false, name ="customer_id") 
    private User customer;

    
    @ManyToOne 
    @JoinColumn (nullable=true, name ="created_by_staff_id")
    private User createdByStaff;


    @ManyToOne 
    @JoinColumn (name ="recurring_booking_id")
    private RecurringBooking recurringBooking;

    @ManyToOne 
    @JoinColumn (name = "court_id", nullable=false) 
    private Court court;

    @Column (nullable=false) 
    private LocalDate bookingDate;

    @Column (nullable=false) 
    private LocalTime start_time;
    @Column (nullable=false) 
    private LocalTime end_time;

    @Column (nullable=false) 
    private BigDecimal courtPrice;

    @Column (nullable=false) 
    private BigDecimal servicePrice;

    @Column (nullable = false)
    private BigDecimal totalAmount;

    @Column (nullable=false) 
    @Enumerated (EnumType.STRING) 
    BookingStatus bookingStatus;

    @Column (nullable=false)
    @Enumerated (EnumType.STRING)  
    PaymentStatus paymentStatus;

    @Column (nullable=true)
    private String paymentMethod;

    @Column
    private String cancelReason;

    @Column
    private LocalDateTime cancelledAt;

    @Column 
    private LocalDateTime expireAt;

    @Column (nullable=false)
    private LocalDateTime createdAt;

    @Column 
    private LocalDateTime paidAt;

    @ManyToOne 
    @JoinColumn (name= "paid_by_staff_id")
    private User paidByStaff;



    


}
