package com.smashflow.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.request.LoginRequest;
import com.smashflow.backend.dto.request.RegisterRequest;
import com.smashflow.backend.dto.response.LoginResponse;
import com.smashflow.backend.dto.response.RegisterResponse;
import com.smashflow.backend.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
@CrossOrigin(origins = "*")
@RestController
@RequestMapping ("/api/v1/auth")
@RequiredArgsConstructor 
public class AuthController {
    private final AuthService authSer;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register( @Valid @RequestBody RegisterRequest request) {
        RegisterResponse res = authSer.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

     @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authSer.login(request);
        return ResponseEntity.ok(response);
    }
}
