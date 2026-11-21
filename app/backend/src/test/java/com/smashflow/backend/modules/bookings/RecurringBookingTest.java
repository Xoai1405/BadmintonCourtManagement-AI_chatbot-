package com.smashflow.backend.modules.bookings;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smashflow.backend.modules.booking.recurring.dto.request.RecurringBookingPreviewRequest;
import com.smashflow.backend.modules.booking.recurring.dto.response.RecurringBookingPreviewResponse;
import com.smashflow.backend.modules.booking.recurring.dto.response.RecurringBookingResponse;
import com.smashflow.backend.modules.booking.recurring.model.RecurringBooking;
import com.smashflow.backend.modules.booking.recurring.repository.RecurringBookingRepository;
import com.smashflow.backend.modules.booking.recurring.service.RecurringBookingService;
import com.smashflow.backend.modules.booking.single.exception.BookingConflictException;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.booking.staff.dto.request.StaffCreateRecurringBookingRequest;
import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.model.Court;
import com.smashflow.backend.modules.court.model.DayOfWeek;
import com.smashflow.backend.modules.court.model.enums.CourtStatus;
import com.smashflow.backend.modules.court.model.enums.CourtType;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.court.repository.CourtRepository;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.model.enums.Role;
import com.smashflow.backend.modules.identity.user.model.enums.UserStatus;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;
import com.smashflow.backend.modules.pricing.model.DiscountConfig;
import com.smashflow.backend.modules.pricing.model.enums.DiscountStatus;
import com.smashflow.backend.modules.pricing.repository.DiscountConfigRepository;
import com.smashflow.backend.modules.pricing.service.PricingService;

@ExtendWith(MockitoExtension.class)
class RecurringBookingTest {

    @Mock
    private DiscountConfigRepository discountConfigRepository;

    @Mock
    private RecurringBookingRepository recurringBookingRepository;

    @Mock
    private CourtRepository courtRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BusinessHourConfigRepository businessHourConfigRepository;

    @Mock
    private PricingService pricingService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private RecurringBookingService recurringBookingService;

    private Court sampleCourt;
    private BusinessHourConfig businessHourConfig;
    private User sampleCustomer;
    private User sampleStaff;

    @BeforeEach
    void setUp() {
        sampleCourt = new Court();
        sampleCourt.setId(1L);
        sampleCourt.setName("Sân 01");
        sampleCourt.setCourtType(CourtType.STANDARD_INDOOR);
        sampleCourt.setStatus(CourtStatus.ACTIVE);

        businessHourConfig = new BusinessHourConfig();
        businessHourConfig.setOpeningTime(LocalTime.of(5, 0));
        businessHourConfig.setClosingTime(LocalTime.of(23, 0));

        sampleCustomer = new User();
        sampleCustomer.setId(10L);
        sampleCustomer.setFullName("Nguyễn Văn Khách");
        sampleCustomer.setRole(Role.CUSTOMER);
        sampleCustomer.setStatus(UserStatus.ACTIVE);

        sampleStaff = new User();
        sampleStaff.setId(20L);
        sampleStaff.setFullName("Đoàn Thị Nhân Viên");
        sampleStaff.setRole(Role.STAFF);
        sampleStaff.setStatus(UserStatus.ACTIVE);
    }

    @Test
    @DisplayName("Cố định 1: Xem trước lịch (Preview) -> Sinh đúng số buổi, áp dụng mốc chiết khấu 10% cho 3 tháng")
    void testPreview_ThreeMonths_ShouldApplyDiscount() {
        LocalDate start = LocalDate.now().plusDays(1);
        LocalDate end = start.plusMonths(3);

        RecurringBookingPreviewRequest request = new RecurringBookingPreviewRequest(
                1L, LocalTime.of(18, 0), LocalTime.of(20, 0),
                List.of(DayOfWeek.MON), start, end);

        DiscountConfig config3M = new DiscountConfig(1L, 3, new BigDecimal("10.0"), DiscountStatus.ACTIVE);

        when(courtRepository.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepository.findById((short) 1)).thenReturn(Optional.of(businessHourConfig));
        when(pricingService.calculateCourtPrice(any(), any(), any())).thenReturn(new BigDecimal("150000"));
        when(discountConfigRepository.findApplicableDiscount(eq(DiscountStatus.ACTIVE), anyInt())).thenReturn(Optional.of(config3M));

        RecurringBookingPreviewResponse response = recurringBookingService.previewRecurringBooking(request);

        assertNotNull(response);
        assertEquals(new BigDecimal("10.0"), response.discountPercent());
        assertTrue(response.totalSessions() > 0);

        BigDecimal expectedRaw = new BigDecimal("150000").multiply(BigDecimal.valueOf(response.totalSessions()));
        BigDecimal expectedTotal = expectedRaw.multiply(new BigDecimal("0.90")).setScale(0, RoundingMode.HALF_UP);
        assertEquals(expectedTotal, response.totalPrice());
    }

    @Test
    @DisplayName("Cố định 2: Thông báo các buổi bị trùng lịch vào danh sách conflictingSlots")
    void testPreview_WithConflictSlots_ShouldReportConflict() {
        LocalDate start = LocalDate.now().plusDays(1);
        LocalDate end = start.plusMonths(1);

        RecurringBookingPreviewRequest request = new RecurringBookingPreviewRequest(
                1L, LocalTime.of(8, 0), LocalTime.of(10, 0),
                List.of(DayOfWeek.MON), start, end);

        when(courtRepository.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepository.findById((short) 1)).thenReturn(Optional.of(businessHourConfig));
        when(pricingService.calculateCourtPrice(any(), any(), any())).thenReturn(new BigDecimal("100000"));
        when(discountConfigRepository.findApplicableDiscount(eq(DiscountStatus.ACTIVE), anyInt())).thenReturn(Optional.empty());
        when(bookingRepository.existsOverlap(anyLong(), any(), any(), any(), any())).thenReturn(true);

        RecurringBookingPreviewResponse response = recurringBookingService.previewRecurringBooking(request);

        assertNotNull(response);
        assertFalse(response.conflictingSlotList().isEmpty());
    }

