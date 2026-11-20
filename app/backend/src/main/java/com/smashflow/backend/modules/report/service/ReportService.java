package com.smashflow.backend.modules.report.service;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.smashflow.backend.common.exception.ResourceNotFoundException;
import com.smashflow.backend.modules.booking.single.model.enums.BookingStatus;
import com.smashflow.backend.modules.court.model.BusinessHourConfig;
import com.smashflow.backend.modules.court.repository.BusinessHourConfigRepository;
import com.smashflow.backend.modules.report.dto.response.ReportSummaryResponse;
import com.smashflow.backend.modules.report.repository.ReportRepository;
import com.smashflow.backend.modules.report.repository.ReportRepository.CourtRow;
import com.smashflow.backend.modules.report.repository.ReportRepository.HeatRow;
import com.smashflow.backend.modules.report.repository.ReportRepository.RevenueRow;
import com.smashflow.backend.modules.report.repository.ReportRepository.Totals;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReportService {
    private static final List<String> WEEK_DAYS = List.of("T2", "T3", "T4", "T5", "T6", "T7", "CN");
    private static final DateTimeFormatter HOUR_LABEL = DateTimeFormatter.ofPattern("HH:mm");
    private final ReportRepository reports;
    private final BusinessHourConfigRepository businessHours;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ReportSummaryResponse getReport(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc");
        }
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
        }
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        if (days > 366) {
            throw new IllegalArgumentException("Khoảng báo cáo không được vượt quá 366 ngày");
        }
        LocalDate previousStart = startDate.minusDays(days);
        LocalDate previousEnd = startDate.minusDays(1);
        BusinessHourConfig config = businessHours.findById((short) 1)
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có cấu hình giờ hoạt động"));
        LocalTime opening = config.getOpeningTime();
        LocalTime closing = config.getClosingTime();
        long secondsPerDay = Duration.between(opening, closing).toSeconds();
        if (secondsPerDay <= 0) {
            throw new IllegalStateException("Cấu hình giờ hoạt động không hợp lệ");
        }
        int slotCount = (int) ((secondsPerDay + 7199) / 7200);
        long activeCourts = reports.activeCourtCount();
        double availableSeconds = (double) activeCourts * days * secondsPerDay;

        Totals current = reports.totals(startDate, endDate, opening, closing);
        Totals previous = reports.totals(previousStart, previousEnd, opening, closing);
        long currentCustomers = reports.newCustomers(startDate, endDate);
        long previousCustomers = reports.newCustomers(previousStart, previousEnd);
        double currentOccupancy = percent(current.bookedSeconds(), availableSeconds);
        double previousOccupancy = percent(previous.bookedSeconds(), availableSeconds);

        ReportSummaryResponse.Kpis kpis = new ReportSummaryResponse.Kpis(
                current.revenue(), change(current.revenue().doubleValue(), previous.revenue().doubleValue()),
                current.bookingCount(), change(current.bookingCount(), previous.bookingCount()),
                currentCustomers, change(currentCustomers, previousCustomers),
                currentOccupancy, change(currentOccupancy, previousOccupancy));

        Map<String, Long> statusCounts = new LinkedHashMap<>();
        for (BookingStatus status : BookingStatus.values()) statusCounts.put(status.name(), 0L);
        reports.statusCounts(startDate, endDate).forEach(row -> statusCounts.put(row.status(), row.count()));
        List<ReportSummaryResponse.StatusCount> statuses = statusCounts.entrySet().stream()
                .map(entry -> new ReportSummaryResponse.StatusCount(entry.getKey(), entry.getValue()))
                .toList();
        List<ReportSummaryResponse.RevenueSource> sources = List.of(
                new ReportSummaryResponse.RevenueSource("COURT", current.courtRevenue()),
                new ReportSummaryResponse.RevenueSource("SERVICE", current.serviceRevenue()));

        return new ReportSummaryResponse(kpis,
                revenueSeries(reports.revenueRows(startDate, endDate), startDate, endDate, opening, slotCount),
                statuses, sources,
                new ReportSummaryResponse.Occupancy(hours(current.bookedSeconds()), hours(availableSeconds)),
                topCourts(reports.topCourts(startDate, endDate, opening, closing), days * secondsPerDay),
                heatmap(reports.heatRows(startDate, endDate, opening, closing, slotCount),
                        startDate, endDate, opening, closing, slotCount, activeCourts));
    }

    private Map<String, ReportSummaryResponse.RevenueSeries> revenueSeries(List<RevenueRow> rows,
            LocalDate startDate, LocalDate endDate, LocalTime opening, int slotCount) {
        BigDecimal[] byHour = zeros(slotCount);
        BigDecimal[] byWeekday = zeros(7);
        List<YearMonth> months = new ArrayList<>();
        for (YearMonth month = YearMonth.from(startDate); !month.isAfter(YearMonth.from(endDate));
                month = month.plusMonths(1)) months.add(month);
        BigDecimal[] byMonth = zeros(months.size());
        for (RevenueRow row : rows) {
            int hourIndex = (int) Math.floorDiv(Duration.between(opening, row.startTime()).toMinutes(), 120);
            hourIndex = Math.clamp(hourIndex, 0, slotCount - 1);
            byHour[hourIndex] = byHour[hourIndex].add(row.amount());
            int weekday = row.date().getDayOfWeek().getValue() - 1;
            byWeekday[weekday] = byWeekday[weekday].add(row.amount());
            int monthIndex = months.indexOf(YearMonth.from(row.date()));
            byMonth[monthIndex] = byMonth[monthIndex].add(row.amount());
        }
        List<String> hourLabels = new ArrayList<>();
        for (int index = 0; index < slotCount; index++) {
            hourLabels.add(opening.plusHours(2L * index).format(HOUR_LABEL));
        }
        Map<String, ReportSummaryResponse.RevenueSeries> result = new LinkedHashMap<>();
        result.put("Ngày", new ReportSummaryResponse.RevenueSeries(hourLabels, Arrays.asList(byHour)));
        result.put("Tuần", new ReportSummaryResponse.RevenueSeries(WEEK_DAYS, Arrays.asList(byWeekday)));
        result.put("Tháng", new ReportSummaryResponse.RevenueSeries(months.stream()
                .map(month -> "T" + month.getMonthValue() + "/" + month.getYear()).toList(),
                Arrays.asList(byMonth)));
        return result;
    }

    private List<ReportSummaryResponse.TopCourt> topCourts(List<CourtRow> rows, long availableSecondsPerCourt) {
        return rows.stream().map(row -> new ReportSummaryResponse.TopCourt(row.courtId(), row.name(),
                row.bookings(), hours(row.bookedSeconds()), percent(row.bookedSeconds(), availableSecondsPerCourt)))
                .toList();
    }

    private ReportSummaryResponse.Heatmap heatmap(List<HeatRow> rows, LocalDate start, LocalDate end,
            LocalTime opening, LocalTime closing, int slotCount, long activeCourts) {
        long[] weekdayOccurrences = new long[7];
        for (LocalDate day = start; !day.isAfter(end); day = day.plusDays(1)) {
            weekdayOccurrences[day.getDayOfWeek().getValue() - 1]++;
        }
        double[][] booked = new double[7][slotCount];
        for (HeatRow row : rows) booked[row.weekday() - 1][row.slotIndex()] = row.bookedSeconds();
        List<String> timeSlots = new ArrayList<>();
        for (int slot = 0; slot < slotCount; slot++) {
            LocalTime slotStart = opening.plusHours(2L * slot);
            LocalTime slotEnd = opening.plusHours(2L * (slot + 1));
            if (slotEnd.isAfter(closing) || slotEnd.isBefore(slotStart)) slotEnd = closing;
            timeSlots.add(slotStart.format(HOUR_LABEL) + "–" + slotEnd.format(HOUR_LABEL));
        }
        List<List<Double>> values = new ArrayList<>();
        for (int day = 0; day < 7; day++) {
            List<Double> line = new ArrayList<>();
            for (int slot = 0; slot < slotCount; slot++) {
                LocalTime slotStart = opening.plusHours(2L * slot);
                LocalTime slotEnd = opening.plusHours(2L * (slot + 1));
                if (slotEnd.isAfter(closing) || slotEnd.isBefore(slotStart)) slotEnd = closing;
                double available = (double) weekdayOccurrences[day] * activeCourts
                        * Duration.between(slotStart, slotEnd).toSeconds();
                line.add(percent(booked[day][slot], available));
            }
            values.add(line);
        }
        return new ReportSummaryResponse.Heatmap(WEEK_DAYS, timeSlots, values);
    }

    private BigDecimal[] zeros(int size) {
        BigDecimal[] result = new BigDecimal[size];
        Arrays.fill(result, BigDecimal.ZERO);
        return result;
    }

    private double hours(double seconds) {
        return Math.round(seconds / 3600.0 * 100) / 100.0;
    }

    private double percent(double part, double whole) {
        return whole == 0 ? 0 : Math.round(Math.min(100, part * 100 / whole) * 10) / 10.0;
    }

    private double change(double current, double previous) {
        return previous == 0 ? 0 : Math.round((current - previous) / previous * 1000) / 10.0;
    }
}
