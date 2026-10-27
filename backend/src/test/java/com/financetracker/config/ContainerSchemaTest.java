package com.financetracker.config;

import com.financetracker.entity.User;
import com.financetracker.repository.UserRepository;
import com.financetracker.security.JwtUtil;
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
// database. This never uses the existing PostgreSQL or Docker volumes.
@ActiveProfiles("prod")
@AutoConfigureMockMvc
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:container-schema;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.sql.init.mode=always", "spring.sql.init.schema-locations=classpath:db/docker-init.sql",
        "app.frontend-url=http://localhost:8088", "app.backend-url=http://localhost:8088",
        "app.mail.from=test@example.invalid", "gemini.api-key=", "spring.mail.password="
})
class ContainerSchemaTest {
    @Autowired private MockMvc mvc;
    @Autowired private ApplicationContext context;
    @Autowired private UserRepository users;
    @Autowired private JwtUtil jwt;

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
            mvc.perform(get("/api/categories").header("Authorization", "Bearer " + jwt.generateToken(user.getEmail())))
                    .andExpect(status().isOk()).andExpect(content().json("[]"));
        } finally {
            users.delete(user);
        }
    }
}
