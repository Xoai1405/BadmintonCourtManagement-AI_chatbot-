package com.smashflow.backend.modules.pricing.service;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.pricing.dto.request.DiscountConfigRequest;
import com.smashflow.backend.modules.pricing.dto.response.DiscountConfigResponse;
import com.smashflow.backend.modules.pricing.model.DiscountConfig;
import com.smashflow.backend.modules.pricing.repository.DiscountConfigRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiscountConfigService {

    private final DiscountConfigRepository discountConfigRepository;
    private final RecurringBookingRepository recurringBookingRepository;

    // 1. Lấy danh sách tất cả các mốc chiết khấu (tự động xếp tăng dần theo số
    // tháng)
    public List<DiscountConfigResponse> getAllConfigs() {
        return discountConfigRepository.findAll(Sort.by(Sort.Direction.ASC, "minMonths")).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // 2. Thêm mới một mốc chiết khấu (Kiểm tra không trùng số tháng)
    @Transactional
    public DiscountConfigResponse createConfig(DiscountConfigRequest request) {
        if (discountConfigRepository.existsByMinMonths(request.minMonths())) {
            throw new IllegalArgumentException("Mốc chiết khấu cho " + request.minMonths() + " tháng đã tồn tại!");
        }

        DiscountConfig config = new DiscountConfig();
        config.setMinMonths(request.minMonths());
        config.setDiscountPercent(request.discountPercent());
        config.setStatus(request.status());

        DiscountConfig savedConfig = discountConfigRepository.save(config);
        return mapToResponse(savedConfig);
    }

    // 3. Cập nhật mốc chiết khấu (Kiểm tra số tháng mới không trùng với mốc KHÁC)
    @Transactional
    public DiscountConfigResponse updateConfig(Long id, DiscountConfigRequest request) {
        DiscountConfig config = discountConfigRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cấu hình chiết khấu với ID: " + id));

        discountConfigRepository.findByMinMonths(request.minMonths()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new IllegalArgumentException(
                        "Mốc chiết khấu cho " + request.minMonths() + " tháng đã tồn tại ở cấu hình khác!");
            }
        });

        config.setMinMonths(request.minMonths());
        config.setDiscountPercent(request.discountPercent());
        config.setStatus(request.status());

        DiscountConfig updatedConfig = discountConfigRepository.save(config);
        return mapToResponse(updatedConfig);
    }

    // 4. Xóa mốc chiết khấu theo ID (Chặn nếu đã có đơn đặt lịch áp dụng)
    @Transactional
    public void deleteConfig(Long id) {
        if (!discountConfigRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy cấu hình chiết khấu để xóa với ID: " + id);
        }

        // RÀNG BUỘC: Kiểm tra tham chiếu từ bảng recurring_bookings
        boolean hasReference = recurringBookingRepository.existsByDiscountConfigId(id);
        if (hasReference) {
            throw new IllegalStateException("Không thể xóa mốc chiết khấu này vì đã có đơn đặt lịch cố định áp dụng!");
        }

        discountConfigRepository.deleteById(id);
    }

    // Hàm phụ trợ chuyển đổi sang DTO
    private DiscountConfigResponse mapToResponse(DiscountConfig config) {
        return new DiscountConfigResponse(
                config.getId(),
                config.getMinMonths(),
                config.getDiscountPercent(),
                config.getStatus());
    }
}