package com.financetracker.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.financetracker.dto.AIChatRequest.Message;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class AIService {
    static final String SYSTEM_PROMPT = """
            Tu es Aura, un assistant IA intelligent intégré dans l'app Aura Student Life OS.
            Tu peux répondre à absolument n'importe quelle question : études, sciences, maths,
            code, sport, culture, langues, actualités, conseils de vie, recettes, voyages,
            finances, philosophie, etc.
            Tu es bienveillant, précis, et tu adaptes ton style selon la question.
            Tu réponds en français sauf si l'utilisateur parle une autre langue.
            Ne te limite à aucun domaine — réponds librement à toute question posée.
            """;
    private final String apiKey;
    private final String model;
    private final RestTemplate restTemplate;

    public AIService(@Value("${gemini.api-key:}") String apiKey,
                     @Value("${gemini.model:gemini-2.0-flash}") String model) {
        this.apiKey = apiKey;
        if (!model.matches("[a-zA-Z0-9._-]+")) throw new IllegalArgumentException("Invalid Gemini model name");
        this.model = model;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(30000);
        this.restTemplate = new RestTemplate(factory);
    }

    RestTemplate restTemplate() { return restTemplate; }

    public String chat(List<Message> messages) {
        if (apiKey == null || apiKey.isBlank() || "changeme".equals(apiKey)) {
            return "Assistant IA non configuré. Configurez GEMINI_API_KEY côté serveur pour activer l'IA.";
        }
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", apiKey);
        List<Map<String, Object>> contents = new ArrayList<>();
        for (Message message : messages) {
            contents.add(Map.of("role", "user".equals(message.role()) ? "user" : "model",
                    "parts", List.of(Map.of("text", message.content()))));
        }
        Map<String, Object> body = Map.of("contents", contents,
                "systemInstruction", Map.of("parts", List.of(Map.of("text", SYSTEM_PROMPT))),
                "generationConfig", Map.of("maxOutputTokens", 2048, "temperature", 0.7));
        try {
            JsonNode response = restTemplate.postForObject(url, new HttpEntity<>(body, headers), JsonNode.class);
            JsonNode text = response == null ? null : response.path("candidates").path(0)
                    .path("content").path("parts").path(0).path("text");
            if (text == null || !text.isTextual() || text.asText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Réponse IA indisponible. Réessayez.");
            }
            return text.asText();
        } catch (HttpStatusCodeException exception) {
            if (exception.getStatusCode().value() == 429) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Limite du fournisseur IA atteinte. Réessayez plus tard.");
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Service IA indisponible. Réessayez.");
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Service IA indisponible. Réessayez.");
        }
    }
}
