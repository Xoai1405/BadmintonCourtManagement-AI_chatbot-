package com.smashflow.backend.integration;

import static org.junit.jupiter.api.Assertions.*;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

/** Uses only an explicitly supplied isolated test database, never application.properties. */
class BookingOverlapPostgresTest {
    @Test
    @EnabledIfEnvironmentVariable(named = "TEST_POSTGRES_URL", matches = ".+")
    void concurrentMovesIntoSameSlotCannotBothCommit() throws Exception {
        String schema = "reschedule_test_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection setup = connect(); Statement statement = setup.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            try {
                statement.execute("SET search_path TO " + schema + ", public");
                statement.execute("CREATE TABLE bookings (id bigint PRIMARY KEY, court_id bigint NOT NULL, "
                        + "booking_date date NOT NULL, start_time time NOT NULL, end_time time NOT NULL, "
                        + "booking_status varchar(20) NOT NULL)");
                try (InputStream resource = getClass().getClassLoader()
                        .getResourceAsStream("db/migration/V5__prevent_overlapping_bookings.sql")) {
                    assertNotNull(resource);
                    String migration = new String(resource.readAllBytes(), StandardCharsets.UTF_8);
                    for (String sql : migration.split(";")) {
                        if (!sql.isBlank()) statement.execute(sql);
                    }
                }
                statement.execute("INSERT INTO bookings VALUES "
                        + "(1, 7, '2026-12-01', '16:00', '17:00', 'CONFIRMED'), "
                        + "(2, 7, '2026-12-01', '18:00', '19:00', 'CONFIRMED')");

                try (Connection first = connect(); Connection second = connect();
                        var pool = Executors.newSingleThreadExecutor()) {
                    first.setAutoCommit(false);
                    second.setAutoCommit(false);
                    try (Statement firstStatement = first.createStatement();
                            Statement secondStatement = second.createStatement()) {
                        firstStatement.execute("SET search_path TO " + schema + ", public");
                        secondStatement.execute("SET search_path TO " + schema + ", public");
                        firstStatement.executeUpdate(
                                "UPDATE bookings SET start_time='20:00', end_time='21:00' WHERE id=1");
                        CountDownLatch started = new CountDownLatch(1);
                        var competingMove = pool.submit(() -> {
                            started.countDown();
                            try {
                                secondStatement.executeUpdate(
                                        "UPDATE bookings SET start_time='20:00', end_time='21:00' WHERE id=2");
                                second.commit();
                                return null;
                            } catch (SQLException ex) {
                                second.rollback();
                                return ex;
                            }
                        });
                        assertTrue(started.await(5, TimeUnit.SECONDS));
                        first.commit();
                        SQLException conflict = competingMove.get(10, TimeUnit.SECONDS);
                        assertNotNull(conflict, "Second move must fail on the exclusion constraint");
                        assertEquals("23P01", conflict.getSQLState());
                    }
                }
            } finally {
                statement.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
    }

    private Connection connect() throws SQLException {
        return DriverManager.getConnection(System.getenv("TEST_POSTGRES_URL"),
                System.getenv("TEST_POSTGRES_USER"), System.getenv("TEST_POSTGRES_PASSWORD"));
    }
}
