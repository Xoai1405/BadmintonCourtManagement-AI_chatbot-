package com.smashflow.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.smashflow.backend.dto.request.UpdatePriceConfigRequest;
import com.smashflow.backend.dto.response.PriceConfigResponse;
import com.smashflow.backend.service.PriceConfigService;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/price-configs")
@RequiredArgsConstructor
public class PriceConfigController {
    private final PriceConfigService priceConfigSer;

    @GetMapping
    public ResponseEntity<List<PriceConfigResponse>> getAll() {
        return ResponseEntity.ok(priceConfigSer.getAll());
    }

    @PatchMapping
    public ResponseEntity<PriceConfigResponse> update(@RequestBody @Valid UpdatePriceConfigRequest request) {
        PriceConfigResponse res = priceConfigSer.update(request);
        return ResponseEntity.status(HttpStatus.OK).body(res);
    }
}
