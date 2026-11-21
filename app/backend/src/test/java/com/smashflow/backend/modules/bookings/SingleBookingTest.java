package com.smashflow.backend.modules.bookings;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.smashflow.backend.modules.booking.single.dto.request.CreateBookingRequest;
import com.smashflow.backend.modules.booking.single.exception.BookingConflictException;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.booking.single.service.BookingService;
import com.smashflow.backend.modules.booking.staff.dto.request.StaffCreateBookingRequest;
import com.smashflow.backend.modules.booking.staff.dto.response.StaffBookingResponse;
import com.smashflow.backend.modules.booking.addon.repository.BookingServiceRepository;
import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.model.Court;
import com.smashflow.backend.modules.court.model.enums.CourtStatus;
import com.smashflow.backend.modules.court.model.enums.CourtType;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.court.repository.CourtRepository;
import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.model.enums.Role;
import com.smashflow.backend.modules.identity.user.model.enums.UserStatus;
import com.smashflow.backend.modules.identity.user.repository.UserRepository;
import com.smashflow.backend.modules.pricing.service.PricingService;

@ExtendWith(MockitoExtension.class)
class SingleBookingTest {

    @Mock
    private UserRepository userRepo;

    @Mock
    private CourtRepository courtRepo;

    @Mock
    private BookingRepository bookingRepo;

    @Mock
    private BusinessHourConfigRepository businessHourConfigRepo;

    @Mock
    private PricingService pricingService;

    @InjectMocks
    private BookingService bookingService;

    private User sampleCustomer;
    private User sampleStaff;
    private Court sampleCourt;
    private BusinessHourConfig businessConfig;

    @BeforeEach
    void setUp() {
        businessConfig = new BusinessHourConfig();
        businessConfig.setOpeningTime(LocalTime.of(5, 0));
        businessConfig.setClosingTime(LocalTime.of(23, 0));
        businessConfig.setPeakStartTime(LocalTime.of(17, 0));
        businessConfig.setPeakEndTime(LocalTime.of(20, 0));

        sampleCourt = new Court();
        sampleCourt.setId(1L);
        sampleCourt.setName("Sân 01");
        sampleCourt.setCourtType(CourtType.STANDARD_INDOOR);
        sampleCourt.setStatus(CourtStatus.ACTIVE);

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
    @DisplayName("Sân lẻ 1: Khách đặt thành công -> PENDING, UNPAID, hạn giữ chỗ 10 phút")
    void testCreateBooking_Success() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        CreateBookingRequest request = new CreateBookingRequest(1L, tomorrow, LocalTime.of(8, 0), LocalTime.of(10, 0));

        when(userRepo.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepo.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));
        when(bookingRepo.existsOverlap(anyLong(), any(), any(), any(), any())).thenReturn(false);
        when(pricingService.calculateCourtPrice(any(), any(), any())).thenReturn(new BigDecimal("200000"));
        when(bookingRepo.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        Booking booking = bookingService.createBooking(request, 10L);

        assertNotNull(booking);
        assertEquals(BookingStatus.PENDING, booking.getBookingStatus());
        assertEquals(PaymentStatus.UNPAID, booking.getPaymentStatus());
        assertNotNull(booking.getBookingCode());
        assertNotNull(booking.getExpireAt());
    }

    @Test
    @DisplayName("Sân lẻ 2: Chặn đặt trùng lịch -> Ném BookingConflictException")
    void testCreateBooking_Conflict_ShouldThrowException() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        CreateBookingRequest request = new CreateBookingRequest(1L, tomorrow, LocalTime.of(8, 0), LocalTime.of(10, 0));

