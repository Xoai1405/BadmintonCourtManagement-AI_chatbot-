package com.smashflow.backend.modules.report.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ReportRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public record Totals(BigDecimal courtRevenue, BigDecimal serviceRevenue, long bookingCount,
            double bookedSeconds) {
        public BigDecimal revenue() {
            return courtRevenue.add(serviceRevenue);
        }
    }

    public record StatusRow(String status, long count) {
    }

    public record RevenueRow(LocalDate date, LocalTime startTime, BigDecimal amount) {
    }

    public record CourtRow(Long courtId, String name, long bookings, double bookedSeconds) {
    }

    public record HeatRow(int weekday, int slotIndex, double bookedSeconds) {
    }

    private MapSqlParameterSource range(LocalDate start, LocalDate end) {
        return new MapSqlParameterSource().addValue("start", start).addValue("end", end);
    }

    private MapSqlParameterSource hours(LocalDate start, LocalDate end, LocalTime opening, LocalTime closing) {
        return range(start, end).addValue("opening", opening).addValue("closing", closing);
    }

    public Totals totals(LocalDate start, LocalDate end, LocalTime opening, LocalTime closing) {
        String sql = """
                SELECT COALESCE(SUM(CASE WHEN b.booking_status <> 'CANCELLED'
                     AND b.payment_status IN ('PAID', 'SETTLED') THEN b.court_price ELSE 0 END), 0) court_revenue,
                   COALESCE(SUM(CASE WHEN b.booking_status <> 'CANCELLED'
                     AND b.payment_status = 'SETTLED' THEN b.service_price ELSE 0 END), 0) service_revenue,
                   COUNT(*) FILTER (WHERE b.booking_status <> 'CANCELLED') booking_count,
                   COALESCE(SUM(CASE WHEN c.status = 'ACTIVE'
                     AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
                     THEN GREATEST(0, EXTRACT(EPOCH FROM
                       (LEAST(b.end_time, CAST(:closing AS time))
                        - GREATEST(b.start_time, CAST(:opening AS time))))) ELSE 0 END), 0) booked_seconds
                FROM bookings b JOIN courts c ON c.id = b.court_id
                WHERE b.booking_date BETWEEN :start AND :end
                """;
        return jdbc.queryForObject(sql, hours(start, end, opening, closing), (rs, row) ->
                new Totals(rs.getBigDecimal("court_revenue"), rs.getBigDecimal("service_revenue"),
                        rs.getLong("booking_count"), rs.getDouble("booked_seconds")));
    }

    public long newCustomers(LocalDate start, LocalDate end) {
        String sql = """
                SELECT COUNT(*) FROM users
                WHERE role = 'CUSTOMER' AND created_at >= :start
                  AND created_at < :endExclusive
                """;
        LocalDateTime startAt = start.atStartOfDay();
        LocalDateTime endExclusive = end.plusDays(1).atStartOfDay();
        return jdbc.queryForObject(sql, new MapSqlParameterSource()
                .addValue("start", startAt).addValue("endExclusive", endExclusive), Long.class);
    }

    public long activeCourtCount() {
        return jdbc.getJdbcTemplate().queryForObject(
                "SELECT COUNT(*) FROM courts WHERE status = 'ACTIVE'", Long.class);
    }

    public List<StatusRow> statusCounts(LocalDate start, LocalDate end) {
        return jdbc.query("""
                SELECT booking_status, COUNT(*) AS count
                FROM bookings WHERE booking_date BETWEEN :start AND :end
                GROUP BY booking_status
                """, range(start, end), (rs, row) ->
                new StatusRow(rs.getString("booking_status"), rs.getLong("count")));
    }

    public List<RevenueRow> revenueRows(LocalDate start, LocalDate end) {
        return jdbc.query("""
                SELECT booking_date, start_time,
                  SUM(court_price + CASE WHEN payment_status = 'SETTLED'
                      THEN service_price ELSE 0 END) amount
                FROM bookings
                WHERE booking_date BETWEEN :start AND :end
                  AND booking_status <> 'CANCELLED'
                  AND payment_status IN ('PAID', 'SETTLED')
                GROUP BY booking_date, start_time
                """, range(start, end), (rs, row) ->
                new RevenueRow(rs.getObject("booking_date", LocalDate.class),
                        rs.getObject("start_time", LocalTime.class), rs.getBigDecimal("amount")));
    }

    public List<CourtRow> topCourts(LocalDate start, LocalDate end, LocalTime opening, LocalTime closing) {
        return jdbc.query("""
                SELECT c.id, c.name, COUNT(b.id) bookings,
                  COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN GREATEST(0, EXTRACT(EPOCH FROM
                    (LEAST(b.end_time, CAST(:closing AS time))
                     - GREATEST(b.start_time, CAST(:opening AS time))))) ELSE 0 END), 0) booked_seconds
                FROM courts c LEFT JOIN bookings b ON b.court_id = c.id
                  AND b.booking_date BETWEEN :start AND :end
                  AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
                WHERE c.status = 'ACTIVE'
                GROUP BY c.id, c.name
                ORDER BY bookings DESC, booked_seconds DESC, c.id ASC
                LIMIT 5
                """, hours(start, end, opening, closing), (rs, row) ->
                new CourtRow(rs.getLong("id"), rs.getString("name"),
                        rs.getLong("bookings"), rs.getDouble("booked_seconds")));
    }

    public List<HeatRow> heatRows(LocalDate start, LocalDate end,
            LocalTime opening, LocalTime closing, int slotCount) {
        String sql = """
                WITH slots AS (
                  SELECT gs AS slot_index,
                    CAST(CAST(:opening AS time) + make_interval(hours => 2 * gs) AS time) slot_start,
                    LEAST(CAST(:closing AS time),
                      CAST(CAST(:opening AS time) + make_interval(hours => 2 * (gs + 1)) AS time)) slot_end
                  FROM generate_series(0, :lastSlot) gs
                )
                SELECT EXTRACT(ISODOW FROM b.booking_date)::int weekday, s.slot_index,
                  SUM(EXTRACT(EPOCH FROM
                    (LEAST(b.end_time, s.slot_end) - GREATEST(b.start_time, s.slot_start)))) booked_seconds
                FROM bookings b JOIN courts c ON c.id = b.court_id
                  AND c.status = 'ACTIVE'
                JOIN slots s ON b.start_time < s.slot_end AND b.end_time > s.slot_start
                WHERE b.booking_date BETWEEN :start AND :end
                  AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'COMPLETED')
                GROUP BY weekday, s.slot_index
                """;
        return jdbc.query(sql, hours(start, end, opening, closing)
                .addValue("lastSlot", slotCount - 1), (rs, row) ->
                new HeatRow(rs.getInt("weekday"), rs.getInt("slot_index"),
                        rs.getDouble("booked_seconds")));
    }
}
