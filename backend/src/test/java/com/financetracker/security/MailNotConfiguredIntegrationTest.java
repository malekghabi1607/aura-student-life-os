package com.financetracker.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Real EmailService with an empty RESEND_API_KEY, as in a stack whose secret file is empty.
@SpringBootTest(properties = {"spring.mail.password=", "management.health.mail.enabled=false",
        "logging.level.org.springframework.web=WARN", "logging.level.org.hibernate=ERROR"})
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
class MailNotConfiguredIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @MockitoBean JavaMailSender smtp;

    private String call(String path, Map<String, String> body, int expected) throws Exception {
        return mvc.perform(post(path).contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
    }

    @Test void registrationKeepsTheAccountAndExplainsThatEmailIsNotConfigured() throws Exception {
        String email = UUID.randomUUID() + "@mail-off.invalid";
        mvc.perform(post("/api/auth/register").contentType("application/json").content(mapper.writeValueAsString(
                        Map.of("name", "Pending", "email", email, "password", "Mail-Off-Password1"))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.emailSent").value(false))
                .andExpect(jsonPath("$.code").value("EMAIL_SERVICE_UNAVAILABLE"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("n'est pas configuré")));
        assertThat(users.findByEmail(email)).get().satisfies(user -> {
            assertThat(user.isEnabled()).isFalse();
            assertThat(user.getVerificationToken()).isNotBlank();
        });
        verify(smtp, never()).send(any(MimeMessage.class));
    }

    @Test void resendAndForgotAnswerTheSame503ForKnownAndUnknownAccounts() throws Exception {
        String known = UUID.randomUUID() + "@mail-off.invalid";
        call("/api/auth/register", Map.of("name", "Known", "email", known, "password", "Mail-Off-Password1"), 201);
        for (String path : new String[]{"/api/auth/resend-verification", "/api/auth/forgot-password"}) {
            String forKnown = call(path, Map.of("email", known), 503);
            String forUnknown = call(path, Map.of("email", "unknown-" + known), 503);
            assertThat(forKnown).isEqualTo(forUnknown).contains("EMAIL_SERVICE_UNAVAILABLE");
        }
        assertThat(users.findByEmail(known)).get().satisfies(user -> assertThat(user.getResetToken()).isNull());
        verify(smtp, never()).send(any(MimeMessage.class));
    }
}