        when(userRepo.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepo.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));
        when(bookingRepo.existsOverlap(anyLong(), any(), any(), any(), any())).thenReturn(true);

        assertThrows(BookingConflictException.class, () -> bookingService.createBooking(request, 10L));
        verify(bookingRepo, never()).save(any());
    }

    @Test
    @DisplayName("Sân lẻ 3: Chặn đặt khi sân bảo trì -> Ném IllegalArgumentException")
    void testCreateBooking_CourtMaintenance_ShouldThrowException() {
        sampleCourt.setStatus(CourtStatus.MAINTENANCE);
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        CreateBookingRequest request = new CreateBookingRequest(1L, tomorrow, LocalTime.of(8, 0), LocalTime.of(10, 0));

        when(userRepo.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepo.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> bookingService.createBooking(request, 10L));
        assertTrue(ex.getMessage().contains("Sân hiện không hoạt động"));
    }

    @Test
    @DisplayName("Sân lẻ 4: Giờ kết thúc trước giờ bắt đầu -> Ném IllegalArgumentException")
    void testCreateBooking_InvalidTime_ShouldThrowException() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        CreateBookingRequest request = new CreateBookingRequest(1L, tomorrow, LocalTime.of(10, 0), LocalTime.of(8, 0));

        when(userRepo.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepo.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> bookingService.createBooking(request, 10L));
        assertTrue(ex.getMessage().contains("Giờ kết thúc phải sau giờ bắt đầu"));
    }

    @Test
    @DisplayName("Sân lẻ 5 (Biên): Chặn đặt khi tài khoản khách bị khóa (LOCKED)")
    void testCreateBooking_CustomerLocked_ShouldThrowException() {
        sampleCustomer.setStatus(UserStatus.LOCKED);
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        CreateBookingRequest request = new CreateBookingRequest(1L, tomorrow, LocalTime.of(8, 0), LocalTime.of(10, 0));

        when(userRepo.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepo.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> bookingService.createBooking(request, 10L));
        assertTrue(ex.getMessage().contains("Tài khoản hiện không thể đặt sân"));
    }

    @Test
    @DisplayName("Sân lẻ 6 (Biên): Chặn đặt giờ lẻ không đúng mốc 30 phút (08:15)")
    void testCreateBooking_NotHalfHourSlot_ShouldThrowException() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        CreateBookingRequest request = new CreateBookingRequest(1L, tomorrow, LocalTime.of(8, 15), LocalTime.of(9, 15));

        when(userRepo.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepo.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> bookingService.createBooking(request, 10L));
        assertTrue(ex.getMessage().contains("mốc 30 phút"));
    }

    @Test
    @DisplayName("Sân lẻ 7 (Biên): Chặn đặt giờ ngoài giờ hoạt động (04:00 sáng)")
    void testCreateBooking_OutsideBusinessHours_ShouldThrowException() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        CreateBookingRequest request = new CreateBookingRequest(1L, tomorrow, LocalTime.of(4, 0), LocalTime.of(6, 0));

        when(userRepo.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepo.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> bookingService.createBooking(request, 10L));
        assertTrue(ex.getMessage().contains("Sân chỉ hoạt động"));
    }

    @Test
    @DisplayName("Sân lẻ 8: Nhân viên đặt tại quầy -> Trạng thái CONFIRMED và PAID ngay")
    void testCreateBookingByStaff_Success() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        StaffCreateBookingRequest request = new StaffCreateBookingRequest(
                10L, 1L, tomorrow, LocalTime.of(8, 0), LocalTime.of(10, 0), "CASH");

        when(userRepo.findById(20L)).thenReturn(Optional.of(sampleStaff));
        when(userRepo.findById(10L)).thenReturn(Optional.of(sampleCustomer));
        when(courtRepo.findById(1L)).thenReturn(Optional.of(sampleCourt));
        when(businessHourConfigRepo.findById((short) 1)).thenReturn(Optional.of(businessConfig));
        when(bookingRepo.existsOverlap(anyLong(), any(), any(), any(), any())).thenReturn(false);
        when(pricingService.calculateCourtPrice(any(), any(), any())).thenReturn(new BigDecimal("200000"));
        when(bookingRepo.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        StaffBookingResponse response = bookingService.createBookingByStaff(request, 20L);

        assertNotNull(response);
        assertEquals(BookingStatus.CONFIRMED, response.bookingStatus());
        assertEquals(PaymentStatus.PAID, response.paymentStatus());
        assertEquals("CASH", response.paymentMethod());
        assertNull(response.expireAt());
    }
}