package com.smashflow.backend.unit.service;

import static org.junit.jupiter.api.Assertions.*;

import java.sql.SQLException;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

import com.smashflow.backend.common.exception.GlobalExceptionHandler;
import com.smashflow.backend.modules.booking.single.exception.BookingConflictException;

class BookingRescheduleErrorTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void queryConflictReturnsHttp409() {
        var response = handler.handleBookingConflict(new BookingConflictException("Trùng lịch"));
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Trùng lịch", response.getBody().get("message"));
    }

    @Test
    void postgresExclusionConflictReturnsHttp409() {
        var error = new DataIntegrityViolationException("overlap", new SQLException("overlap", "23P01"));
        var response = handler.handleOverlapConstraint(error);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody().get("message"));
    }

    @Test
    void unrelatedDatabaseErrorIsNotMaskedAsOverlap() {
        var error = new DataIntegrityViolationException("unrelated", new SQLException("unique", "23505"));
        assertSame(error, assertThrows(DataIntegrityViolationException.class,
                () -> handler.handleOverlapConstraint(error)));
    }
}
