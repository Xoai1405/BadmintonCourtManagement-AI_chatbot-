package com.smashflow.backend.modules.discounts;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.pricing.dto.request.DiscountConfigRequest;
import com.smashflow.backend.modules.pricing.dto.response.DiscountConfigResponse;
import com.smashflow.backend.modules.pricing.model.DiscountConfig;
import com.smashflow.backend.modules.pricing.model.enums.DiscountStatus;
import com.smashflow.backend.modules.pricing.repository.DiscountConfigRepository;
import com.smashflow.backend.modules.pricing.service.DiscountConfigService;

@ExtendWith(MockitoExtension.class)
class DiscountTest {

    @Mock
    private DiscountConfigRepository discountConfigRepository;

    @Mock
    private RecurringBookingRepository recurringBookingRepository;

    @InjectMocks
    private DiscountConfigService discountConfigService;

    @Test
    @DisplayName("Giảm giá 1: Thêm mới mốc chiết khấu thành công")
    void testCreateConfig_Success() {
        DiscountConfigRequest request = new DiscountConfigRequest(6, new BigDecimal("15.0"), DiscountStatus.ACTIVE);
        when(discountConfigRepository.existsByMinMonths(6)).thenReturn(false);
        when(discountConfigRepository.save(any(DiscountConfig.class))).thenAnswer(inv -> {
            DiscountConfig c = inv.getArgument(0);
            return new DiscountConfig(1L, c.getMinMonths(), c.getDiscountPercent(), c.getStatus());
        });

        DiscountConfigResponse response = discountConfigService.createConfig(request);

        assertNotNull(response);
        assertEquals(6, response.minMonths());
        assertEquals(new BigDecimal("15.0"), response.discountPercent());
    }

    @Test
    @DisplayName("Giảm giá 2: Chặn thêm mới khi trùng số tháng đã có")
    void testCreateConfig_DuplicateMinMonths_ShouldThrowException() {
        DiscountConfigRequest request = new DiscountConfigRequest(3, new BigDecimal("10.0"), DiscountStatus.ACTIVE);
        when(discountConfigRepository.existsByMinMonths(3)).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                discountConfigService.createConfig(request)
        );

        assertTrue(ex.getMessage().contains("đã tồn tại"));
    }

    @Test
    @DisplayName("Giảm giá 3: Chặn xóa mốc chiết khấu nếu đã có đơn đặt lịch cố định áp dụng")
    void testDeleteConfig_WhenReferenced_ShouldThrowException() {
        Long configId = 1L;
        when(discountConfigRepository.existsById(configId)).thenReturn(true);
        when(recurringBookingRepository.existsByDiscountConfigId(configId)).thenReturn(true);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                discountConfigService.deleteConfig(configId)
        );

        assertTrue(ex.getMessage().contains("Không thể xóa mốc chiết khấu này vì đã có đơn đặt lịch cố định áp dụng"));
        verify(discountConfigRepository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("Giảm giá 4: Xóa thành công khi chưa có đơn nào áp dụng")
    void testDeleteConfig_Success() {
        Long configId = 1L;
        when(discountConfigRepository.existsById(configId)).thenReturn(true);
        when(recurringBookingRepository.existsByDiscountConfigId(configId)).thenReturn(false);

        assertDoesNotThrow(() -> discountConfigService.deleteConfig(configId));
        verify(discountConfigRepository, times(1)).deleteById(configId);
    }

    @Test
    @DisplayName("Giảm giá 5 (Biên): Lấy danh sách sắp xếp tăng dần theo số tháng")
    void testGetAllConfigs_ShouldReturnSortedList() {
        DiscountConfig c1 = new DiscountConfig(1L, 1, new BigDecimal("5.0"), DiscountStatus.ACTIVE);
        DiscountConfig c2 = new DiscountConfig(2L, 3, new BigDecimal("10.0"), DiscountStatus.ACTIVE);
        when(discountConfigRepository.findAll(any(Sort.class))).thenReturn(List.of(c1, c2));

        List<DiscountConfigResponse> list = discountConfigService.getAllConfigs();

        assertEquals(2, list.size());
        assertEquals(1, list.get(0).minMonths());
        assertEquals(3, list.get(1).minMonths());
    }

    @Test
    @DisplayName("Giảm giá 6 (Biên): Cập nhật mốc chiết khấu thành công")
    void testUpdateConfig_Success() {
        Long configId = 1L;
        DiscountConfig existing = new DiscountConfig(configId, 3, new BigDecimal("10.0"), DiscountStatus.ACTIVE);
        DiscountConfigRequest updateRequest = new DiscountConfigRequest(3, new BigDecimal("12.0"), DiscountStatus.ACTIVE);

        when(discountConfigRepository.findById(configId)).thenReturn(Optional.of(existing));
        when(discountConfigRepository.findByMinMonths(3)).thenReturn(Optional.of(existing));
        when(discountConfigRepository.save(any(DiscountConfig.class))).thenAnswer(inv -> inv.getArgument(0));

        DiscountConfigResponse response = discountConfigService.updateConfig(configId, updateRequest);

        assertNotNull(response);
        assertEquals(new BigDecimal("12.0"), response.discountPercent());
    }

    @Test
    @DisplayName("Giảm giá 7 (Biên): Chặn cập nhật khi số tháng mới trùng với cấu hình khác")
    void testUpdateConfig_DuplicateWithOther_ShouldThrowException() {
        Long configId = 1L;
        DiscountConfig current = new DiscountConfig(configId, 1, new BigDecimal("5.0"), DiscountStatus.ACTIVE);
        DiscountConfig other = new DiscountConfig(2L, 3, new BigDecimal("10.0"), DiscountStatus.ACTIVE);
        DiscountConfigRequest updateRequest = new DiscountConfigRequest(3, new BigDecimal("8.0"), DiscountStatus.ACTIVE);

        when(discountConfigRepository.findById(configId)).thenReturn(Optional.of(current));
        when(discountConfigRepository.findByMinMonths(3)).thenReturn(Optional.of(other));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                discountConfigService.updateConfig(configId, updateRequest)
        );

        assertTrue(ex.getMessage().contains("đã tồn tại ở cấu hình khác"));
    }
}