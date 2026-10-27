package com.financetracker.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.entity.User;
import com.financetracker.repository.UserRepository;
import com.financetracker.service.EmailService;
import io.jsonwebtoken.Jwts;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.Connection;
import java.sql.DriverManager;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.Date;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/** Opt-in only: requires two NEW PostgreSQL databases created by the validation script.
 * No credentials, tokens or personal rows are printed, even when an assertion fails.
 */
@EnabledIfSystemProperty(named = "audit.postgres", matches = "true")
@SpringBootTest(properties = {"logging.level.org.springframework.web=WARN",
        "logging.level.org.springframework.security=WARN"})
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("prod")
class JwtPostgresValidationTest {
    private static final String[] TABLES = {
            "users", "categories", "transactions", "study_tasks", "planning_events", "goals", "fitness_workouts"
    };
    private static final String PASSWORD = "Synthetic-Initial-123!";
    private static final String NEW_PASSWORD = "Synthetic-Changed-456!";

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @Autowired private UserRepository users;
    @Autowired private JwtUtil jwt;
    @MockitoBean private EmailService email;

    private static String databaseUrl(String property, String prefix) {
        String url = System.getProperty(property, "");
        if (!url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/" + prefix + "[a-z0-9_]+")) {
            throw new IllegalStateException("Refusing a database outside the temporary JWT validation namespace");
        }
        return url;
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> databaseUrl("audit.pg.url", "aura_jwt_empty_"));
        registry.add("spring.datasource.username", () -> "aura_jwt_validation");
        registry.add("spring.datasource.password", () -> System.getenv("AURA_JWT_TEST_DB_PASSWORD"));
        registry.add("jwt.secret", () -> UUID.randomUUID().toString() + UUID.randomUUID());
        registry.add("app.frontend-url", () -> "http://localhost:18088");
        registry.add("app.backend-url", () -> "http://localhost:18080");
        registry.add("app.mail.from", () -> "validation@jwt.invalid");
        registry.add("spring.mail.password", () -> "");
        registry.add("gemini.api-key", () -> "");
        registry.add("spring.flyway.baseline-on-migrate", () -> false);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("logging.level.org.springframework.test", () -> "WARN");
    }

    private JsonNode postJson(String path, Object body, int expected) throws Exception {
        var response = mvc.perform(post(path).contentType("application/json").content(mapper.writeValueAsBytes(body)))
                .andReturn().getResponse();
        assertThat(response.getStatus()).as(path + " status").isEqualTo(expected);
        System.out.println("JWT_PG public-path=" + path + " status=" + response.getStatus());
        return response.getContentAsByteArray().length == 0 ? mapper.nullNode() : mapper.readTree(response.getContentAsByteArray());
    }

    private void acceptedStatus(String label, String token, int expected) throws Exception {
        var response = mvc.perform(get("/api/categories").header("Authorization", "Bearer " + token))
                .andReturn().getResponse();
        assertThat(response.getStatus()).as(label).isEqualTo(expected);
        if (expected == 401) {
            assertThat(response.getHeader("WWW-Authenticate")).isEqualTo("Bearer error=\"invalid_token\"");
            assertThat(mapper.readTree(response.getContentAsByteArray()).path("message").asText())
                    .isEqualTo("Invalid or expired token");
        }
        System.out.println("JWT_PG step=" + label + " status=" + response.getStatus());
    }

    private String registerVerifyLogin(String address) throws Exception {
        postJson("/api/auth/register", Map.of("name", "Synthetic JWT user", "email", address, "password", PASSWORD), 201);
        User user = users.findByEmail(address).orElseThrow();
        verify(email).sendVerificationEmail(eq(address), eq("Synthetic JWT user"), eq(user.getVerificationToken()));
        var verified = mvc.perform(get("/api/auth/verify").param("token", user.getVerificationToken()))
                .andReturn().getResponse();
        assertThat(verified.getStatus()).isEqualTo(302);
        System.out.println("JWT_PG step=verify-account status=302");
        return postJson("/api/auth/login", Map.of("email", address, "password", PASSWORD), 200).path("token").asText();
    }

    @Test
    void successfulResetThenDeactivationRevokeOnlyTheTargetAccount() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String alice = "alice-" + suffix + "@jwt.invalid";
        String bob = "bob-" + suffix + "@jwt.invalid";
        String jwtA = registerVerifyLogin(alice);
        String otherJwt = registerVerifyLogin(bob);
        acceptedStatus("JWT_A-before-reset", jwtA, 200);
        assertThat(users.findByEmail(alice).orElseThrow().getTokenVersion()).isZero();

        // Critical fixture correction: let UserService generate BOTH token and expiry.
        // A SQL now()+interval fixture uses the database timezone, not the JVM timezone.
        postJson("/api/auth/forgot-password", Map.of("email", alice), 200);
        User requested = users.findByEmail(alice).orElseThrow();
        assertThat(requested.getResetTokenExpiry()).isAfter(LocalDateTime.now()).isBefore(LocalDateTime.now().plusHours(2));
        assertThat(requested.getResetToken()).matches("[a-f0-9-]{36}");
        verify(email).sendPasswordResetEmail(eq(alice), anyString(), eq(requested.getResetToken()));
        postJson("/api/auth/reset-password", Map.of("token", requested.getResetToken(), "password", NEW_PASSWORD), 200);

        // Each prerequisite above must pass before any revocation is considered tested.
        User reset = users.findByEmail(alice).orElseThrow();
        assertThat(reset.getTokenVersion()).isEqualTo(1);
        assertThat(reset.getResetToken()).isNull();
        assertThat(reset.getResetTokenExpiry()).isNull();
        acceptedStatus("JWT_A-after-reset", jwtA, 401);
        acceptedStatus("other-user-after-reset", otherJwt, 200);
        String jwtB = postJson("/api/auth/login", Map.of("email", alice, "password", NEW_PASSWORD), 200).path("token").asText();
        acceptedStatus("JWT_B-after-new-login", jwtB, 200);

        User disabled = users.findByEmail(alice).orElseThrow();
        disabled.setEnabled(false);
        users.saveAndFlush(disabled); // Real entity path; do NOT manually bump the SQL column.
        assertThat(users.findByEmail(alice).orElseThrow().getTokenVersion()).isEqualTo(2);
        acceptedStatus("JWT_B-after-deactivation", jwtB, 401);
        acceptedStatus("other-user-after-deactivation", otherJwt, 200);
        assertThat(users.findByEmail(bob).orElseThrow().getTokenVersion()).isZero();
        System.out.println("JWT_PG versions target=0->1->2 other=0");
    }

    @Test
    void utcSqlFixtureCanBeFutureInPostgresButExpiredInParis() throws Exception {
        try (Connection connection = DriverManager.getConnection(databaseUrl("audit.pg.url", "aura_jwt_empty_"),
                "aura_jwt_validation", System.getenv("AURA_JWT_TEST_DB_PASSWORD"));
             var statement = connection.createStatement()) {
            statement.execute("SET TIME ZONE 'UTC'");
            try (var result = statement.executeQuery("SELECT current_setting('TimeZone'), "
                     + "(current_timestamp AT TIME ZONE 'UTC') + interval '10 minutes'")) {
            assertThat(result.next()).isTrue();
            assertThat(result.getString(1)).isIn("UTC", "Etc/UTC");
            LocalDateTime fixture = result.getObject(2, LocalDateTime.class);
            assertThat(fixture).isAfter(LocalDateTime.now(ZoneId.of("UTC")));
            assertThat(fixture).isBefore(LocalDateTime.now(ZoneId.of("Europe/Paris")));
            System.out.println("JWT_PG UTC fixture: future in database UTC, expired for Paris comparison");
            }
        }
    }

    @Test
    void invalidJwtVariantsReturn401WithoutBlockingPublicAuthEndpoints() throws Exception {
        String address = "variants-" + UUID.randomUUID() + "@jwt.invalid";
        String valid = registerVerifyLogin(address);
        acceptedStatus("valid-token", valid, 200);
        var key = (javax.crypto.SecretKey) org.springframework.test.util.ReflectionTestUtils.getField(jwt, "signingKey");
        assertThat(key).isNotNull();
        for (String variant : new String[]{"expired", "wrong-version", "without-version"}) {
            var builder = Jwts.builder().subject(address).issuedAt(new Date())
                    .expiration(new Date(System.currentTimeMillis() + (variant.equals("expired") ? -60000 : 600000)));
            if (!variant.equals("without-version")) builder.claim("ver", variant.equals("wrong-version") ? 99 : 0);
            acceptedStatus(variant, builder.signWith(key).compact(), 401);
        }
        String wrongKey = Jwts.builder().subject(address).claim("ver", 0)
                .expiration(new Date(System.currentTimeMillis() + 600000)).signWith(Jwts.SIG.HS256.key().build()).compact();
        acceptedStatus("wrong-signature", wrongKey, 401);
        var login = mvc.perform(post("/api/auth/login").header("Authorization", "Bearer " + wrongKey)
                        .contentType("application/json").content(mapper.writeValueAsBytes(Map.of("email", address, "password", PASSWORD))))
                .andReturn().getResponse();
        assertThat(login.getStatus()).isEqualTo(200);
        System.out.println("JWT_PG step=public-login-with-rejected-bearer status=200");
        postJson("/api/auth/forgot-password", Map.of("email", "unknown@jwt.invalid"), 200);
        postJson("/api/auth/reset-password", Map.of("token", "not-a-reset-token", "password", NEW_PASSWORD), 400);
        assertThat(mvc.perform(get("/api/auth/verify").param("token", "not-a-verification-token"))
                .andReturn().getResponse().getStatus()).isEqualTo(302);
        assertThat(mvc.perform(get("/api/categories")).andReturn().getResponse().getStatus()).isEqualTo(403);
        System.out.println("JWT_PG public-invalid-verify=302 anonymous-protected=403");
    }

    private Map<String, String> fingerprints(Connection connection) throws Exception {
        Map<String, String> result = new LinkedHashMap<>();
        for (String table : TABLES) {
            try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                    "SELECT count(*), md5(COALESCE(string_agg((to_jsonb(t)-'token_version')::text, E'\\n' ORDER BY id),'')) FROM public."
                            + table + " t")) {
                rows.next();
                result.put(table, rows.getLong(1) + ":" + rows.getString(2));
            }
        }
        try (var statement = connection.createStatement(); var rows = statement.executeQuery(
                "SELECT sequencename, last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")) {
            while (rows.next()) result.put("sequence:" + rows.getString(1), String.valueOf(rows.getObject(2)));
        }
        return result;
    }

    @Test
    void flywayV2PreservesEveryExistingRowAndIdentitySequenceOnRestoredCopy() throws Exception {
        String url = databaseUrl("audit.pg.copy-url", "aura_jwt_copy_");
        String password = System.getenv("AURA_JWT_TEST_DB_PASSWORD");
        try (Connection connection = DriverManager.getConnection(url, "aura_jwt_validation", password)) {
            Map<String, String> before = fingerprints(connection);
            Flyway migration = Flyway.configure().dataSource(url, "aura_jwt_validation", password)
                    .locations("classpath:db/migration").baselineOnMigrate(true).baselineVersion("1").cleanDisabled(true).load();
            var migrated = migration.migrate();
            assertThat(migrated.migrationsExecuted).isEqualTo(1);
            assertThat(fingerprints(connection)).as("All seven tables and their identity sequences must remain unchanged")
                    .isEqualTo(before);
            try (var statement = connection.createStatement();
                 var result = statement.executeQuery("SELECT count(*) FROM users WHERE token_version <> 0 OR token_version IS NULL")) {
                result.next(); assertThat(result.getLong(1)).isZero();
            }
            assertThat(migration.validateWithResult().validationSuccessful).isTrue();
            System.out.println("JWT_PG restored-copy: V2 migrated, 7 table fingerprints and identity sequences preserved");
        }
    }
}
