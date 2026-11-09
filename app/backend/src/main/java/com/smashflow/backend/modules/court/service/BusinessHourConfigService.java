package com.smashflow.backend.modules.court.service;

import org.springframework.stereotype.Service;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.court.dto.request.UpdateBusinessHourRequest;
import com.smashflow.backend.modules.court.dto.response.BusinessHourResponse;
import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BusinessHourConfigService {
    private final BusinessHourConfigRepository businessHourRepo;

    public BusinessHourResponse get() {
        return toResponse(getConfig());
    }

    public BusinessHourResponse update(UpdateBusinessHourRequest request) {
        validate(request);
        BusinessHourConfig hour = getConfig();

        hour.setOpeningTime(request.openingTime());
        hour.setClosingTime(request.closingTime());
        hour.setPeakStartTime(request.peakStartTime());
        hour.setPeakEndTime(request.peakEndTime());

        hour = businessHourRepo.save(hour);

        return toResponse(hour);
    }

    private BusinessHourConfig getConfig() {
        return businessHourRepo.findById((short) 1)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cấu hình giờ hoạt động"));
    }

    private void validate(UpdateBusinessHourRequest request) {
        if (!request.openingTime().isBefore(request.closingTime())) {
            throw new IllegalArgumentException("Giờ đóng cửa phải sau giờ mở cửa");
        }
        if (!request.peakStartTime().isBefore(request.peakEndTime())
                || request.peakStartTime().isBefore(request.openingTime())
                || request.peakEndTime().isAfter(request.closingTime())) {
            throw new IllegalArgumentException("Khung giờ cao điểm không hợp lệ");
        }
    }

    private BusinessHourResponse toResponse(BusinessHourConfig hour) {
        return new BusinessHourResponse(hour.getOpeningTime(), hour.getClosingTime(), hour.getPeakStartTime(),
                hour.getPeakEndTime());
    }
}
