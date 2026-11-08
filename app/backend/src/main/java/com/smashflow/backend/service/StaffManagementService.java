package com.smashflow.backend.service;

import com.smashflow.backend.dto.request.staff.CreateStaffRequest;
import com.smashflow.backend.dto.request.staff.UpdateStaffRequest;
import com.smashflow.backend.dto.response.staff.StaffResponse;
import com.smashflow.backend.exception.ResourceNotFoundException;
import com.smashflow.backend.model.User;
import com.smashflow.backend.model.enums.Role;
import com.smashflow.backend.model.enums.UserStatus;
import com.smashflow.backend.repository.BookingRepository;
import com.smashflow.backend.repository.RecurringBookingRepository;
import com.smashflow.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StaffManagementService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final RecurringBookingRepository recurringBookingRepository;
    private final PasswordEncoder passwordEncoder;

    // 1. Lấy danh sách nhân viên
    public List<StaffResponse> getAllStaffs() {
        return userRepository.findByRoleOrderByIdDesc(Role.STAFF)
                .stream()
                .map(StaffResponse::fromUser)
                .toList();
    }

    // 2. Tạo tài khoản nhân viên mới
    @Transactional
    public StaffResponse createStaff(CreateStaffRequest request) {
        String email = request.email().trim().toLowerCase();
        String phone = request.phone().trim();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email này đã được sử dụng!");
        }

        if (userRepository.existsByPhoneNumber(phone)) {
            throw new IllegalArgumentException("Số điện thoại này đã được sử dụng!");
        }

        User staff = new User();
        staff.setFullName(request.fullName().trim());
        staff.setEmail(email);
        staff.setPhoneNumber(phone);
        staff.setRole(Role.STAFF);
        staff.setStatus(UserStatus.ACTIVE);
        staff.setCreatedAt(LocalDateTime.now());
        // Mật khẩu mặc định khởi tạo là Staff@123
        staff.setPassword(passwordEncoder.encode("Staff@123"));
        staff.setEmailVerified(true);

        User saved = userRepository.save(staff);
        return StaffResponse.fromUser(saved);
    }

    // 3. Sửa thông tin tài khoản nhân viên
    @Transactional
    public StaffResponse updateStaff(Long id, UpdateStaffRequest request) {
        User staff = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản nhân viên với ID: " + id));

        if (staff.getRole() != Role.STAFF) {
            throw new IllegalArgumentException("Tài khoản này không phải là nhân viên!");
        }

        String email = request.email().trim().toLowerCase();
        String phone = request.phone().trim();

        userRepository.findByEmail(email).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Email này đã được sử dụng bởi tài khoản khác!");
            }
        });

        userRepository.findByPhoneNumber(phone).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException("Số điện thoại này đã được sử dụng bởi tài khoản khác!");
            }
        });

        staff.setFullName(request.fullName().trim());
        staff.setEmail(email);
        staff.setPhoneNumber(phone);

        User updated = userRepository.save(staff);
        return StaffResponse.fromUser(updated);
    }

    // 4. Khóa / Mở khóa trạng thái tài khoản
    @Transactional
    public StaffResponse updateStaffStatus(Long id, String statusStr) {
        User staff = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản nhân viên với ID: " + id));

        if (staff.getRole() != Role.STAFF) {
            throw new IllegalArgumentException("Tài khoản này không phải là nhân viên!");
        }

        UserStatus newStatus;
        try {
            newStatus = UserStatus.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ! Chỉ chấp nhận ACTIVE hoặc LOCKED");
        }

        staff.setStatus(newStatus);
        User updated = userRepository.save(staff);
        return StaffResponse.fromUser(updated);
    }

    // 5. Xóa tài khoản nhân viên (Check ràng buộc)
    @Transactional
    public void deleteStaff(Long id) {
        User staff = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản nhân viên với ID: " + id));

        if (staff.getRole() != Role.STAFF) {
            throw new IllegalArgumentException("Tài khoản này không phải là nhân viên!");
        }

        // Kiểm tra xem nhân viên đã có lịch sử tạo hoặc thu tiền đơn booking nào chưa
        boolean hasBookings = bookingRepository.existsByCreatedByStaff_IdOrPaidByStaff_Id(id, id);
        boolean hasRecurringBookings = recurringBookingRepository.existsByCreatedByStaff_Id(id);

        if (hasBookings || hasRecurringBookings) {
            throw new IllegalArgumentException(
                    "Nhân viên này đã có lịch sử tạo/xử lý đơn đặt sân trên hệ thống, không thể xóa! Vui lòng dùng tính năng Khóa tài khoản.");
        }

        userRepository.delete(staff);
    }
}