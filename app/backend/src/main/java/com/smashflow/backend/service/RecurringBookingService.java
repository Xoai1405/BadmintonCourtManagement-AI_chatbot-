package com.smashflow.backend.service;

import com.smashflow.backend.dto.request.recurringBooking.RecurringBookingPreviewRequest;
import com.smashflow.backend.dto.response.recurringBooking.RecurringBookingPreviewResponse;
import com.smashflow.backend.dto.response.recurringBooking.RecurringBookingResponse;
import com.smashflow.backend.dto.response.recurringBooking.SingleConflictResponse;
import com.smashflow.backend.exception.BookingConflictException;
import com.smashflow.backend.exception.ResourceNotFoundException;
import com.smashflow.backend.model.*;
import com.smashflow.backend.model.enums.*;
import com.smashflow.backend.repository.*;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecurringBookingService {

    private final BookingRepository bookingRepository;
    private final CourtRepository courtRepository;
    private final DiscountConfigRepository discountConfigRepository;
    private final BusinessHourConfigRepository businessHourConfigRepository;
    private final PricingService pricingService;
    private final UserRepository userRepository;
    private final RecurringBookingRepository recurringBookingRepository;

    // Các trạng thái booking được coi là "đang chiếm chỗ"
    private static final List<BookingStatus> BLOCKING_STATUSES = List.of(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN
    );

    /**
     * SCRUM-19: Kiểm tra trùng lịch hàng loạt cho cả chu kỳ đặt sân cố định.
     * Tái sử dụng existsOverlap() từ BookingRepository (đã xây dựng ở SCRUM-15).
     * Luồng xử lý:
     * 1. Validate đầu vào (sân tồn tại, còn hoạt động, giờ hợp lệ)
     * 2. Sinh danh sách tất cả các ngày trong chu kỳ khớp với daysOfWeek
     * 3. Kiểm tra trùng lịch từng ngày bằng existsOverlap()
     * 4. Tính tổng tiền (giá * số buổi) + áp dụng chiết khấu theo số tháng
     * 5. Trả về preview gồm: danh sách ngày bị trùng, tổng buổi, % giảm giá, tổng tiền
     */
    public RecurringBookingPreviewResponse previewRecurringBooking(RecurringBookingPreviewRequest request) {

        // 1. Validate sân
        Court court = courtRepository.findById(request.courtId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân với ID: " + request.courtId()));

        if (court.getStatus() != CourtStatus.ACTIVE) {
            throw new IllegalArgumentException("Sân hiện không hoạt động");
        }

        // 2. Validate thời gian
        if (!request.endTime().isAfter(request.startTime())) {
            throw new IllegalArgumentException("Giờ kết thúc phải sau giờ bắt đầu");
        }

        if (!request.endDate().isAfter(request.startDate())) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
        }

        // Lấy giờ hoạt động từ DB thay vì hardcode
        BusinessHourConfig businessConfig = businessHourConfigRepository.findById((short) 1)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có cấu hình giờ hoạt động của hệ thống"));

        if (request.startTime().isBefore(businessConfig.getOpeningTime())
                || request.endTime().isAfter(businessConfig.getClosingTime())) {
            throw new IllegalArgumentException(
                    "Sân chỉ hoạt động từ " + businessConfig.getOpeningTime()
                    + " đến " + businessConfig.getClosingTime());
        }

        // 3. Sinh tất cả ngày trong chu kỳ khớp với daysOfWeek được yêu cầu
        List<LocalDate> allSessionDates = generateSessionDates(
                request.startDate(),
                request.endDate(),
                request.daysOfWeek()
        );

        // 4. Kiểm tra trùng lịch từng ngày — tái sử dụng existsOverlap() từ SCRUM-15
        List<SingleConflictResponse> conflictingSlots = new ArrayList<>();

        for (LocalDate date : allSessionDates) {
            boolean hasConflict = bookingRepository.existsOverlap(
                    court.getId(),
                    date,
                    request.startTime(),
                    request.endTime(),
                    BLOCKING_STATUSES
            );

            if (hasConflict) {
                conflictingSlots.add(new SingleConflictResponse(
                        date,
                        date.getDayOfWeek().name(), // Trả về tên ngày tiếng Anh: MONDAY, TUESDAY,...
                        request.startTime(),
                        request.endTime()
                ));
            }
        }

        // 5. Tổng số buổi trong chu kỳ (kể cả buổi conflict — đây là giá trọn gói)
        int totalSessions = allSessionDates.size();

        // 6. Tính giá 1 buổi dựa trên loại sân và khung giờ
        BigDecimal pricePerSession = pricingService.calculateCourtPrice(
                court.getCourtType(),
                request.startTime(),
                request.endTime()
        );

        // 7. Tính số tháng của chu kỳ để tra cứu chiết khấu
        long totalMonths = ChronoUnit.MONTHS.between(request.startDate(), request.endDate());
        // Làm tròn lên: 1 tháng 15 ngày vẫn tính là 2 tháng để tra chiết khấu
        if (ChronoUnit.DAYS.between(
                request.startDate().plusMonths(totalMonths),
                request.endDate()) > 0) {
            totalMonths++;
        }

        // 8. Tra bảng DiscountConfig lấy mức chiết khấu phù hợp nhất
        BigDecimal discountPercent = BigDecimal.ZERO;
        DiscountConfig applicableDiscount = discountConfigRepository
                .findApplicableDiscount(DiscountStatus.ACTIVE, (int) totalMonths)
                .orElse(null);

        if (applicableDiscount != null) {
            discountPercent = applicableDiscount.getDiscountPercent();
        }

        // 9. Tính tổng tiền toàn bộ chu kỳ (tất cả 13 buổi, kể cả buổi conflict)
        // conflictingSlotList chỉ để thông báo — khách tự quyết định xử lý
        BigDecimal rawTotal = pricePerSession.multiply(BigDecimal.valueOf(totalSessions));

        // Áp dụng chiết khấu: totalPrice = rawTotal * (1 - discountPercent/100)
        BigDecimal discountMultiplier = BigDecimal.ONE
                .subtract(discountPercent.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP));
        BigDecimal totalPrice = rawTotal.multiply(discountMultiplier).setScale(0, RoundingMode.HALF_UP);

        return new RecurringBookingPreviewResponse(
                conflictingSlots,
                totalSessions,
                discountPercent,
                totalPrice
        );
    }

    /**
     * Sinh danh sách tất cả ngày trong khoảng [startDate, endDate]
     * mà trùng với các thứ trong tuần được yêu cầu (daysOfWeek).
     * Mapping từ DayOfWeek enum của project sang java.time.DayOfWeek:
     * MON→MONDAY, TUE→TUESDAY, WES→WEDNESDAY, THU→THURSDAY,
     * FRI→FRIDAY, SAT→SATURDAY, SUN→SUNDAY
     */
    private List<LocalDate> generateSessionDates(
            LocalDate startDate,
            LocalDate endDate,
            List<DayOfWeek> daysOfWeek) {

        List<LocalDate> dates = new ArrayList<>();

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            DayOfWeek projectDayOfWeek = toProjectDayOfWeek(date.getDayOfWeek());
            if (daysOfWeek.contains(projectDayOfWeek)) {
                dates.add(date);
            }
        }

        return dates;
    }

    /**
     * Chuyển đổi java.time.DayOfWeek sang DayOfWeek enum của project.
     * Lưu ý: WES = Wednesday (Thứ 4) theo convention trong project.
     */
    private DayOfWeek toProjectDayOfWeek(java.time.DayOfWeek javaDayOfWeek) {
        return switch (javaDayOfWeek) {
            case MONDAY    -> DayOfWeek.MON;
            case TUESDAY   -> DayOfWeek.TUE;
            case WEDNESDAY -> DayOfWeek.WES;
            case THURSDAY  -> DayOfWeek.THU;
            case FRIDAY    -> DayOfWeek.FRI;
            case SATURDAY  -> DayOfWeek.SAT;
            case SUNDAY    -> DayOfWeek.SUN;
        };
    }


















    /**
     * SCRUM-31: Tạo gói đặt lịch cố định và tự động sinh các buổi lẻ trong DB
     */
    @Transactional
    public RecurringBookingResponse createRecurringBooking(RecurringBookingPreviewRequest request, Long customerId) {
        // 1. Kiểm tra khách hàng và sân
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin khách hàng!"));

        Court court = courtRepository.findById(request.courtId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân với ID: " + request.courtId()));

        if (court.getStatus() != CourtStatus.ACTIVE) {
            throw new IllegalArgumentException("Sân hiện không hoạt động!");
        }

        // 2. GỌI HÀM PREVIEW: Vừa check trùng lịch, vừa lấy luôn kết quả tính tiền
        RecurringBookingPreviewResponse preview = previewRecurringBooking(request);

        // Nếu có ngày bị trùng -> Chặn lại ngay
        if (!preview.conflictingSlotList().isEmpty()) {
            throw new BookingConflictException("Khung giờ này đã bị trùng lịch. Không thể hoàn tất đặt lịch!");
        }

        // Lấy danh sách các ngày trong chu kỳ
        List<LocalDate> allSessionDates = generateSessionDates(
                request.startDate(),
                request.endDate(),
                request.daysOfWeek()
        );

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));

        // 3. Lưu gói đặt lịch cố định (Cha)
        RecurringBooking recurringBooking = new RecurringBooking();
        recurringBooking.setCustomer(customer);
        recurringBooking.setCourt(court);
        recurringBooking.setStartDate(request.startDate());
        recurringBooking.setEndDate(request.endDate());
        recurringBooking.setDaysOfWeek(request.daysOfWeek());
        recurringBooking.setStartTime(request.startTime());
        recurringBooking.setEndTime(request.endTime());
        recurringBooking.setDiscountRate(preview.discountPercent());
        recurringBooking.setTotalAmount(preview.totalPrice());
        recurringBooking.setStatus(RecurBookingStatus.ACTIVE);
        recurringBooking.setCreatedAt(now);

        RecurringBooking savedRecurringBooking = recurringBookingRepository.save(recurringBooking);

        // 4. Tự động sinh các buổi con (Booking)
        BigDecimal sessionDiscountedPrice = preview.totalPrice()
                .divide(BigDecimal.valueOf(preview.totalSessions()), 2, RoundingMode.HALF_UP);

        List<Booking> subBookings = new ArrayList<>();
        for (LocalDate sessionDate : allSessionDates) {
            Booking session = new Booking();
            session.setBookingCode("BK" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase());
            session.setCustomer(customer);
            session.setCourt(court);
            session.setRecurringBooking(savedRecurringBooking);
            session.setBookingDate(sessionDate);
            session.setStartTime(request.startTime());
            session.setEndTime(request.endTime());
            session.setCourtPrice(sessionDiscountedPrice);
            session.setServicePrice(BigDecimal.ZERO);
            session.setTotalAmount(sessionDiscountedPrice);
            session.setBookingStatus(BookingStatus.PENDING);
            session.setPaymentStatus(PaymentStatus.UNPAID);
            session.setCreatedAt(now);
            session.setExpireAt(now.plusMinutes(15));

            subBookings.add(session);
        }

        bookingRepository.saveAll(subBookings);

        // 5. Trả về ID gói vừa tạo
        return new RecurringBookingResponse(
                savedRecurringBooking.getId(),
                court.getName(),
                request.startTime(),
                request.endTime(),
                request.startDate(),
                request.endDate(),
                preview.totalSessions(),
                preview.discountPercent(),
                preview.totalPrice(),
                savedRecurringBooking.getStatus().name()
        );
    }
}
