package com.financetracker.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

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

    public void sendVerificationEmail(String to, String name, String token) {
        String verifyUrl = backendUrl + "/api/auth/verify?token=" + token;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Activez votre compte Aura");
            helper.setText(buildVerificationHtml(name, verifyUrl), true);
            mailSender.send(message);
            log.info("Verification email sent to {}", to);
        } catch (Exception e) {
            log.warn("Email non envoyé (configurez RESEND_API_KEY). Lien de vérification : {}", verifyUrl);
        }
    }

    public void sendPasswordResetEmail(String to, String name, String token) {
        String resetUrl = frontendUrl + "/reset-password?token=" + token;
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("Réinitialisation de votre mot de passe Aura");
            helper.setText(buildResetHtml(name, resetUrl), true);
            mailSender.send(message);
            log.info("Password reset email sent to {}", to);
        } catch (Exception e) {
            log.warn("Email non envoyé. Lien de réinitialisation : {}", resetUrl);
        }
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
