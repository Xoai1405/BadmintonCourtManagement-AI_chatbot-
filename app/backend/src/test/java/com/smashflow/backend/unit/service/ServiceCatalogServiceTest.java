package com.smashflow.backend.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.addon.dto.request.ServiceRequest;
import com.smashflow.backend.modules.booking.addon.enums.Category;
import com.smashflow.backend.modules.booking.addon.enums.ServiceStatus;
import com.smashflow.backend.modules.booking.addon.repository.ServiceRepository;
import com.smashflow.backend.modules.booking.addon.service.ServiceCatalogService;

class ServiceCatalogServiceTest {
    private final ServiceRepository repository = mock(ServiceRepository.class);
    private final ServiceCatalogService catalog = new ServiceCatalogService(repository);

    @Test void createAndUpdateValidateInput() {
        when(repository.save(any())).thenAnswer(call -> call.getArgument(0));
        var created = catalog.create(new ServiceRequest("  Nước  ", Category.DRINK, new BigDecimal("10000")));
        assertEquals("Nước", created.name());
        assertEquals(ServiceStatus.ACTIVE, created.status());
        assertThrows(IllegalArgumentException.class,
                () -> catalog.create(new ServiceRequest(" ", Category.DRINK, BigDecimal.ZERO)));
        assertThrows(IllegalArgumentException.class,
                () -> catalog.create(new ServiceRequest("X", Category.DRINK, new BigDecimal("-1"))));
        assertThrows(IllegalArgumentException.class,
                () -> catalog.create(new ServiceRequest("X", Category.DRINK, new BigDecimal("1.123"))));
        assertThrows(IllegalArgumentException.class,
                () -> catalog.create(new ServiceRequest("X".repeat(101), Category.DRINK, BigDecimal.ONE)));
    }

    @Test void updateStatusAndSoftDeleteKeepRow() {
        var service = new com.smashflow.backend.modules.booking.addon.model.Service();
        service.setId(1L);
        service.setName("Nước");
        service.setUnitPrice(new BigDecimal("10000"));
        service.setCategory(Category.DRINK);
        service.setStatus(ServiceStatus.ACTIVE);
        when(repository.findAvailableByIdForUpdate(1L)).thenReturn(Optional.of(service));
        when(repository.save(service)).thenReturn(service);
        assertEquals("Nước mới", catalog.update(1L,
                new ServiceRequest("Nước mới", Category.OTHER, new BigDecimal("12000"))).name());
        assertEquals(ServiceStatus.OUT_OF_STOCK, catalog.setStatus(1L, ServiceStatus.OUT_OF_STOCK).status());
        catalog.delete(1L);
        assertNotNull(service.getDeletedAt());
        verify(repository, never()).delete(any());
    }

    @Test void listExcludesDeletedAndMissingIdIs404() {
        when(repository.findByDeletedAtIsNullOrderByIdAsc()).thenReturn(List.of());
        assertTrue(catalog.list().isEmpty());
        assertThrows(ResourceNotFoundException.class,
                () -> catalog.update(99L, new ServiceRequest("Nước", Category.DRINK, BigDecimal.ONE)));
    }
}
