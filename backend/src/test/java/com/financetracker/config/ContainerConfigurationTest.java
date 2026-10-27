package com.financetracker.config;

import com.financetracker.entity.User;
import com.financetracker.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class ContainerConfigurationTest {
    @TempDir Path secrets;

    @Test
    void configTreeSecretsResolveTheProductionPlaceholders() throws Exception {
        String jwt = UUID.randomUUID().toString() + UUID.randomUUID();
        Files.writeString(secrets.resolve("JWT_SECRET"), jwt);
        Files.writeString(secrets.resolve("DATABASE_PASSWORD"), "isolated-test-password");
        Files.writeString(secrets.resolve("GEMINI_API_KEY"), "");
        Files.writeString(secrets.resolve("RESEND_API_KEY"), "");
        new ApplicationContextRunner().withInitializer(new ConfigDataApplicationContextInitializer())
                .withUserConfiguration(JwtUtil.class)
                .withPropertyValues("spring.profiles.active=prod", "spring.config.import=configtree:"
                        + secrets.toAbsolutePath().toString().replace('\\', '/') + "/")
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    var env = context.getEnvironment();
                    assertThat(env.getProperty("jwt.secret")).isEqualTo(jwt);
                    assertThat(env.getProperty("spring.datasource.password")).isEqualTo("isolated-test-password");
                    assertThat(env.getProperty("gemini.api-key")).isEmpty();
                    assertThat(context.getBean(JwtUtil.class).extractEmail(
                            context.getBean(JwtUtil.class).generateToken(User.builder().email("container@test.invalid").build())))
                            .isEqualTo("container@test.invalid");
                });
    }
}
