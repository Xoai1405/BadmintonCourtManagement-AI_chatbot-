package com.smashflow.backend.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Biến exception ném ra từ controller/service thành response JSON đúng mã lỗi.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Sai mật khẩu, tài khoản bị khóa, ... => 401
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuth(AuthenticationException e) {
        return ResponseEntity.status(401).body(Map.of("message", e.getMessage()));
    }

    // Email/SĐT đã tồn tại, ... => 400
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }

    // @Valid fail (thiếu field, mật khẩu < 8 ký tự, ...) => 400, lấy message đầu
    // tiên
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(f -> f.getDefaultMessage())
                .orElse("Dữ liệu không hợp lệ");
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleResourceNotFound(
            ResourceNotFoundException ex) {

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ex.getMessage());
    }

    @ExceptionHandler(BookingConflictException.class)
    public ResponseEntity<Map<String, String>> handleBookingConflict(
            BookingConflictException ex) {

        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", ex.getMessage()));
    }
}