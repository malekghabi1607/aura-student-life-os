package com.financetracker.service;

import com.financetracker.dto.AIChatRequest.Message;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class AIServiceTest {
    private final AIService service = new AIService("test-key-not-real", "test-model");
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(service.restTemplate()).build();
    private final List<Message> messages = List.of(new Message("user", "Bonjour"), new Message("assistant", "Salut"));

    @Test
    void sendsKeyOnlyInHeaderAndUsesBackendPrompt() {
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent"))
                .andExpect(header("x-goog-api-key", "test-key-not-real"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.systemInstruction.parts[0].text").value(AIService.SYSTEM_PROMPT))
                .andExpect(jsonPath("$.contents[1].role").value("model"))
                .andRespond(withSuccess("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"Réponse\"}]}}]}", MediaType.APPLICATION_JSON));
        assertThat(service.chat(messages)).isEqualTo("Réponse");
        server.verify();
    }

    @Test
    void upstreamErrorDoesNotExposeBodyOrCredentials() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.BAD_REQUEST)
                .body("test-key-not-real private-prompt upstream-detail"));
        assertThatThrownBy(() -> service.chat(messages)).isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("502").hasMessageNotContaining("test-key")
                .hasMessageNotContaining("private-prompt").hasMessageNotContaining("upstream-detail");
    }

    @Test
    void upstreamQuotaIsReturnedAs429() {
        server.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        assertThatThrownBy(() -> service.chat(messages)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("429");
    }

    @Test
    void emptyOrBlockedResponseIsHandled() {
        server.expect(anything()).andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> service.chat(messages)).isInstanceOf(ResponseStatusException.class).hasMessageContaining("502");
    }

    @Test
    void missingKeyPreservesUnconfiguredAssistantMessage() {
        assertThat(new AIService("", "test-model").chat(messages)).contains("non configuré");
    }
}
