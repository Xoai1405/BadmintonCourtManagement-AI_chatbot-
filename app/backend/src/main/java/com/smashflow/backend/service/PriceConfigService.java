package com.smashflow.backend.service;

import org.springframework.stereotype.Service;
import java.util.List;

import com.smashflow.backend.dto.request.UpdatePriceConfigRequest;
import com.smashflow.backend.dto.response.PriceConfigResponse;
import com.smashflow.backend.exception.ResourceNotFoundException;
import com.smashflow.backend.model.PriceConfig;
import com.smashflow.backend.repository.PriceConfigRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PriceConfigService {
    private final PriceConfigRepository priceConfigRepo;

    public List<PriceConfigResponse> getAll() {
        return priceConfigRepo.findAll().stream().map(this::toResponse).toList();
    }

    public PriceConfigResponse update(UpdatePriceConfigRequest request) {
        PriceConfig priceConfig = priceConfigRepo.findByCourtType(request.courtType())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cấu hình giá cho loại sân"));

        priceConfig.setPriceNormalHour(request.priceNormalHour());
        priceConfig.setPricePeakHour(request.pricePeakHour());

        priceConfig = priceConfigRepo.save(priceConfig);

        return toResponse(priceConfig);
    }

    private PriceConfigResponse toResponse(PriceConfig priceConfig) {
        return new PriceConfigResponse(priceConfig.getId(), priceConfig.getCourtType(),
                priceConfig.getPriceNormalHour(), priceConfig.getPricePeakHour());
    }
}
