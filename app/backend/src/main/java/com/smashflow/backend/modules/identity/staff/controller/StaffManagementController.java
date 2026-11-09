package com.smashflow.backend.modules.identity.staff.controller;

import com.smashflow.backend.modules.identity.staff.dto.request.CreateStaffRequest;
import com.smashflow.backend.modules.identity.staff.dto.request.UpdateStaffRequest;
import com.smashflow.backend.modules.identity.staff.dto.response.StaffResponse;
import com.smashflow.backend.modules.identity.staff.service.StaffManagementService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/staffs")
@RequiredArgsConstructor
public class StaffManagementController {

    private final StaffManagementService staffManagementService;

    // 1. Lấy danh sách nhân viên
    @GetMapping
    public ResponseEntity<List<StaffResponse>> getAllStaffs() {
        return ResponseEntity.ok(staffManagementService.getAllStaffs());
    }

    // 2. Tạo nhân viên mới
    @PostMapping
    public ResponseEntity<StaffResponse> createStaff(@Valid @RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(staffManagementService.createStaff(request));
    }

    // 3. Cập nhật thông tin nhân viên
    @PutMapping("/{id}")
    public ResponseEntity<StaffResponse> updateStaff(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStaffRequest request) {
        return ResponseEntity.ok(staffManagementService.updateStaff(id, request));
    }

    // 4. Khóa / Mở khóa nhân viên (PATCH status)
    @PatchMapping("/{id}/status")
    public ResponseEntity<StaffResponse> updateStaffStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return ResponseEntity.ok(staffManagementService.updateStaffStatus(id, status));
    }

    // 5. Xóa nhân viên
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStaff(@PathVariable Long id) {
        staffManagementService.deleteStaff(id);
        return ResponseEntity.noContent().build();
    }
}