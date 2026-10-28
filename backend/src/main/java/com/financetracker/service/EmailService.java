package com.financetracker.service;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.backend-url}")
    private String backendUrl;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.mail.from}")
    private String fromAddress;

    // Resend API key used as SMTP password; only its presence is ever checked, never logged.
    @Value("${spring.mail.password:}")
    private String smtpPassword;

    /** True when sending cannot work at all (no API key or no sender), whatever the recipient. */
    public boolean isDeliveryDisabled() {
        return !StringUtils.hasText(smtpPassword) || !StringUtils.hasText(fromAddress);
    }

    @PostConstruct
    void logConfigurationWarnings() {
        if (!StringUtils.hasText(smtpPassword)) {
            log.warn("E-mail delivery disabled: RESEND_API_KEY is empty; verification and reset e-mails cannot be sent");
        }
        if (!StringUtils.hasText(fromAddress)) {
            log.warn("E-mail delivery disabled: APP_MAIL_FROM is empty");
        } else if (fromAddress.trim().toLowerCase().endsWith("@resend.dev")) {
            log.warn("APP_MAIL_FROM uses the Resend test domain: e-mails are only delivered to the Resend account owner");
        }
    }

    public boolean sendVerificationEmail(String to, String name, String token) {
        if (isDeliveryDisabled()) {
            log.warn("Verification email not sent: e-mail delivery is not configured");
            return false;
        }
        try {
            String verifyUrl = mailLink(backendUrl, "/api/auth/verify", token);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Activez votre compte Aura");
            helper.setText(buildVerificationHtml(HtmlUtils.htmlEscape(name), verifyUrl), true);
            mailSender.send(message);
            log.info("Verification email accepted by SMTP provider");
            return true;
        } catch (Exception e) {
            log.warn("Verification email could not be sent; check mail configuration");
            return false;
        }
    }

    public boolean sendPasswordResetEmail(String to, String name, String token) {
        if (isDeliveryDisabled()) {
            log.warn("Password reset email not sent: e-mail delivery is not configured");
            return false;
        }
        try {
            String resetUrl = mailLink(frontendUrl, "/reset-password", token);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Réinitialisation de votre mot de passe Aura");
            helper.setText(buildResetHtml(HtmlUtils.htmlEscape(name), resetUrl), true);
            mailSender.send(message);
            log.info("Password reset email accepted by SMTP provider");
            return true;
        } catch (Exception e) {
            log.warn("Password reset email could not be sent; check mail configuration");
            return false;
        }
    }

    private String mailLink(String base, String path, String token) {
        return UriComponentsBuilder.fromUriString(base.replaceAll("/+$", ""))
                .path(path).queryParam("token", token).build().encode().toUriString();
    }

    private String buildVerificationHtml(String name, String verifyUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07070e;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:520px;margin:40px auto;background:#111120;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6);border:1px solid rgba(168,85,247,0.15);">
                <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px 40px;">
                  <div style="font-size:1.6rem;font-weight:800;color:white;letter-spacing:-0.5px;">✦ Aura</div>
                  <div style="font-size:0.78rem;color:rgba(255,255,255,0.7);margin-top:4px;">Student Life OS</div>
                </div>
                <div style="padding:36px 40px;">
                  <h2 style="color:#f1f5f9;margin:0 0 12px;font-size:1.3rem;">Bienvenue, %s !</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 28px;">
                    Votre compte Aura a été créé. Cliquez ci-dessous pour activer votre accès.
                  </p>
                  <a href="%s"
                     style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;
                            padding:14px 32px;border-radius:999px;text-decoration:none;
                            font-weight:700;font-size:0.95rem;letter-spacing:0.3px;">
                    ✓ Activer mon compte
                  </a>
                  <p style="color:#475569;font-size:0.78rem;margin:28px 0 0;line-height:1.5;">
                    Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                  </p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name, verifyUrl);
    }

    private String buildResetHtml(String name, String resetUrl) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#07070e;font-family:'Segoe UI',Arial,sans-serif;">
              <div style="max-width:520px;margin:40px auto;background:#111120;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.6);border:1px solid rgba(168,85,247,0.15);">
                <div style="background:linear-gradient(135deg,#7c3aed,#22d3ee);padding:32px 40px;">
                  <div style="font-size:1.6rem;font-weight:800;color:white;letter-spacing:-0.5px;">✦ Aura</div>
                  <div style="font-size:0.78rem;color:rgba(255,255,255,0.7);margin-top:4px;">Student Life OS</div>
                </div>
                <div style="padding:36px 40px;">
                  <h2 style="color:#f1f5f9;margin:0 0 12px;font-size:1.3rem;">Réinitialisation du mot de passe</h2>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 8px;">Bonjour %s,</p>
                  <p style="color:#94a3b8;line-height:1.6;margin:0 0 28px;">
                    Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
                  </p>
                  <a href="%s"
                     style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#22d3ee);color:white;
                            padding:14px 32px;border-radius:999px;text-decoration:none;
                            font-weight:700;font-size:0.95rem;letter-spacing:0.3px;">
                    🔑 Réinitialiser mon mot de passe
                  </a>
                  <p style="color:#475569;font-size:0.78rem;margin:28px 0 0;line-height:1.5;">
                    Ce lien expire dans <strong style="color:#a855f7;">1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe reste inchangé.
                  </p>
                </div>
              </div>
            </body>
            </html>
            """.formatted(name, resetUrl);
    }
}
