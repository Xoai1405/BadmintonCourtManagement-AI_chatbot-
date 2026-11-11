package com.smashflow.backend.modules.court.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.SlotStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import com.smashflow.backend.modules.court.dto.request.CreateCourtRequest;
import com.smashflow.backend.modules.court.dto.request.UpdateCourtRequest;
import com.smashflow.backend.modules.court.dto.response.CourtAvailabilityResponse;
import com.smashflow.backend.modules.court.dto.response.CourtResponse;
import com.smashflow.backend.modules.court.dto.response.TimeSlotResponse;
import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.model.Court;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.court.repository.CourtRepository;
import com.smashflow.backend.modules.pricing.model.PriceConfig;
import com.smashflow.backend.modules.pricing.repository.PriceConfigRepository;
import com.smashflow.backend.modules.pricing.service.PricingService;
import com.smashflow.backend.modules.pricing.service.PricingService.SlotPrice;

import jakarta.transaction.Transactional;

import com.smashflow.backend.common.storage.SupabaseStorageService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CourtService {

        private final CourtRepository courtRepo;
        private final PriceConfigRepository priceConfigRepo;
        private final BusinessHourConfigRepository businessHourConfigRepo;
        private final BookingRepository bookingRepo;
        private final PricingService pricingService;
        private final SupabaseStorageService supabaseStorageService;

        public List<CourtResponse> getAllCourts() {
                List<Court> courts = courtRepo.findAll();
                List<CourtResponse> responses = new ArrayList<>();

                for (Court court : courts) {
                        PriceConfig priceConfig = getPriceConfig(court);

                        responses.add(toCourtResponse(court, priceConfig));
                }

                return responses;
        }

        public CourtResponse getCourt(Long id) {
                Court court = courtRepo.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tồn tại dữ liệu sân"));

                PriceConfig priceConfig = getPriceConfig(court);

                return toCourtResponse(court, priceConfig);
        }

        public CourtAvailabilityResponse getAvailability(
                        Long courtId,
                        LocalDate date) {

                Court court = courtRepo.findById(courtId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy sân"));

                PriceConfig priceConfig = getPriceConfig(court);
                BusinessHourConfig businessConfig = getBusinessHourConfig();

                List<Booking> blockingBookings = bookingRepo.findByCourt_IdAndBookingDateAndBookingStatusIn(
                                courtId,
                                date,
                                List.of(
                                                BookingStatus.PENDING,
                                                BookingStatus.CONFIRMED,
                                                BookingStatus.CHECKED_IN));

                LocalDateTime now = LocalDateTime.now(
                                ZoneId.of("Asia/Ho_Chi_Minh"));

                List<TimeSlotResponse> slots = new ArrayList<>();

                for (LocalTime slotStart = businessConfig.getOpeningTime(); slotStart
                                .isBefore(businessConfig.getClosingTime()); slotStart = slotStart.plusMinutes(30)) {
                        // Lưu giá trị slotStart hiện tại để sử dụng an toàn
                        // trong lambda và các xử lý bên dưới.
                        LocalTime currentSlotStart = slotStart;

                        LocalTime slotEnd = currentSlotStart.plusMinutes(30);

                        // Kiểm tra slot đã qua hay chưa
                        boolean isPast = date.isBefore(now.toLocalDate())
                                        || (date.isEqual(now.toLocalDate())
                                                        && !currentSlotStart.isAfter(now.toLocalTime()));

                        // Kiểm tra slot có bị đặt trùng với booking nào không
                        boolean isBooked = blockingBookings.stream()
                                        .anyMatch(booking -> booking.getStartTime().isBefore(slotEnd)
                                                        && booking.getEndTime().isAfter(currentSlotStart));

                        // Tính giá cho slot
                        PricingService.SlotPrice slotPrice = pricingService.getSlotPrice(
                                        priceConfig,
                                        businessConfig,
                                        currentSlotStart,
                                        slotEnd);

                        // Xác định trạng thái slot
                        SlotStatus status;

                        if (isPast) {
                                status = SlotStatus.PAST;
                        } else if (isBooked) {
                                status = SlotStatus.BOOKED;
                        } else {
                                status = SlotStatus.AVAILABLE;
                        }

                        // Thêm slot vào danh sách kết quả
                        slots.add(new TimeSlotResponse(
                                        currentSlotStart,
                                        slotEnd,
                                        status,
                                        slotPrice.isPeak(),
                                        slotPrice.hourlyPrice()));
                }

                return new CourtAvailabilityResponse(courtId, date, slots);
        }

        private PriceConfig getPriceConfig(Court court) {
                return priceConfigRepo.findByCourtType(court.getCourtType())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Chưa có cấu hình giá cho loại sân: "
                                                                + court.getCourtType()));
        }

        private BusinessHourConfig getBusinessHourConfig() {
                return businessHourConfigRepo.findById((short) 1)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Chưa có cấu hình giờ hoạt động"));
        }

        private CourtResponse toCourtResponse(
                        Court court,
                        PriceConfig priceConfig) {

                return new CourtResponse(
                                court.getId(),
                                court.getName(),
                                court.getCourtType(),
                                court.getImageUrl(),
                                court.getDescription(),
                                court.getStatus(),
                                priceConfig.getPriceNormalHour(),
                                priceConfig.getPricePeakHour());
        }

        public CourtResponse createCourt(CreateCourtRequest request) {
                if (courtRepo.existsByName(request.name())) {
                        throw new IllegalArgumentException("Tên sân đã được sử dụng");
                }

                Court court = new Court();
                court.setName(request.name());
                court.setCourtType(request.courtType());
                court.setDescription(request.description());
                court.setStatus(request.status());

                court = courtRepo.save(court);
                PriceConfig priceConfig = getPriceConfig(court);
                return toCourtResponse(court, priceConfig);
        }

        public CourtResponse updateCourt(UpdateCourtRequest request) {

                Court court = courtRepo.findById(request.courtId())
                                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân"));

                if (courtRepo.existsByNameAndIdNot(request.name(), request.courtId())) {
                        throw new IllegalArgumentException("Tên sân đã được sử dụng");
                }
                court.setName(request.name());
                court.setCourtType(request.courtType());
                court.setDescription(request.description());
                court.setStatus(request.status());

                court = courtRepo.save(court);
                PriceConfig priceConfig = getPriceConfig(court);
                return toCourtResponse(court, priceConfig);
        }

        // upload courtimage

        public CourtResponse uploadCourtImage(
                        Long courtId, MultipartFile image) {

                Court court = courtRepo.findById(courtId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy sân"));

                String oldImageUrl = court.getImageUrl();

                // 1. Upload ảnh mới
                String newImageUrl = supabaseStorageService.uploadCourtImage(courtId, image);

                Court updatedCourt;

                try {
                        // 2. Cập nhật Database bằng transaction riêng
                        updatedCourt = updateCourtImageUrl(courtId, newImageUrl);

                } catch (RuntimeException e) {

                        // 3. Compensation nếu DB thất bại
                        try {
                                supabaseStorageService.deleteCourtImage(
                                                courtId, newImageUrl);
                        } catch (RuntimeException cleanupException) {
                                e.addSuppressed(cleanupException);
                        }

                        throw e;
                }

                // 4. Commit DB thành công mới xóa ảnh cũ
                if (oldImageUrl != null && !oldImageUrl.equals(newImageUrl)) {
                        try {
                                supabaseStorageService.deleteCourtImage(
                                                courtId, oldImageUrl);
                        } catch (RuntimeException e) {
                                // TODO: Ghi log và đưa vào cơ chế retry
                        }
                }

                PriceConfig priceConfig = getPriceConfig(updatedCourt);

                return toCourtResponse(updatedCourt, priceConfig);
        }

        @Transactional
        public Court updateCourtImageUrl(Long courtId, String imageUrl) {

                Court court = courtRepo.findById(courtId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy sân"));

                court.setImageUrl(imageUrl);

                return courtRepo.save(court);
        }

        public CourtResponse deleteCourtImage(Long courtId) {

                Court court = courtRepo.findById(courtId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Không tìm thấy sân"));

                String oldImageUrl = court.getImageUrl();

                if (oldImageUrl == null || oldImageUrl.isBlank()) {
                        throw new IllegalArgumentException(
                                        "Sân hiện không có ảnh để xóa");
                }

                // Cập nhật database trước
                court.setImageUrl(null);
                court = courtRepo.save(court);

                // Sau đó xóa ảnh trên Storage
                try {
                        supabaseStorageService.deleteCourtImage(
                                        courtId, oldImageUrl);
                } catch (RuntimeException e) {
                        System.err.println(
                                        "Không thể xóa ảnh Storage của sân "
                                                        + courtId + ": " + e.getMessage());
                }

                PriceConfig priceConfig = getPriceConfig(court);

                return toCourtResponse(court, priceConfig);
        }

}
