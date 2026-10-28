package com.financetracker.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(OutputCaptureExtension.class)
class EmailServiceTest {
    JavaMailSender smtp;
    EmailService service;
    @BeforeEach void setup() {
        smtp = mock(JavaMailSender.class);
        service = new EmailService(smtp);
        ReflectionTestUtils.setField(service, "backendUrl", "https://aura.example.invalid/");
        ReflectionTestUtils.setField(service, "frontendUrl", "https://aura.example.invalid/");
        ReflectionTestUtils.setField(service, "fromAddress", "no-reply@example.invalid");
        ReflectionTestUtils.setField(service, "smtpPassword", "SYNTHETIC-not-a-resend-key");
        when(smtp.createMimeMessage()).thenAnswer(call -> new MimeMessage((Session) null));
    }
    @Test void verificationMailContainsPublicLinkEscapesNameAndDoesNotLogToken(CapturedOutput output) throws Exception {
        String token = "synthetic-verification-token";
        assertThat(service.sendVerificationEmail("user@example.invalid", "<img src=x onerror=alert(1)>", token)).isTrue();
        var sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(smtp).send(sent.capture());
        String body = ((jakarta.mail.Multipart) ((jakarta.mail.Multipart) sent.getValue().getContent())
                .getBodyPart(0).getContent()).getBodyPart(0).getContent().toString();
        assertThat(body).contains("https://aura.example.invalid/api/auth/verify?token=" + token)
                .contains("&lt;img").doesNotContain("<img");
        assertThat(output.getAll()).doesNotContain(token, "user@example.invalid");
    }
    @Test void resetMailUsesFrontendRouteAndDoesNotLogToken(CapturedOutput output) throws Exception {
        String token = "synthetic-reset-token";
        assertThat(service.sendPasswordResetEmail("user@example.invalid", "User", token)).isTrue();
        var sent = ArgumentCaptor.forClass(MimeMessage.class); verify(smtp).send(sent.capture());
        String body = ((jakarta.mail.Multipart) ((jakarta.mail.Multipart) sent.getValue().getContent())
                .getBodyPart(0).getContent()).getBodyPart(0).getContent().toString();
        assertThat(body).contains("https://aura.example.invalid/reset-password?token=" + token);
        assertThat(output.getAll()).doesNotContain(token);
    }
    @Test void failureIsReportedWithoutLoggingProviderPayloadOrCredentials(CapturedOutput output) {
        String sensitive = "SYNTHETIC-provider-payload-password-token";
        doThrow(new MailSendException(sensitive)).when(smtp).send(any(MimeMessage.class));
        assertThat(service.sendVerificationEmail("user@example.invalid", "User", sensitive)).isFalse();
        assertThat(service.sendPasswordResetEmail("user@example.invalid", "User", sensitive)).isFalse();
        assertThat(output.getAll()).doesNotContain(sensitive, "user@example.invalid");
    }
    @Test void missingApiKeyDisablesDeliveryWithoutContactingSmtp(CapturedOutput output) {
        ReflectionTestUtils.setField(service, "smtpPassword", "");
        assertThat(service.isDeliveryDisabled()).isTrue();
        assertThat(service.sendVerificationEmail("user@example.invalid", "User", "synthetic-token")).isFalse();
        assertThat(service.sendPasswordResetEmail("user@example.invalid", "User", "synthetic-token")).isFalse();
        verify(smtp, never()).send(any(MimeMessage.class));
        assertThat(output.getAll()).contains("not configured").doesNotContain("synthetic-token", "user@example.invalid");
    }
    @Test void configurationWarningsNameTheProblemButNeverTheKey(CapturedOutput output) {
        service.logConfigurationWarnings();
        assertThat(output.getAll()).doesNotContain("E-mail delivery disabled", "Resend test domain");
        ReflectionTestUtils.setField(service, "fromAddress", "onboarding@resend.dev");
        service.logConfigurationWarnings();
        assertThat(output.getAll()).contains("Resend test domain");
        ReflectionTestUtils.setField(service, "smtpPassword", " ");
        service.logConfigurationWarnings();
        assertThat(output.getAll()).contains("RESEND_API_KEY is empty").doesNotContain("SYNTHETIC-not-a-resend-key");
    }
}