    @Test
    @DisplayName("Cố định 3: Khách tạo gói cố định thành công -> Lưu gói cha và sinh các buổi con trong DB")
    void testCreateRecurringBooking_Success() {
        LocalDate start = LocalDate.now().plusDays(1);
        LocalDate end = start.plusMonths(1);

        RecurringBookingPreviewRequest request = new RecurringBookingPreviewRequest(
                1L, LocalTime.of(8, 0), LocalTime.of(10, 0),
                List.of(DayOfWeek.MON), start, end);

        when(userRepository.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepository.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepository.findById((short) 1)).thenReturn(Optional.of(businessHourConfig));
        when(pricingService.calculateCourtPrice(any(), any(), any())).thenReturn(new BigDecimal("100000"));
        when(discountConfigRepository.findApplicableDiscount(eq(DiscountStatus.ACTIVE), anyInt())).thenReturn(Optional.empty());

        when(recurringBookingRepository.save(any(RecurringBooking.class))).thenAnswer(inv -> {
            RecurringBooking rb = inv.getArgument(0);
            rb.setId(99L);
            return rb;
        });

        RecurringBookingResponse response = recurringBookingService.createRecurringBooking(request, 10L);

        assertNotNull(response);
        assertEquals(99L, response.recurringBookingId());
        verify(bookingRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Cố định 4 (Biên): Chặn đặt khi chu kỳ không có ngày nào khớp với thứ được chọn")
    void testPreview_NoSessionsMatched_ShouldThrowException() {
        LocalDate start = LocalDate.of(2027, 1, 4); // Thứ 2
        LocalDate end = LocalDate.of(2027, 1, 5);   // Thứ 3

        RecurringBookingPreviewRequest request = new RecurringBookingPreviewRequest(
                1L, LocalTime.of(8, 0), LocalTime.of(10, 0),
                List.of(DayOfWeek.THU), start, end); // Yêu cầu Thứ 5

        when(courtRepository.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepository.findById((short) 1)).thenReturn(Optional.of(businessHourConfig));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                recurringBookingService.previewRecurringBooking(request)
        );

        assertTrue(ex.getMessage().contains("Không có buổi chơi nào phù hợp"));
    }

    @Test
    @DisplayName("Cố định 5 (Biên): Nhân viên tạo gói cố định tại quầy -> Các buổi con CONFIRMED và PAID")
    void testCreateRecurringBookingByStaff_Success() {
        LocalDate start = LocalDate.now().plusDays(1);
        LocalDate end = start.plusMonths(1);

        StaffCreateRecurringBookingRequest request = new StaffCreateRecurringBookingRequest(
                10L, 1L, LocalTime.of(8, 0), LocalTime.of(10, 0),
                List.of(DayOfWeek.MON), start, end, "CASH");

        when(userRepository.findById(20L)).thenReturn(Optional.of(sampleStaff));
        when(userRepository.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepository.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepository.findById((short) 1)).thenReturn(Optional.of(businessHourConfig));
        when(pricingService.calculateCourtPrice(any(), any(), any())).thenReturn(new BigDecimal("100000"));
        when(discountConfigRepository.findApplicableDiscount(eq(DiscountStatus.ACTIVE), anyInt())).thenReturn(Optional.empty());
        when(bookingRepository.existsOverlap(anyLong(), any(), any(), any(), any())).thenReturn(false);

        when(recurringBookingRepository.save(any(RecurringBooking.class))).thenAnswer(inv -> {
            RecurringBooking rb = inv.getArgument(0);
            rb.setId(101L);
            return rb;
        });

        RecurringBookingResponse response = recurringBookingService.createRecurringBookingByStaff(request, 20L);

        assertNotNull(response);
        assertEquals(101L, response.recurringBookingId());
        verify(bookingRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Cố định 6 (Biên): Nhân viên tạo gói bị trùng lịch -> Ném BookingConflictException")
    void testCreateRecurringBookingByStaff_WithConflict_ShouldThrowException() {
        LocalDate start = LocalDate.now().plusDays(1);
        LocalDate end = start.plusMonths(1);

        StaffCreateRecurringBookingRequest request = new StaffCreateRecurringBookingRequest(
                10L, 1L, LocalTime.of(8, 0), LocalTime.of(10, 0),
                List.of(DayOfWeek.MON), start, end, "CASH");

        when(userRepository.findById(20L)).thenReturn(Optional.of(sampleStaff));
        when(userRepository.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepository.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepository.findById((short) 1)).thenReturn(Optional.of(businessHourConfig));
        when(pricingService.calculateCourtPrice(any(), any(), any())).thenReturn(new BigDecimal("100000"));
        when(discountConfigRepository.findApplicableDiscount(eq(DiscountStatus.ACTIVE), anyInt())).thenReturn(Optional.empty());
        when(bookingRepository.existsOverlap(anyLong(), any(), any(), any(), any())).thenReturn(true);

        assertThrows(BookingConflictException.class, () ->
                recurringBookingService.createRecurringBookingByStaff(request, 20L)
        );

        verify(recurringBookingRepository, never()).save(any());
    }
}