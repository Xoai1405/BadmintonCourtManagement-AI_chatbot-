package com.smashflow.backend.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.report.repository.ReportRepository;
import com.smashflow.backend.modules.report.repository.ReportRepository.CourtRow;
import com.smashflow.backend.modules.report.repository.ReportRepository.HeatRow;
import com.smashflow.backend.modules.report.repository.ReportRepository.RevenueRow;
import com.smashflow.backend.modules.report.repository.ReportRepository.StatusRow;
import com.smashflow.backend.modules.report.repository.ReportRepository.Totals;
import com.smashflow.backend.modules.report.service.ReportService;

class ReportServiceTest {
    private static final LocalDate DAY = LocalDate.of(2026, 11, 16);
    private final ReportRepository reports = mock(ReportRepository.class);
    private final BusinessHourConfigRepository hours = mock(BusinessHourConfigRepository.class);
    private ReportService service;

    @BeforeEach
    void setup() {
        service = new ReportService(reports, hours);
        BusinessHourConfig config = new BusinessHourConfig();
        config.setOpeningTime(LocalTime.of(6, 0));
        config.setClosingTime(LocalTime.of(22, 0));
        when(hours.findById((short) 1)).thenReturn(Optional.of(config));
        when(reports.activeCourtCount()).thenReturn(2L);
        when(reports.totals(eq(DAY), eq(DAY), any(), any()))
                .thenReturn(new Totals(new BigDecimal("100000"), new BigDecimal("20000"), 3, 7200));
        when(reports.totals(eq(DAY.minusDays(1)), eq(DAY.minusDays(1)), any(), any()))
                .thenReturn(new Totals(new BigDecimal("50000"), BigDecimal.ZERO, 2, 3600));
        when(reports.newCustomers(DAY, DAY)).thenReturn(2L);
        when(reports.newCustomers(DAY.minusDays(1), DAY.minusDays(1))).thenReturn(1L);
    }

    @Test
    void aggregatesKpisRevenueSourcesAndPreviousPeriod() {
        var result = service.getReport(DAY, DAY);
        assertEquals(new BigDecimal("120000"), result.kpis().revenue());
        assertEquals(140, result.kpis().revenueChangePercent());
        assertEquals(3, result.kpis().bookingCount());
        assertEquals(50, result.kpis().bookingChangePercent());
        assertEquals(100, result.kpis().newCustomerChangePercent());
        assertEquals(6.3, result.kpis().occupancyPercent());
        assertEquals(2, result.occupancy().bookedHours());
        assertEquals(32, result.occupancy().availableHours());
        assertEquals(new BigDecimal("100000"), result.revenueSources().get(0).amount());
        assertEquals(new BigDecimal("20000"), result.revenueSources().get(1).amount());
        verify(reports).totals(DAY.minusDays(1), DAY.minusDays(1),
                LocalTime.of(6, 0), LocalTime.of(22, 0));
    }

    @Test
    void returnsSixStatusesIncludingZeros() {
        when(reports.statusCounts(DAY, DAY)).thenReturn(List.of(
                new StatusRow("CONFIRMED", 2), new StatusRow("CANCELLED", 1)));
        var statuses = service.getReport(DAY, DAY).bookingStatuses();
        assertEquals(6, statuses.size());
        assertEquals(2, statuses.stream().filter(s -> s.code().equals("CONFIRMED"))
                .findFirst().orElseThrow().count());
        assertEquals(0, statuses.stream().filter(s -> s.code().equals("CHECKED_IN"))
                .findFirst().orElseThrow().count());
    }

    @Test
    void distributesRevenueAndOccupancyAcrossHourWeekMonthAndHeatmap() {
        when(reports.revenueRows(DAY, DAY)).thenReturn(List.of(
                new RevenueRow(DAY, LocalTime.of(6, 0), new BigDecimal("80000")),
                new RevenueRow(DAY, LocalTime.of(8, 0), new BigDecimal("40000"))));
        when(reports.topCourts(eq(DAY), eq(DAY), any(), any()))
                .thenReturn(List.of(new CourtRow(7L, "Sân 7", 2, 7200)));
        when(reports.heatRows(eq(DAY), eq(DAY), any(), any(), eq(8)))
                .thenReturn(List.of(new HeatRow(1, 0, 3600), new HeatRow(1, 1, 3600)));
        var result = service.getReport(DAY, DAY);
        assertEquals(new BigDecimal("80000"), result.revenueByPeriod().get("Ngày").values().get(0));
        assertEquals(new BigDecimal("40000"), result.revenueByPeriod().get("Ngày").values().get(1));
        assertEquals(new BigDecimal("120000"), result.revenueByPeriod().get("Tuần").values().get(0));
        assertEquals(new BigDecimal("120000"), result.revenueByPeriod().get("Tháng").values().get(0));
        assertEquals(12.5, result.topCourts().get(0).fillPercent());
        assertEquals(25, result.heatmap().values().get(0).get(0));
        assertEquals(25, result.heatmap().values().get(0).get(1));
        assertEquals(0, result.heatmap().values().get(1).get(0));
    }

    @Test
    void zeroDataHasFiniteValuesAndZeroChanges() {
        when(reports.totals(any(), any(), any(), any()))
                .thenReturn(new Totals(BigDecimal.ZERO, BigDecimal.ZERO, 0, 0));
        when(reports.activeCourtCount()).thenReturn(0L);
        var result = service.getReport(DAY, DAY);
        assertEquals(0, result.kpis().revenueChangePercent());
        assertEquals(0, result.kpis().occupancyPercent());
        assertEquals(0, result.heatmap().values().get(0).get(0));
        assertEquals(0, result.revenueByPeriod().get("Tháng").values().get(0).signum());
    }

    @Test
    void rejectsInvalidDateRangesBeforeDatabaseAccess() {
        assertThrows(IllegalArgumentException.class, () -> service.getReport(null, DAY));
        assertThrows(IllegalArgumentException.class, () -> service.getReport(DAY.plusDays(1), DAY));
        assertThrows(IllegalArgumentException.class, () -> service.getReport(DAY.minusDays(366), DAY));
        verifyNoInteractions(reports);
    }
}
