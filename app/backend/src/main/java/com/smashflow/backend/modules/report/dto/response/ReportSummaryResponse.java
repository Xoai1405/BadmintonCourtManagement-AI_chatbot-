package com.smashflow.backend.modules.report.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record ReportSummaryResponse(
        Kpis kpis,
        Map<String, RevenueSeries> revenueByPeriod,
        List<StatusCount> bookingStatuses,
        List<RevenueSource> revenueSources,
        Occupancy occupancy,
        List<TopCourt> topCourts,
        Heatmap heatmap) {

    public record Kpis(BigDecimal revenue, double revenueChangePercent,
            long bookingCount, double bookingChangePercent,
            long newCustomerCount, double newCustomerChangePercent,
            double occupancyPercent, double occupancyChangePercent) {
    }

    public record RevenueSeries(List<String> labels, List<BigDecimal> values) {
    }

    public record StatusCount(String code, long count) {
    }

    public record RevenueSource(String code, BigDecimal amount) {
    }

    public record Occupancy(double bookedHours, double availableHours) {
    }

    public record TopCourt(Long courtId, String name, long bookings, double hours, double fillPercent) {
    }

    public record Heatmap(List<String> weekDays, List<String> timeSlots, List<List<Double>> values) {
    }
}
