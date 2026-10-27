package com.financetracker.config;

import com.financetracker.repository.*;
import com.financetracker.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductionConfigurationTest {
    private ApplicationContextRunner config() {
        return new ApplicationContextRunner().withInitializer(new ConfigDataApplicationContextInitializer());
    }

    @ParameterizedTest
    @ValueSource(strings = {"prod", "dev,prod", "test,prod"})
    void missingSecretFailsInProductionEvenWithMixedProfiles(String profiles) {
        config().withUserConfiguration(JwtUtil.class)
                .withPropertyValues("spring.profiles.active=" + profiles, "jwt.secret=")
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().hasRootCauseMessage(profiles.equals("prod")
                                ? "JWT_SECRET is required outside dev/test"
                                : "The prod profile cannot be combined with dev or test"));
    }

    @Test
    void noExplicitProfileDefaultsToStrictProduction() {
        config().withUserConfiguration(JwtUtil.class).withPropertyValues("jwt.secret=")
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().hasRootCauseMessage("JWT_SECRET is required outside dev/test"));
    }

    @Test
    void shortSecretFailsAtStartup() {
        config().withUserConfiguration(JwtUtil.class)
                .withPropertyValues("spring.profiles.active=prod", "jwt.secret=too-short")
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().hasRootCauseMessage("JWT_SECRET must contain at least 32 UTF-8 bytes"));
    }

    @Test
    void validSecretStartsAndSignsTokens() {
        config().withUserConfiguration(JwtUtil.class)
                .withPropertyValues("spring.profiles.active=prod", "jwt.secret=" + "t".repeat(32))
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    var jwt = context.getBean(JwtUtil.class);
                    assertThat(jwt.extractEmail(jwt.generateToken("test@example.invalid"))).isEqualTo("test@example.invalid");
                });
    }

    @ParameterizedTest
    @ValueSource(strings = {"dev", "test"})
    void localProfilesGenerateDifferentEphemeralSigningKeys(String profile) {
        var runner = config().withUserConfiguration(JwtUtil.class)
                .withPropertyValues("spring.profiles.active=" + profile, "jwt.secret=");
        runner.run(first -> {
            String token = first.getBean(JwtUtil.class).generateToken("test@example.invalid");
            runner.run(second -> assertThatThrownBy(() -> second.getBean(JwtUtil.class).extractEmail(token))
                    .isInstanceOf(io.jsonwebtoken.security.SignatureException.class));
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"prod", "test", "dev,prod", "dev,test"})
    void seederCannotLoadOutsideExclusiveDev(String profile) {
        config().withUserConfiguration(DataSeeder.class).withPropertyValues("spring.profiles.active=" + profile)
                .run(context -> assertThat(context).doesNotHaveBean(DataSeeder.class));
    }

    @Test
    void seederCanLoadInDevWithoutRunningOrTouchingRepositories() {
        var categories = mock(CategoryRepository.class);
        var transactions = mock(TransactionRepository.class);
        var users = mock(UserRepository.class);
        config().withUserConfiguration(DataSeeder.class).withPropertyValues("spring.profiles.active=dev")
                .withBean(CategoryRepository.class, () -> categories)
                .withBean(TransactionRepository.class, () -> transactions)
                .withBean(UserRepository.class, () -> users)
                .withBean(PasswordEncoder.class, () -> mock(PasswordEncoder.class))
                .run(context -> {
                    assertThat(context).hasSingleBean(DataSeeder.class);
                    verifyNoInteractions(categories, transactions, users);
                });
    }

    @Test
    void productionDisablesSqlAndSensitiveServiceLoggingAndSchemaWrites() {
        config().withPropertyValues("spring.profiles.active=prod").run(context -> {
            var env = context.getEnvironment();
            assertThat(env.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
            assertThat(env.getProperty("spring.jpa.show-sql")).isEqualTo("false");
            var levels = org.springframework.boot.context.properties.bind.Binder.get(env).bind("logging.level",
                    org.springframework.boot.context.properties.bind.Bindable.mapOf(String.class, String.class)).get();
            assertThat(levels).containsEntry("org.hibernate.SQL", "OFF")
                    .containsEntry("com.financetracker.service", "WARN");
        });
    }
}
