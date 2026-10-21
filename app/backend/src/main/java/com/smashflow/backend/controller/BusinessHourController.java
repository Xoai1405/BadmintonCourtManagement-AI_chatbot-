package com.smashflow.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.request.UpdateBusinessHourRequest;
import com.smashflow.backend.dto.response.BusinessHourResponse;
import com.smashflow.backend.service.BusinessHourConfigService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/business-hour-configs")
@RequiredArgsConstructor
public class BusinessHourController {

    private final BusinessHourConfigService businessHourSer;

    @PatchMapping
    public ResponseEntity<BusinessHourResponse> update(@RequestBody @Valid UpdateBusinessHourRequest request) {
        return ResponseEntity.status(HttpStatus.OK).body(businessHourSer.update(request));
    }

    @GetMapping
    public ResponseEntity<BusinessHourResponse> get() {
        return ResponseEntity.ok(businessHourSer.get());
    }
}
