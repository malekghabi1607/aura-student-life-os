package com.financetracker.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import com.financetracker.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Autowired
    private Environment environment;
    private SecretKey signingKey;

    @PostConstruct
    void initialize() {
        if (environment.acceptsProfiles(Profiles.of("prod"))
                && environment.acceptsProfiles(Profiles.of("dev | test"))) {
            throw new IllegalStateException("The prod profile cannot be combined with dev or test");
        }
        if (secret == null || secret.isBlank()) {
            if (environment.acceptsProfiles(Profiles.of("(dev | test) & !prod"))) {
                signingKey = Jwts.SIG.HS256.key().build();
                return;
            }
            throw new IllegalStateException("JWT_SECRET is required outside dev/test");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Value("${jwt.expiration:86400000}")
    private long expiration;

    public static final String VERSION_CLAIM = "ver";

    public String generateToken(User user) {
        return Jwts.builder()
                .subject(user.getEmail())
                .claim(VERSION_CLAIM, user.getTokenVersion())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getKey())
                .compact();
    }

    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    // Signature and expiry are enforced by the parser (it throws). A token without "ver"
    // (issued before token versioning) is rejected: its holder must log in again.
    public boolean isValid(String token, User user) {
        Claims claims = getClaims(token);
        Object version = claims.get(VERSION_CLAIM);
        return user.getEmail().equals(claims.getSubject())
                && !claims.getExpiration().before(new Date())
                && version instanceof Number number && number.longValue() == user.getTokenVersion()
                && user.isEnabled() && user.isAccountNonLocked()
                && user.isAccountNonExpired() && user.isCredentialsNonExpired();
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getKey() {
        return signingKey;
    }
}
