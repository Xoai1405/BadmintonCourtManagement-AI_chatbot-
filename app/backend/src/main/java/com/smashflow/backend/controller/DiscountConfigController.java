package com.smashflow.backend.controller;

import com.smashflow.backend.dto.request.discountConfig.DiscountConfigRequest;
import com.smashflow.backend.dto.response.discountConfig.DiscountConfigResponse;
import com.smashflow.backend.service.DiscountConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/discount_configs")
@RequiredArgsConstructor
public class DiscountConfigController {
    private final DiscountConfigService discountConfigService;

    @GetMapping
    public ResponseEntity<List<DiscountConfigResponse>> getAllConfigs() {
        return ResponseEntity.ok(discountConfigService.getAllConfigs());
    }

    @PostMapping
    public ResponseEntity<DiscountConfigResponse> createConfig(@Valid @RequestBody DiscountConfigRequest request) {
        DiscountConfigResponse response = discountConfigService.createConfig(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DiscountConfigResponse> updateConfig(@PathVariable Long id, @Valid @RequestBody DiscountConfigRequest request) {
        DiscountConfigResponse response = discountConfigService.updateConfig(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConfig(@PathVariable Long id) {
        discountConfigService.deleteConfig(id);
        return  ResponseEntity.noContent().build();
    }
}
