package com.financetracker.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.entity.User;
import com.financetracker.repository.UserRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Real controllers, security, BCrypt, repositories and EmailService. Only SMTP is simulated.
@SpringBootTest(properties = {"logging.level.org.springframework.web=WARN",
        "logging.level.org.springframework.security=WARN", "logging.level.org.hibernate=ERROR",
        "management.health.mail.enabled=false",
        // Synthetic placeholder so the real EmailService is "configured"; SMTP itself is mocked.
        "spring.mail.password=SYNTHETIC-not-a-resend-key"})
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
class AuthFlowIntegrationTest {
    @DynamicPropertySource
    static void optionalPostgres(DynamicPropertyRegistry registry) {
        if (!Boolean.getBoolean("audit.postgres")) return;
        String url = System.getProperty("audit.pg.url", "");
        if (!url.matches("jdbc:postgresql://127\\.0\\.0\\.1:[0-9]+/aura_jwt_empty_[a-z0-9_]+")) {
            throw new IllegalStateException("Refusing an authentication test database outside the temporary namespace");
        }
        registry.add("spring.datasource.url", () -> url);
        registry.add("spring.datasource.username", () -> "aura_jwt_validation");
        registry.add("spring.datasource.password", () -> System.getenv("AURA_JWT_TEST_DB_PASSWORD"));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> true);
        registry.add("spring.flyway.baseline-on-migrate", () -> false);
    }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @MockitoBean JavaMailSender smtp;
    private String email;
    private static final String PASSWORD = "Initial-Test-Password1";

    @BeforeEach void fixture() {
        email = UUID.randomUUID() + "@auth.invalid";
        when(smtp.createMimeMessage()).thenAnswer(call -> new MimeMessage((Session) null));
    }

    private String json(Map<String, String> fields) throws Exception { return mapper.writeValueAsString(fields); }
    private void register() throws Exception {
        mvc.perform(post("/api/auth/register").contentType("application/json")
                        .content(json(Map.of("name", "Test account", "email", email, "password", PASSWORD))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.emailSent").value(true));
    }
    private User account() { return users.findByEmail(email).orElseThrow(); }
    private void verifyAccount() throws Exception {
        mvc.perform(get("/api/auth/verify").param("token", account().getVerificationToken()))
                .andExpect(status().isFound()).andExpect(redirectedUrl("http://localhost:5173/login?verified=true"));
    }
    private String login(String password) throws Exception {
        var result = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(json(Map.of("email", email, "password", password))))
                .andExpect(status().isOk()).andReturn();
        return mapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    @Test void smtpFailurePreservesAccountAndReportsDeliveryFailure() throws Exception {
        doThrow(new MailSendException("Synthetic SMTP failure")).when(smtp).send(any(MimeMessage.class));
        mvc.perform(post("/api/auth/register").contentType("application/json")
                        .content(json(Map.of("name", "Test account", "email", email, "password", PASSWORD))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.emailSent").value(false));
        assertThat(account().isEnabled()).isFalse();
        assertThat(account().getVerificationToken()).isNotBlank();
        // Advance just the synthetic fixture past the resend cooldown; no sleep or real email.
        User pending = account(); pending.setVerificationTokenExpiry(Instant.now().minusSeconds(1));
        users.saveAndFlush(pending);
        doNothing().when(smtp).send(any(MimeMessage.class));
        mvc.perform(post("/api/auth/resend-verification").contentType("application/json")
                        .content(json(Map.of("email", email)))).andExpect(status().isOk());
        verifyAccount(); login(PASSWORD);
    }

    @Test void pendingAccountRequiresCorrectCredentialsBeforeDisclosingVerificationStatus() throws Exception {
        register();
        String invalid = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(json(Map.of("email", email, "password", "wrong-password"))))
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(json(Map.of("email", "unknown-" + email, "password", "wrong-password"))))
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        assertThat(invalid).isEqualTo(unknown);
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(json(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"));
    }

    @Test void resendEndpointExistsWithoutEnumeratingAccounts() throws Exception {
        mvc.perform(post("/api/auth/resend-verification").contentType("application/json")
                        .content(json(Map.of("email", email))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.message").isString());
        verify(smtp, never()).send(any(MimeMessage.class));
    }

    @Test void completeFlowRevokesResetAndLogoutTokens() throws Exception {
        register(); verifyAccount();
        String jwtA = login(PASSWORD);
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + jwtA)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/forgot-password").contentType("application/json").content(json(Map.of("email", email))))
                .andExpect(status().isOk());
        String reset = account().getResetToken();
        String updated = "Updated-Test-Password2";
        mvc.perform(post("/api/auth/reset-password").contentType("application/json")
                        .content(json(Map.of("token", reset, "password", updated))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/categories").header("Authorization", "Bearer " + jwtA)).andExpect(status().isUnauthorized());
        String jwtB = login(updated);
        mvc.perform(post("/api/auth/logout").header("Authorization", "Bearer " + jwtB)).andExpect(status().isNoContent());
        mvc.perform(get("/api/categories").header("Authorization", "Bearer " + jwtB)).andExpect(status().isUnauthorized());
        assertThat(account().getTokenVersion()).isEqualTo(2);
    }

    @Test void anonymousMeDoesNotProduceInternalServerError() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isForbidden());
        mvc.perform(get("/api/auth/verify"))
                .andExpect(redirectedUrl("http://localhost:5173/login?error=invalid-token"));
    }

    @Test void expiredResetIsRejectedAndDoesNotChangePasswordOrVersion() throws Exception {
        register(); verifyAccount();
        User user = account();
        user.setResetToken(UUID.randomUUID().toString());
        user.setResetTokenExpiry(LocalDateTime.now().minusSeconds(1));
        users.saveAndFlush(user);
        mvc.perform(post("/api/auth/reset-password").contentType("application/json")
                        .content(json(Map.of("token", user.getResetToken(), "password", "Unused-Test-Password2"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("expir")));
        assertThat(account().getTokenVersion()).isZero();
        login(PASSWORD);
    }

    @Test void confirmationExpiresAndResendRotatesSingleUseLink() throws Exception {
        register();
        User pending = account();
        String oldToken = pending.getVerificationToken();
        assertThat(pending.getVerificationTokenExpiry()).isAfter(Instant.now());
        pending.setVerificationTokenExpiry(Instant.now().minusSeconds(1));
        users.saveAndFlush(pending);
        mvc.perform(get("/api/auth/verify").param("token", oldToken))
                .andExpect(redirectedUrl("http://localhost:5173/login?error=expired-token"));
        assertThat(account().isEnabled()).isFalse();
        mvc.perform(post("/api/auth/resend-verification").contentType("application/json")
                        .content(json(Map.of("email", email)))).andExpect(status().isOk());
        String renewed = account().getVerificationToken();
        assertThat(renewed).isNotEqualTo(oldToken);
        verify(smtp, times(2)).send(any(MimeMessage.class));
        mvc.perform(get("/api/auth/verify").param("token", oldToken))
                .andExpect(redirectedUrl("http://localhost:5173/login?error=invalid-token"));
        verifyAccount();
        assertThat(account().getVerificationToken()).isNull();
        mvc.perform(get("/api/auth/verify").param("token", renewed))
                .andExpect(redirectedUrl("http://localhost:5173/login?error=invalid-token"));
        login(PASSWORD);
    }

    @Test void legacyPendingAccountCanRecoverAndResendIsThrottled() throws Exception {
        register();
        User legacy = account(); legacy.setVerificationTokenExpiry(null); users.saveAndFlush(legacy);
        mvc.perform(get("/api/auth/verify").param("token", legacy.getVerificationToken()))
                .andExpect(redirectedUrl("http://localhost:5173/login?error=expired-token"));
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/api/auth/resend-verification").contentType("application/json")
                            .content(json(Map.of("email", email)))).andExpect(status().isOk());
        }
        verify(smtp, times(2)).send(any(MimeMessage.class)); // initial + one resend, never two
        verifyAccount();
    }

    @Test void forgotPasswordSmtpFailureIsGenericAndAccountRemainsUsable() throws Exception {
        register(); verifyAccount();
        doThrow(new MailSendException("Synthetic temporary failure")).when(smtp).send(any(MimeMessage.class));
        String known = mvc.perform(post("/api/auth/forgot-password").contentType("application/json")
                        .content(json(Map.of("email", email)))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(post("/api/auth/forgot-password").contentType("application/json")
                        .content(json(Map.of("email", "unknown-" + email)))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(known).isEqualTo(unknown);
        assertThat(account().getResetToken()).isNotBlank();
        assertThat(account().getResetTokenExpiry()).isAfter(LocalDateTime.now());
        login(PASSWORD);
    }

    @Test void resetTokenCannotBeReusedAndOldPasswordStopsWorking() throws Exception {
        register(); verifyAccount();
        mvc.perform(post("/api/auth/forgot-password").contentType("application/json")
                        .content(json(Map.of("email", email)))).andExpect(status().isOk());
        String reset = account().getResetToken();
        String body = json(Map.of("token", reset, "password", "New-Test-Password3"));
        mvc.perform(post("/api/auth/reset-password").contentType("application/json").content(body)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/reset-password").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(json(Map.of("email", email, "password", PASSWORD)))).andExpect(status().isUnauthorized());
        login("New-Test-Password3");
        assertThat(account().getTokenVersion()).isEqualTo(1);
    }

    @Test void resendDoesNotReenableADeactivatedVerifiedAccount() throws Exception {
        register(); verifyAccount();
        User disabled = account(); disabled.setEnabled(false); users.saveAndFlush(disabled);
        clearInvocations(smtp);
        mvc.perform(post("/api/auth/resend-verification").contentType("application/json")
                        .content(json(Map.of("email", email)))).andExpect(status().isOk());
        verify(smtp, never()).send(any(MimeMessage.class));
        assertThat(account().isEnabled()).isFalse();
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(json(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"));
    }

    @Test void passwordResetNeverVerifiesAPendingAccount() throws Exception {
        register();
        mvc.perform(post("/api/auth/forgot-password").contentType("application/json")
                        .content(json(Map.of("email", email)))).andExpect(status().isOk());
        String updated = "Reset-Before-Verification4";
        mvc.perform(post("/api/auth/reset-password").contentType("application/json")
                        .content(json(Map.of("token", account().getResetToken(), "password", updated))))
                .andExpect(status().isOk());
        assertThat(account().isEnabled()).isFalse();
        assertThat(account().getVerificationToken()).isNotBlank();
        mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(json(Map.of("email", email, "password", updated))))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"));
        verifyAccount();
        login(updated);
    }

    @Test void transientSmtpFailureAtRegistrationIsExplained() throws Exception {
        doThrow(new MailSendException("Synthetic SMTP failure")).when(smtp).send(any(MimeMessage.class));
        mvc.perform(post("/api/auth/register").contentType("application/json")
                        .content(json(Map.of("name", "Test account", "email", email, "password", PASSWORD))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.emailSent").value(false))
                .andExpect(jsonPath("$.code").value("EMAIL_DELIVERY_FAILED"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("n'a pas pu être envoyé")));
    }
}
