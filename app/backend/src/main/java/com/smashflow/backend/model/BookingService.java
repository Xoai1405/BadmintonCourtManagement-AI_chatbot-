package com.smashflow.backend.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name ="booking_services")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
public class BookingService {
    @Id 
    @GeneratedValue (strategy=GenerationType.IDENTITY)
    private Long Id;

    @ManyToOne 
    @JoinColumn (name = "booking_id", nullable=false)
    Booking booking;

    @ManyToOne 
    @JoinColumn (name = "service_id", nullable=false) 
    Service service;

    @Column(nullable=false) 
    private int quantity;

    @Column (nullable=false, name = "price_at_booking")
    private BigDecimal priceAtBooking;

    @Column (nullable=false) 
    private BigDecimal subtotal;

    
}
