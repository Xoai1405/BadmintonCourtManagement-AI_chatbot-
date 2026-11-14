package com.smashflow.backend.modules.booking.addon.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.addon.dto.ServiceRequest;
import com.smashflow.backend.modules.booking.addon.dto.ServiceResponse;
import com.smashflow.backend.modules.booking.addon.enums.ServiceStatus;
import com.smashflow.backend.modules.booking.addon.repository.ServiceRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ServiceCatalogService {
    private final ServiceRepository repository;

    @Transactional(readOnly = true)
    public List<ServiceResponse> list() {
        return repository.findByDeletedAtIsNullOrderByIdAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public ServiceResponse create(ServiceRequest request) {
        com.smashflow.backend.modules.booking.addon.model.Service service = new com.smashflow.backend.modules.booking.addon.model.Service();
        apply(service, request);
        service.setStatus(ServiceStatus.ACTIVE);
        return toResponse(repository.save(service));
    }

    @Transactional
    public ServiceResponse update(Long id, ServiceRequest request) {
        var service = findActive(id);
        apply(service, request);
        return toResponse(repository.save(service));
    }

    @Transactional
    public ServiceResponse setStatus(Long id, ServiceStatus status) {
        var service = findActive(id);
        service.setStatus(status);
        return toResponse(repository.save(service));
    }

    @Transactional
    public void delete(Long id) {
        var service = findActive(id);
        service.setDeletedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")));
        repository.save(service);
    }

    private com.smashflow.backend.modules.booking.addon.model.Service findActive(Long id) {
        return repository.findAvailableByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));
    }

    private void apply(com.smashflow.backend.modules.booking.addon.model.Service service, ServiceRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty() || name.length() > 100) throw new IllegalArgumentException("Tên dịch vụ phải có từ 1 đến 100 ký tự");
        BigDecimal price = request.unitPrice();
        if (price.signum() < 0 || price.scale() > 2 || price.precision() - price.scale() > 10) {
            throw new IllegalArgumentException("Đơn giá phải không âm và phù hợp DECIMAL(12,2)");
        }
        service.setName(name);
        service.setCategory(request.category());
        service.setUnitPrice(price);
    }

    private ServiceResponse toResponse(com.smashflow.backend.modules.booking.addon.model.Service service) {
        return new ServiceResponse(service.getId(), service.getName(), service.getCategory(),
                service.getUnitPrice(), service.getStatus());
    }
}
