package com.smashflow.backend.model;

import com.smashflow.backend.model.enums.CourtStatus;

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
@Table (name="courts")
@Getter 
@Setter 
@AllArgsConstructor 
@NoArgsConstructor 
public class Court {
    @Id 
    @GeneratedValue (strategy=GenerationType.IDENTITY)
    private Long id;

    @Column (nullable=false)
    private String name;

    @Column (nullable=false, name="court_type")
    @Enumerated (EnumType.STRING)
    CourtType courtType;

    @Column (name = "image_url")
    private String imageUrl;

    @Column 
    private String description;

    @Column (nullable= true) 
    @Enumerated (EnumType.STRING)
    CourtStatus status;

    
}
