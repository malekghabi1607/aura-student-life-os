package com.financetracker.controller;

import com.financetracker.dto.AuthResponse;
import com.financetracker.dto.ForgotPasswordRequest;
import com.financetracker.dto.LoginRequest;
import com.financetracker.dto.RegisterRequest;
import com.financetracker.dto.ResetPasswordRequest;
import com.financetracker.entity.User;
import com.financetracker.exception.BadRequestException;
import com.financetracker.exception.VerificationTokenExpiredException;
import com.financetracker.security.JwtUtil;
import com.financetracker.service.EmailService;
import com.financetracker.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register and login endpoints")
@SuppressWarnings("null")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    // Same answer for every address (no account enumeration) when no e-mail can be sent at all.
    private static final Map<String, String> EMAIL_SERVICE_UNAVAILABLE = Map.of("code", "EMAIL_SERVICE_UNAVAILABLE",
            "message", "L'envoi d'e-mails n'est pas configuré sur ce serveur. Réessayez plus tard ou contactez l'administrateur.");

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @PostMapping("/register")
    @Operation(summary = "Create a new account — sends a verification email")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        var result = userService.register(request.getName(), request.getEmail(), request.getPassword());
        if (result.emailSent()) {
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("email", result.email(), "emailSent", true,
                    "message", "Compte créé. Consultez votre e-mail pour activer votre compte."));
        }
        boolean disabled = emailService.isDeliveryDisabled();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("email", result.email(), "emailSent", false,
                "code", disabled ? "EMAIL_SERVICE_UNAVAILABLE" : "EMAIL_DELIVERY_FAILED",
                "message", disabled
                        ? "Compte créé, mais l'envoi d'e-mails n'est pas configuré sur ce serveur. "
                          + "Vous pourrez renvoyer le lien de confirmation dès que le service sera rétabli."
                        : "Compte créé, mais l'e-mail n'a pas pu être envoyé. Réessayez le renvoi dans une minute."));
    }

    @GetMapping("/verify")
    @Operation(summary = "Verify email via token link")
    public ResponseEntity<Void> verify(@RequestParam(defaultValue = "") String token) {
        try {
            userService.verify(token);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(frontendUrl.replaceAll("/+$", "") + "/login?verified=true"))
                    .build();
        } catch (BadRequestException e) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(frontendUrl.replaceAll("/+$", "") + "/login?error="
                            + (e instanceof VerificationTokenExpiredException ? "expired-token" : "invalid-token")))
                    .build();
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@Valid @RequestBody ForgotPasswordRequest request) {
        if (emailService.isDeliveryDisabled()) return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(EMAIL_SERVICE_UNAVAILABLE);
        userService.resendVerification(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "Si ce compte attend une validation, un lien pourra vous être envoyé. "
                + "Vérifiez vos spams. Si aucun message n'arrive, réessayez dans une minute ou contactez l'assistance."));
    }

    @PostMapping("/login")
    @Operation(summary = "Login and get a JWT token")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (DisabledException e) {
            // Spring checks disabled status before the password. Do not disclose it to an unauthenticated guess.
            if (!userService.matchesPassword(request.getEmail(), request.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new AuthResponse(null, null, "Email ou mot de passe incorrect"));
            }
            User pending = userService.findByEmail(request.getEmail());
            boolean unverified = pending.getVerificationToken() != null;
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("code", unverified ? "EMAIL_NOT_VERIFIED" : "ACCOUNT_DISABLED",
                            "message", unverified ? "Compte non vérifié. Vérifiez votre email avant de vous connecter."
                                    : "Ce compte est désactivé. Contactez l'assistance."));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse(null, null, "Email ou mot de passe incorrect"));
        }
        User user = userService.findByEmail(request.getEmail());
        String token = jwtUtil.generateToken(user);
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getName()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal User user) {
        userService.logout(user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset email")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        if (emailService.isDeliveryDisabled()) return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(EMAIL_SERVICE_UNAVAILABLE);
        userService.initPasswordReset(request.getEmail());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using a valid token")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        userService.resetPassword(request.getToken(), request.getPassword());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user info")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(new AuthResponse(null, user.getEmail(), user.getName()));
    }
}
