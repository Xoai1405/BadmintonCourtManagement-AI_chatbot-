package com.smashflow.backend.unit.service;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.smashflow.backend.common.config.SecurityConfig;
import com.smashflow.backend.modules.booking.single.controller.BookingController;
import com.smashflow.backend.modules.booking.single.dto.response.BookingDetailResponse;
import com.smashflow.backend.modules.booking.single.service.BookingService;
import com.smashflow.backend.modules.booking.staff.controller.StaffBookingController;
import com.smashflow.backend.modules.identity.auth.service.JwtService;
import com.smashflow.backend.modules.identity.security.userdetails.CustomUserDetails;
import com.smashflow.backend.modules.identity.user.model.enums.Role;
import com.smashflow.backend.modules.identity.user.model.enums.UserStatus;

@WebMvcTest({BookingController.class, StaffBookingController.class})
@Import(SecurityConfig.class)
class BookingRescheduleRouteTest {
    @Autowired MockMvc mvc;
    @MockitoBean BookingService bookingService;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserDetailsService userDetailsService;

    @Test
    void customerCanCallRescheduleAndStaffManagerCannot() throws Exception {
        when(bookingService.rescheduleBookingByCustomer(eq(30L), any(), eq(10L)))
                .thenReturn(BookingDetailResponse.builder().id(30L).build());
        mvc.perform(patch("/api/v1/bookings/30/reschedule")
                .with(authentication(auth(Role.CUSTOMER)))
                .contentType("application/json")
                .content("{\"bookingDate\":\"2026-11-16\",\"startTime\":\"18:00\",\"endTime\":\"19:00\"}"))
                .andExpect(status().isOk());
        for (Role role : new Role[] {Role.STAFF, Role.MANAGER}) {
            mvc.perform(patch("/api/v1/bookings/30/reschedule")
                    .with(authentication(auth(role)))
                    .contentType("application/json")
                    .content("{\"bookingDate\":\"2026-11-16\",\"startTime\":\"18:00\",\"endTime\":\"19:00\"}"))
                    .andExpect(status().isForbidden());
        }
    }

    @Test
    void missingDateReturnsBadRequest() throws Exception {
        mvc.perform(patch("/api/v1/bookings/30/reschedule")
                .with(authentication(auth(Role.CUSTOMER)))
                .contentType("application/json")
                .content("{\"startTime\":\"18:00\",\"endTime\":\"19:00\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void staffAndManagerCanCallStaffRouteButCustomerCannot() throws Exception {
        for (Role role : new Role[] {Role.STAFF, Role.MANAGER}) {
            mvc.perform(patch("/api/v1/staff/bookings/30/reschedule")
                    .with(authentication(auth(role)))
                    .contentType("application/json")
                    .content("{\"bookingDate\":\"2026-11-16\",\"startTime\":\"18:00\",\"endTime\":\"19:00\"}"))
                    .andExpect(status().isOk());
        }
        mvc.perform(patch("/api/v1/staff/bookings/30/reschedule")
                .with(authentication(auth(Role.CUSTOMER)))
                .contentType("application/json")
                .content("{\"bookingDate\":\"2026-11-16\",\"startTime\":\"18:00\",\"endTime\":\"19:00\"}"))
                .andExpect(status().isForbidden());
    }

    private UsernamePasswordAuthenticationToken auth(Role role) {
        CustomUserDetails principal = new CustomUserDetails(10L, "Khách", null, "0123456789",
                "customer@example.test", "password", role, UserStatus.ACTIVE, null, null);
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }
}
