package com.financetracker.service;

import com.financetracker.entity.User;
import com.financetracker.exception.BadRequestException;
import com.financetracker.exception.VerificationTokenExpiredException;
import com.financetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé: " + email));
    }

    public record RegistrationResult(String email, boolean emailSent) {}

    public RegistrationResult register(String name, String email, String rawPassword) {
        email = email.trim();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Un compte existe déjà avec cet email");
        }
        String token = UUID.randomUUID().toString();
        User user = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .verificationToken(token)
                .enabled(false)
                .build();
        user.setVerificationTokenExpiry(Instant.now().plus(24, ChronoUnit.HOURS));
        // Repository commits precede SMTP: provider failure cannot roll back the account.
        userRepository.saveAndFlush(user);
        boolean sent = emailService.sendVerificationEmail(email, name, token);
        return new RegistrationResult(user.getEmail(), sent);
    }

    @Transactional
    public void verify(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new BadRequestException("Lien de vérification invalide ou déjà utilisé"));
        if (user.getVerificationTokenExpiry() == null || !user.getVerificationTokenExpiry().isAfter(Instant.now()))
            throw new VerificationTokenExpiredException();
        user.setEnabled(true);
        user.setVerificationToken(null);
        user.setVerificationTokenExpiry(null);
        userRepository.save(user);
    }

    @Transactional
    public void resendVerification(String email) {
        userRepository.findByEmailForUpdate(email.trim()).filter(user -> !user.isEnabled() && user.getVerificationToken() != null)
                .ifPresent(user -> {
                    Instant now = Instant.now();
                    // One email per minute/account. Generic HTTP response also covers unknown accounts.
                    if (user.getVerificationTokenExpiry() != null
                            && user.getVerificationTokenExpiry().isAfter(now.plus(24, ChronoUnit.HOURS).minusSeconds(60))) return;
                    String token = UUID.randomUUID().toString();
                    user.setVerificationToken(token);
                    user.setVerificationTokenExpiry(now.plus(24, ChronoUnit.HOURS));
                    userRepository.saveAndFlush(user);
                    emailService.sendVerificationEmail(user.getEmail(), user.getName(), token);
                });
    }

    public boolean matchesPassword(String email, String rawPassword) {
        return userRepository.findByEmail(email).map(user -> passwordEncoder.matches(rawPassword, user.getPassword())).orElse(false);
    }

    @Transactional
    public void logout(Long userId) {
        User user = userRepository.findByIdForUpdate(userId).orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
        user.revokeTokens();
        userRepository.save(user);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
    }

    @Transactional
    public void initPasswordReset(String email) {
        userRepository.findByEmailForUpdate(email.trim()).ifPresent(user -> {
            if (user.getResetTokenExpiry() != null
                    && user.getResetTokenExpiry().isAfter(LocalDateTime.now().plusHours(1).minusSeconds(60))) return;
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);
            emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), token);
        });
        // Always silent when email not found to avoid user enumeration
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new BadRequestException("Lien de réinitialisation invalide ou déjà utilisé"));
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now()))
            throw new BadRequestException("Lien de réinitialisation expiré. Refaites la demande.");
        user.setPassword(passwordEncoder.encode(newPassword));
        user.revokeTokens();   // JWTs issued before the reset stop working
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }
}
