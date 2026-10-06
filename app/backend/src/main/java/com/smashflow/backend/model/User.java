package com.smashflow.backend.model;

import java.time.LocalDateTime;

import com.smashflow.backend.model.enums.UserStatus;

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
@Table (name="users")
@Getter 
@Setter 
@AllArgsConstructor 
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue (strategy=GenerationType.IDENTITY)
    private Long id;

    @Column (name="full_name", nullable= false) 
    private String fullName;
    @Column (name="phone_number", nullable=false, unique=true)
    private String phoneNumber;

    @Column (unique=true, nullable=false) 
    private String email;

    @Column (name = "avatar_url")
    private String avatarUrl;

    @Column (name = "password_hash")
    private String password;

    @Column (nullable=true) 
    @Enumerated (EnumType.STRING)
    Role role;

    @Column (nullable = true) 
    @Enumerated (EnumType.STRING) 
    UserStatus status;

    @Column (nullable = true, name ="created_at") 
    private LocalDateTime createdAt;

}
