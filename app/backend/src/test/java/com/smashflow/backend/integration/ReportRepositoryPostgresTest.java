package com.smashflow.backend.integration;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import com.smashflow.backend.modules.report.repository.ReportRepository;

/** Runs only against an explicitly supplied disposable PostgreSQL test database. */
class ReportRepositoryPostgresTest {
    @Test
    @EnabledIfEnvironmentVariable(named = "TEST_POSTGRES_URL", matches = ".+")
    void aggregateQueriesAndIndexesWorkOnPostgres() throws Exception {
        String schema = "report_test_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(System.getenv("TEST_POSTGRES_URL"),
                System.getenv("TEST_POSTGRES_USER"), System.getenv("TEST_POSTGRES_PASSWORD"));
                var sql = connection.createStatement()) {
            sql.execute("CREATE SCHEMA " + schema);
            try {
                sql.execute("SET search_path TO " + schema + ", public");
                sql.execute("CREATE TABLE courts (id bigint PRIMARY KEY, name text, status text)");
                sql.execute("CREATE TABLE users (id bigint PRIMARY KEY, role text, created_at timestamp)");
                sql.execute("CREATE TABLE bookings (id bigint PRIMARY KEY, court_id bigint, booking_date date, "
                        + "start_time time, end_time time, court_price numeric(12,2), service_price numeric(12,2), "
                        + "booking_status text, payment_status text)");
                var resource = getClass().getClassLoader()
                        .getResourceAsStream("db/migration/V12__report_query_indexes.sql");
                assertNotNull(resource);
                try (resource) {
                    for (String command : new String(resource.readAllBytes(), StandardCharsets.UTF_8).split(";")) {
                        if (!command.isBlank()) sql.execute(command);
                    }
                }
                sql.execute("INSERT INTO courts VALUES (7,'Sân 7','ACTIVE'),(9,'Sân 9','ACTIVE'),"
                        + "(10,'Sân 10','ACTIVE')");
                sql.execute("INSERT INTO users VALUES (1,'CUSTOMER','2026-11-16 10:00:00')");
                sql.execute("INSERT INTO bookings VALUES "
                        + "(1,7,'2026-11-16','06:00','08:00',100,0,'CONFIRMED','PAID'),"
                        + "(2,9,'2026-11-16','07:00','09:00',200,30,'COMPLETED','SETTLED'),"
                        + "(3,7,'2026-11-16','09:00','10:00',500,0,'CANCELLED','PAID'),"
                        + "(4,7,'2026-11-16','10:00','11:00',50,20,'CHECKED_IN','PAID'),"
                        + "(5,7,'2026-11-16','12:00','13:00',70,0,'COMPLETED','SETTLED'),"
                        + "(6,7,'2026-11-15','06:00','07:00',30,0,'CONFIRMED','PAID')");
                var datasource = new SingleConnectionDataSource(connection, true);
                var repository = new ReportRepository(new NamedParameterJdbcTemplate(datasource));
                LocalDate day = LocalDate.of(2026, 11, 16);
                LocalTime opening = LocalTime.of(6, 0);
                LocalTime closing = LocalTime.of(22, 0);
                var totals = repository.totals(day, day, opening, closing);
                assertEquals(0, totals.courtRevenue().compareTo(new java.math.BigDecimal("420")));
                assertEquals(0, totals.serviceRevenue().compareTo(new java.math.BigDecimal("30")));
                assertEquals(4, totals.bookingCount());
                assertEquals(21600, totals.bookedSeconds());
                assertEquals(1, repository.newCustomers(day, day));
                assertEquals(3, repository.activeCourtCount());
                assertEquals(1, repository.statusCounts(day, day).stream()
                        .filter(row -> row.status().equals("CANCELLED")).findFirst().orElseThrow().count());
                assertEquals(450, repository.revenueRows(day, day).stream()
                        .mapToDouble(row -> row.amount().doubleValue()).sum());
                assertEquals(3, repository.topCourts(day, day, opening, closing).getFirst().bookings());
                assertEquals(0, repository.topCourts(day, day, opening, closing).getLast().bookedSeconds());
                assertEquals(10800, repository.heatRows(day, day, opening, closing, 8).stream()
                        .filter(row -> row.weekday() == 1 && row.slotIndex() == 0)
                        .findFirst().orElseThrow().bookedSeconds());
                try (var explain = sql.executeQuery("EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM bookings "
                        + "WHERE booking_date BETWEEN '2025-11-16' AND '2026-11-16'")) {
                    assertTrue(explain.next());
                }
            } finally {
                sql.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }
}
