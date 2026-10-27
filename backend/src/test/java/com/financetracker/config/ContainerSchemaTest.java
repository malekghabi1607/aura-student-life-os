package com.financetracker.config;

import com.financetracker.entity.User;
import com.financetracker.repository.UserRepository;
import com.financetracker.security.JwtUtil;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationState;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Production application context, but the datasource is explicitly a disposable H2
// database. This never uses the existing PostgreSQL or Docker volumes. The schema is
// created by the Flyway migrations exactly as on a new PostgreSQL database.
@ActiveProfiles("prod")
@AutoConfigureMockMvc
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:container-schema;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.frontend-url=http://localhost:8088", "app.backend-url=http://localhost:8088",
        "app.mail.from=test@example.invalid", "gemini.api-key=", "spring.mail.password="
})
class ContainerSchemaTest {
    @Autowired private MockMvc mvc;
    @Autowired private ApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private JwtUtil jwt;
    @Autowired private Flyway flyway;

    @DynamicPropertySource
    static void secret(DynamicPropertyRegistry registry) {
        String key = UUID.randomUUID().toString() + UUID.randomUUID();
        registry.add("jwt.secret", () -> key);
    }

    @Test
    void productionBootValidatesInitialSchemaWithoutSeeder() {
        assertThat(context.getBeansOfType(DataSeeder.class)).isEmpty();
        assertThat(users.count()).isZero();
    }

    @Test
    void newDatabaseIsCreatedByMigrationsWithoutBaseline() {
        var applied = flyway.info().applied();
        assertThat(applied).hasSize(2);
        assertThat(applied).extracting(m -> m.getVersion().getVersion()).containsExactly("1", "2");
        assertThat(applied).allMatch(m -> m.getState() == MigrationState.SUCCESS);
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(flyway.getConfiguration().isBaselineOnMigrate()).isFalse();
    }

    @Test
    void readinessIncludesDatabaseAndDoesNotExposeDetails() throws Exception {
        mvc.perform(get("/actuator/health/readiness"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
    }

    @Test
    void authenticatedApiReadsTheInitializedDatabase() throws Exception {
        User user = users.saveAndFlush(User.builder().name("Container test")
                .email("container@example.invalid").password("not-a-login-password").enabled(true).build());
        try {
            mvc.perform(get("/api/categories").header("Authorization", "Bearer " + jwt.generateToken(user)))
                    .andExpect(status().isOk()).andExpect(content().json("[]"));
        } finally {
            users.delete(user);
        }
    }
}
