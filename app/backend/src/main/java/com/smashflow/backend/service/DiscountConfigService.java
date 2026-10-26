package com.smashflow.backend.service;

import com.smashflow.backend.dto.request.discountConfig.DiscountConfigRequest;
import com.smashflow.backend.dto.response.discountConfig.DiscountConfigResponse;
import com.smashflow.backend.model.DiscountConfig;
import com.smashflow.backend.repository.DiscountConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiscountConfigService {
    private final DiscountConfigRepository discountConfigRepository;

    // 1. Lấy danh sách tất cả các mốc chiết khấu
    public List<DiscountConfigResponse> getAllConfigs() {
        return discountConfigRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // 2. Thêm mới một mốc chiết khấu
    public DiscountConfigResponse createConfig(DiscountConfigRequest request) {
        DiscountConfig config = new DiscountConfig();
        config.setMinMonths(request.minMonths());
        config.setDiscountPercent(request.discountPercent());
        config.setStatus(request.status());

        DiscountConfig savedConfig = discountConfigRepository.save(config);
        return mapToResponse(savedConfig);
    }

    // 3. Cập nhật mốc chiết khấu theo ID
    public DiscountConfigResponse updateConfig(Long id, DiscountConfigRequest request) {
        DiscountConfig config = discountConfigRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy cấu hình chiết khấu với ID: " + id));

        config.setMinMonths(request.minMonths());
        config.setDiscountPercent(request.discountPercent());
        config.setStatus(request.status());

        DiscountConfig updatedConfig = discountConfigRepository.save(config);
        return mapToResponse(updatedConfig);
    }

    // 4. Xóa mốc chiết khấu theo ID
    public void deleteConfig(Long id) {
        if (!discountConfigRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy cấu hình chiết khấu để xóa với ID: " + id);
        }
        discountConfigRepository.deleteById(id);
    }

    // Hàm phụ trợ để chuyển đổi từ Entity sang Response DTO
    private DiscountConfigResponse mapToResponse(DiscountConfig config) {
        return new DiscountConfigResponse(
                config.getId(),
                config.getMinMonths(),
                config.getDiscountPercent(),
                config.getStatus()
        );
    }
}
