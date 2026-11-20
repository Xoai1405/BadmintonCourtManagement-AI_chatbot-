package com.smashflow.backend.unit.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.smashflow.backend.common.config.SecurityConfig;
import com.smashflow.backend.modules.identity.auth.service.JwtService;
import com.smashflow.backend.modules.report.controller.ReportController;
import com.smashflow.backend.modules.report.dto.response.ReportSummaryResponse;
import com.smashflow.backend.modules.report.service.ReportService;

@WebMvcTest(ReportController.class)
@Import(SecurityConfig.class)
class ReportControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean ReportService service;
    @MockitoBean JwtService jwtService;
    @MockitoBean UserDetailsService userDetailsService;

    @Test
    @WithMockUser(roles = "MANAGER")
    void managerGetsUnwrappedReport() throws Exception {
        LocalDate day = LocalDate.of(2026, 11, 16);
        when(service.getReport(eq(day), eq(day))).thenReturn(
                new ReportSummaryResponse(null, Map.of(), List.of(), List.of(), null, List.of(), null));
        mvc.perform(get("/api/v1/reports")
                .param("startDate", "2026-11-16").param("endDate", "2026-11-16"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revenueByPeriod").isMap());
    }

    @Test
    @WithMockUser(roles = "STAFF")
    void staffCannotReadReport() throws Exception {
        mvc.perform(get("/api/v1/reports")
                .param("startDate", "2026-11-16").param("endDate", "2026-11-16"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotReadReport() throws Exception {
        mvc.perform(get("/api/v1/reports")
                .param("startDate", "2026-11-16").param("endDate", "2026-11-16"))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedCannotReadReport() throws Exception {
        mvc.perform(get("/api/v1/reports")
                .param("startDate", "2026-11-16").param("endDate", "2026-11-16"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void missingOrMalformedDateReturnsBadRequest() throws Exception {
        mvc.perform(get("/api/v1/reports").param("startDate", "2026-11-16"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/reports")
                .param("startDate", "bad").param("endDate", "2026-11-16"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(roles = "MANAGER")
    void reversedOrTooLongRangeReturnsBadRequest() throws Exception {
        when(service.getReport(LocalDate.of(2026, 11, 17), LocalDate.of(2026, 11, 16)))
                .thenThrow(new IllegalArgumentException("Ngày bắt đầu phải trước ngày kết thúc"));
        when(service.getReport(LocalDate.of(2025, 11, 15), LocalDate.of(2026, 11, 16)))
                .thenThrow(new IllegalArgumentException("Khoảng báo cáo vượt 366 ngày"));
        mvc.perform(get("/api/v1/reports")
                .param("startDate", "2026-11-17").param("endDate", "2026-11-16"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/reports")
                .param("startDate", "2025-11-15").param("endDate", "2026-11-16"))
                .andExpect(status().isBadRequest());
    }
}
