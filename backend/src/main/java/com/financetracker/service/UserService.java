package com.financetracker.service;

import com.financetracker.entity.User;
import com.financetracker.exception.BadRequestException;
import com.financetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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

    public User register(String name, String email, String rawPassword) {
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Un compte existe déjà avec cet email");
        }
        String token = UUID.randomUUID().toString();
        User user = userRepository.save(User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .verificationToken(token)
                .enabled(false)
                .build());
        emailService.sendVerificationEmail(email, name, token);
        return user;
    }

    public void verify(String token) {
        User user = userRepository.findByVerificationToken(token)
                .orElseThrow(() -> new BadRequestException("Lien de vérification invalide ou déjà utilisé"));
        user.setEnabled(true);
        user.setVerificationToken(null);
        userRepository.save(user);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
    }

    public void initPasswordReset(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setResetToken(token);
            user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
            userRepository.save(user);
            emailService.sendPasswordResetEmail(user.getEmail(), user.getName(), token);
        });
        // Always silent when email not found to avoid user enumeration
    }

    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new BadRequestException("Lien de réinitialisation invalide ou déjà utilisé"));
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now()))
            throw new BadRequestException("Lien de réinitialisation expiré. Refaites la demande.");
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }
}
