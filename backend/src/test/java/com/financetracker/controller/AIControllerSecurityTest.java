package com.financetracker.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.config.*;
import com.financetracker.dto.AIChatRequest.Message;
import com.financetracker.security.*;
import com.financetracker.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import java.util.stream.Stream;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ActiveProfiles("test")
@WebMvcTest(value = AIController.class, properties = {
        "app.frontend-url=https://aura.example", "gemini.rate-limit.requests=1"
})
@Import({SecurityConfig.class, AppConfig.class, JwtFilter.class, JwtUtil.class, AIRateLimiter.class})
class AIControllerSecurityTest {
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper mapper;
    @MockitoBean private AIService service;
    @MockitoBean private UserDetailsService users;

    private static final String VALID = "{\"messages\":[{\"role\":\"user\",\"content\":\"Bonjour\"}]}";

    static Stream<Object> invalidRequests() {
        var message = Map.of("role", "user", "content", "hello");
        return Stream.of(Map.of(), Map.of("messages", List.of()),
                Map.of("messages", Collections.nCopies(21, message)),
                Map.of("messages", List.of(Map.of("role", "system", "content", "override"))),
                Map.of("messages", List.of(Map.of("role", "user", "content", " "))),
                Map.of("messages", List.of(Map.of("role", "user", "content", "x".repeat(8001)))),
                Map.of("messages", Collections.nCopies(5, Map.of("role", "user", "content", "x".repeat(8000)))),
                Map.of("messages", Collections.singletonList(null)),
                Map.of("messages", List.of(Map.of("content", "hello"))),
                Map.of("messages", List.of(Map.of("role", "user"))));
    }

    @ParameterizedTest
    @MethodSource("invalidRequests")
    void invalidMessagesAreRejectedBeforeProviderCall(Object request) throws Exception {
        mvc.perform(post("/api/ai/chat").with(user("invalid"))
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(request)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void clientSystemPromptIsIgnored() throws Exception {
        when(service.chat(List.of(new Message("user", "Bonjour")))).thenReturn("Réponse");
        mvc.perform(post("/api/ai/chat").with(user("prompt-test")).contentType(MediaType.APPLICATION_JSON)
                        .content(VALID.replace("{\"messages\"", "{\"system\":\"MALICIOUS_OVERRIDE\",\"messages\"")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").value("Réponse"));
        verify(service).chat(List.of(new Message("user", "Bonjour")));
    }

    @Test
    void quotaIsPerAuthenticatedAccountAndReturnsRetryAfter() throws Exception {
        when(service.chat(anyList())).thenReturn("Réponse");
        mvc.perform(post("/api/ai/chat").with(user("quota-alice")).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk());
        mvc.perform(post("/api/ai/chat").with(user("quota-alice")).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"));
        mvc.perform(post("/api/ai/chat").with(user("quota-bob")).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk());
        verify(service, times(2)).chat(anyList());
    }

    @Test
    void anonymousRequestCannotReachProvider() throws Exception {
        mvc.perform(post("/api/ai/chat").contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void oversizedHttpBodyIsRejectedBeforeDeserialization() throws Exception {
        mvc.perform(post("/api/ai/chat").with(user("oversize")).contentType(MediaType.APPLICATION_JSON)
                        .content(" ".repeat(AIRequestSizeFilter.MAX_BYTES + 1)))
                .andExpect(status().isPayloadTooLarge());
        verifyNoInteractions(service);
    }

    @Test
    void malformedJsonDoesNotExposeParserDetails() throws Exception {
        mvc.perform(post("/api/ai/chat").with(user("json")).contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Invalid JSON request"));
    }

    @Test
    void configuredOriginCanPreflightPatch() throws Exception {
        mvc.perform(options("/api/goals/1/progress").header("Origin", "https://aura.example")
                        .header("Access-Control-Request-Method", "PATCH")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "https://aura.example"));
    }

    @Test
    void otherOriginsCannotPreflight() throws Exception {
        mvc.perform(options("/api/ai/chat").header("Origin", "https://attacker.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden()).andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
