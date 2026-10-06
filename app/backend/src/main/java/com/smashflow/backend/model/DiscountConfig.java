package com.smashflow.backend.model;

import java.math.BigDecimal;

import com.smashflow.backend.model.enums.DiscountStatus;

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
@Table (name = "discount_configs")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor 
public class DiscountConfig {
    @Id 
    @GeneratedValue(strategy=GenerationType.IDENTITY) 
    private Long id;

    @Column(nullable=false, name ="min_months")
    private int minMonths;

    @Column (nullable=false,name ="discount_percent")
    private BigDecimal discountPercent;

    @Column (nullable=false) 
    @Enumerated (EnumType.STRING) 
    DiscountStatus status;

}
