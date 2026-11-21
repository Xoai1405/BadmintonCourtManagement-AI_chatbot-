package com.smashflow.backend.modules.booking.addon.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.smashflow.backend.modules.booking.addon.enums.Category;
import com.smashflow.backend.modules.booking.addon.enums.ServiceStatus;

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
@Table(name = "services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Service {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    Category category;

    @Column(nullable = false)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    ServiceStatus status;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
