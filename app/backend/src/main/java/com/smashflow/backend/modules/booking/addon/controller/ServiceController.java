package com.smashflow.backend.modules.booking.addon.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.smashflow.backend.modules.booking.addon.dto.request.ServiceRequest;
import com.smashflow.backend.modules.booking.addon.dto.response.ServiceResponse;
import com.smashflow.backend.modules.booking.addon.dto.request.ServiceStatusRequest;
import com.smashflow.backend.modules.booking.addon.service.ServiceCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
public class ServiceController {
    private final ServiceCatalogService catalog;

    @GetMapping
    public List<ServiceResponse> list() { return catalog.list(); }

    @PostMapping
    public ResponseEntity<ServiceResponse> create(@Valid @RequestBody ServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(catalog.create(request));
    }

    @PutMapping("/{id}")
    public ServiceResponse update(@PathVariable Long id, @Valid @RequestBody ServiceRequest request) {
        return catalog.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public ServiceResponse setStatus(@PathVariable Long id, @Valid @RequestBody ServiceStatusRequest request) {
        return catalog.setStatus(id, request.status());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        catalog.delete(id);
        return ResponseEntity.noContent().build();
    }
}
