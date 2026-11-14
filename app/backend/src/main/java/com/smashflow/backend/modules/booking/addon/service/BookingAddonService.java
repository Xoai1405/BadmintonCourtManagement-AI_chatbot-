package com.smashflow.backend.modules.booking.addon.service;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.addon.dto.BookingServiceRequest;
import com.smashflow.backend.modules.booking.addon.dto.BookingServiceResponse;
import com.smashflow.backend.modules.booking.addon.enums.ServiceStatus;
import com.smashflow.backend.modules.booking.addon.model.BookingService;
import com.smashflow.backend.modules.booking.addon.repository.BookingServiceRepository;
import com.smashflow.backend.modules.booking.addon.repository.ServiceRepository;
import com.smashflow.backend.modules.booking.recurring.model.enums.RecurBookingStatus;
import com.smashflow.backend.modules.booking.single.model.Booking;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.booking.single.model.enums.PaymentStatus;
import com.smashflow.backend.modules.booking.single.repository.BookingRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BookingAddonService {
    private final BookingRepository bookingRepository;
    private final BookingServiceRepository lineRepository;
    private final ServiceRepository serviceRepository;

    @Transactional(readOnly = true)
    public List<BookingServiceResponse> lines(Long bookingId) {
        return lineRepository.findByBooking_IdOrderByIdAsc(bookingId).stream().map(BookingServiceResponse::from).toList();
    }

    @Transactional
    public List<BookingServiceResponse> add(Long bookingId, BookingServiceRequest request) {
        if (request.quantity() == null || request.quantity() < 1 || request.quantity() > 99) {
            throw new IllegalArgumentException("Số lượng phải từ 1 đến 99");
        }
        Booking booking = lockEditable(bookingId);
        var service = serviceRepository.findAvailableByIdForUpdate(request.serviceId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dịch vụ"));
        if (service.getStatus() != ServiceStatus.ACTIVE) throw new IllegalStateException("Dịch vụ hiện không còn hàng");
        BookingService line = lineRepository.findByBooking_IdAndService_Id(bookingId, request.serviceId())
                .orElseGet(() -> {
                    BookingService created = new BookingService();
                    created.setBooking(booking);
                    created.setService(service);
                    created.setServiceNameAtBooking(service.getName());
                    created.setPriceAtBooking(service.getUnitPrice());
                    created.setQuantity(0);
                    return created;
                });
        if (line.getQuantity() + request.quantity() > 99) throw new IllegalArgumentException("Số lượng một dịch vụ tối đa 99");
        line.setQuantity(line.getQuantity() + request.quantity());
        line.setSubtotal(line.getPriceAtBooking().multiply(BigDecimal.valueOf(line.getQuantity())));
        lineRepository.save(line);
        recalculate(booking);
        return lines(bookingId);
    }

    @Transactional
    public List<BookingServiceResponse> remove(Long bookingId, Long serviceId) {
        Booking booking = lockEditable(bookingId);
        BookingService line = lineRepository.findByBooking_IdAndService_Id(bookingId, serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ không có trong booking"));
        lineRepository.delete(line);
        lineRepository.flush();
        recalculate(booking);
        return lines(bookingId);
    }

    private Booking lockEditable(Long id) {
        Booking booking = bookingRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking"));
        if (booking.getBookingStatus() != BookingStatus.CHECKED_IN || booking.getPaymentStatus() == PaymentStatus.SETTLED
                || booking.getRecurringBooking() != null
                && booking.getRecurringBooking().getStatus() != RecurBookingStatus.ACTIVE) {
            throw new IllegalStateException("Chỉ sửa dịch vụ khi booking đã check-in, gói còn hoạt động và chưa kết toán");
        }
        return booking;
    }

    private void recalculate(Booking booking) {
        BigDecimal servicePrice = lineRepository.findByBooking_IdOrderByIdAsc(booking.getId()).stream()
                .map(BookingService::getSubtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        booking.setServicePrice(servicePrice);
        booking.setTotalAmount(booking.getCourtPrice().add(servicePrice));
        bookingRepository.save(booking);
    }
}
