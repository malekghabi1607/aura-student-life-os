package com.financetracker.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.entity.User;
import com.financetracker.repository.UserRepository;
import com.financetracker.service.EmailService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Revocation of JWTs (AUDIT_COMPLET.md AUTH-1, AUTH-2) on a disposable H2 database.
// Tokens are crafted with a test-only key so expired, unversioned or mis-versioned tokens
// can be produced independently of JwtUtil; valid tokens come from the real login endpoint.
@SpringBootTest(properties = {"jwt.secret=" + JwtRevocationTest.TEST_SECRET,
        "logging.level.org.springframework.web=WARN", "logging.level.org.springframework.security=WARN"})
@AutoConfigureMockMvc(print = org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint.NONE)
@ActiveProfiles("test")
@Transactional
class JwtRevocationTest {
    static final String TEST_SECRET = "test-only-signing-key-not-a-real-secret-0123456789";
    private static final String PASSWORD = "Initial-Pass-123";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));

    @Autowired private MockMvc mvc;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder passwords;
    @Autowired private ObjectMapper mapper;
    @MockitoBean private EmailService email;

    private User alice;
    private User bob;

    @BeforeEach
    void accounts() {
        alice = users.saveAndFlush(User.builder().email("alice@jwt.invalid").name("Alice")
                .password(passwords.encode(PASSWORD)).enabled(true).build());
        bob = users.saveAndFlush(User.builder().email("bob@jwt.invalid").name("Bob")
                .password(passwords.encode(PASSWORD)).enabled(true).build());
    }

    private String login(String address, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("email", address, "password", password))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return mapper.readTree(body).path("token").asText();
    }

    private static String craft(String subject, Integer version, long expiresInMillis) {
        var builder = Jwts.builder().subject(subject).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiresInMillis));
        if (version != null) builder.claim("ver", version);
        return builder.signWith(KEY).compact();
    }

    private ResultActions call(String token) throws Exception {
        return mvc.perform(get("/api/categories").header("Authorization", "Bearer " + token));
    }

    private static void assertGenericUnauthorized(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer error=\"invalid_token\""))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    private void resetPassword(User user, String newPassword) throws Exception {
        user.setResetToken("reset-" + user.getEmail());
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(10));
        users.saveAndFlush(user);
        mvc.perform(post("/api/auth/reset-password").contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("token", "reset-" + user.getEmail(), "password", newPassword))))
                .andExpect(status().isOk());
    }

    @Test
    void validTokenFromLoginIsAccepted() throws Exception {
        call(login(alice.getEmail(), PASSWORD)).andExpect(status().isOk());
    }

    @Test
    void loginTokenCarriesTheCurrentVersion() throws Exception {
        String token = login(alice.getEmail(), PASSWORD);
        Object ver = Jwts.parser().verifyWith(KEY).build().parseSignedClaims(token).getPayload().get("ver");
        assertThat(ver).isEqualTo(0);
    }

    @Test
    void expiredTokenIsRejectedWith401() throws Exception {
        assertGenericUnauthorized(call(craft(alice.getEmail(), 0, -60_000)));
    }

    @Test
    void tokenWithWrongVersionIsRejectedWith401() throws Exception {
        assertGenericUnauthorized(call(craft(alice.getEmail(), 7, 600_000)));
    }

    @Test
    void legacyTokenWithoutVersionIsRejectedWith401() throws Exception {
        assertGenericUnauthorized(call(craft(alice.getEmail(), null, 600_000)));
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejectedWith401() throws Exception {
        String forged = Jwts.builder().subject(alice.getEmail()).claim("ver", 0)
                .expiration(new Date(System.currentTimeMillis() + 600_000))
                .signWith(Keys.hmacShaKeyFor("another-key-another-key-another-key-0123".getBytes(StandardCharsets.UTF_8)))
                .compact();
        assertGenericUnauthorized(call(forged));
    }

    @Test
    void tokenOfUnknownAccountIsRejectedWith401() throws Exception {
        assertGenericUnauthorized(call(craft("ghost@jwt.invalid", 0, 600_000)));
    }

    @Test
    void disabledAccountLosesExistingTokens() throws Exception {
        String token = login(alice.getEmail(), PASSWORD);
        call(token).andExpect(status().isOk());
        alice.setEnabled(false);
        users.saveAndFlush(alice);
        assertGenericUnauthorized(call(token));
    }

    @Test
    void disablingAnAccountBumpsItsTokenVersion() {
        int before = alice.getTokenVersion();
        alice.setEnabled(false);
        assertThat(alice.getTokenVersion()).isEqualTo(before + 1);
        alice.setEnabled(false);
        assertThat(alice.getTokenVersion()).isEqualTo(before + 1);
    }

    @Test
    void passwordResetRevokesOldTokensAndNewLoginWorks() throws Exception {
        String oldToken = login(alice.getEmail(), PASSWORD);
        call(oldToken).andExpect(status().isOk());

        resetPassword(alice, "Changed-Pass-456");

        assertGenericUnauthorized(call(oldToken));
        assertThat(users.findByEmail(alice.getEmail()).orElseThrow().getTokenVersion()).isEqualTo(1);
        String newToken = login(alice.getEmail(), "Changed-Pass-456");
        call(newToken).andExpect(status().isOk());
    }

    @Test
    void revokingOneAccountDoesNotAffectOthers() throws Exception {
        String aliceToken = login(alice.getEmail(), PASSWORD);
        String bobToken = login(bob.getEmail(), PASSWORD);

        resetPassword(alice, "Changed-Pass-456");
        alice = users.findByEmail(alice.getEmail()).orElseThrow();
        alice.setEnabled(false);
        users.saveAndFlush(alice);

        assertGenericUnauthorized(call(aliceToken));
        call(bobToken).andExpect(status().isOk());
        assertThat(users.findByEmail(bob.getEmail()).orElseThrow().getTokenVersion()).isZero();
    }

    @Test
    void anonymousRequestKeepsItsPreviousStatus() throws Exception {
        mvc.perform(get("/api/categories")).andExpect(status().isForbidden());
    }

    @Test
    void publicAuthEndpointStillWorksWithARevokedTokenInTheHeader() throws Exception {
        String stale = craft(alice.getEmail(), 99, 600_000);
        mvc.perform(post("/api/auth/login").header("Authorization", "Bearer " + stale)
                        .contentType("application/json")
                        .content(mapper.writeValueAsString(Map.of("email", alice.getEmail(), "password", PASSWORD))))
                .andExpect(status().isOk());
    }
}
