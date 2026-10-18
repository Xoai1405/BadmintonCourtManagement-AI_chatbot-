package com.smashflow.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.response.CourtAvailabilityResponse;
import com.smashflow.backend.dto.response.CourtResponse;
import com.smashflow.backend.service.CourtService;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.PathVariable;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/courts")
@RequiredArgsConstructor
public class CourtController {

    private final CourtService courtSer;

    @GetMapping
    public ResponseEntity<List<CourtResponse>> getAllCourt() {
        List<CourtResponse> res = courtSer.getAllCourts();

        return ResponseEntity.status(HttpStatus.OK).body(res);

    }

    @GetMapping("/id")
    public ResponseEntity<CourtResponse> getCourt(@RequestParam Long id) {
        return ResponseEntity.status(HttpStatus.OK).body(courtSer.getCourt(id));
    }

    @GetMapping("/{courtId}/availability")
    public ResponseEntity<CourtAvailabilityResponse> getAvailability(
            @PathVariable Long courtId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        return ResponseEntity.ok(
                courtSer.getAvailability(courtId, date));
    }
}
