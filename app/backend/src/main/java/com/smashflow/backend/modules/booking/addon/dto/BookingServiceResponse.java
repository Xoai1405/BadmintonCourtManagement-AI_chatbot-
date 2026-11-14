package com.smashflow.backend.modules.booking.addon.dto;

import java.math.BigDecimal;
import com.smashflow.backend.modules.booking.addon.model.BookingService;

public record BookingServiceResponse(Long serviceId, String name, int quantity,
        BigDecimal priceAtBooking, BigDecimal subtotal) {
    public static BookingServiceResponse from(BookingService line) {
        return new BookingServiceResponse(line.getService().getId(), line.getServiceNameAtBooking(),
                line.getQuantity(), line.getPriceAtBooking(), line.getSubtotal());
    }
}
