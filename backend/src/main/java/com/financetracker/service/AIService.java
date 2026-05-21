package com.financetracker.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@Slf4j
public class AIService {

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.0-flash}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();

    public String chat(List<Map<String, String>> messages, String systemPrompt) {
        if (apiKey == null || apiKey.isBlank() || "changeme".equals(apiKey)) {
            return "⚠️ Assistant IA non configuré. Ajoutez votre clé GEMINI_API_KEY dans le fichier .env du backend pour activer l'IA.";
        }

        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model
                + ":generateContent?key=" + apiKey;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Build Gemini request format
        List<Map<String, Object>> contents = new ArrayList<>();

        // System instruction as first user message context
        for (Map<String, String> msg : messages) {
            Map<String, Object> content = new HashMap<>();
            content.put("role", "user".equals(msg.get("role")) ? "user" : "model");
            content.put("parts", List.of(Map.of("text", msg.get("content"))));
            contents.add(content);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("contents", contents);
        body.put("systemInstruction", Map.of(
                "parts", List.of(Map.of("text", systemPrompt))
        ));
        body.put("generationConfig", Map.of(
                "maxOutputTokens", 2048,
                "temperature", 0.7
        ));

        try {
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(url, request, Map.class);
            if (response == null) throw new RuntimeException("Réponse vide de Gemini");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            return (String) parts.get(0).get("text");

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String errBody = e.getResponseBodyAsString();
            log.error("Gemini HTTP error {}: {}", e.getStatusCode(), errBody);
            if (e.getStatusCode().value() == 429) {
                throw new RuntimeException("Limite de requêtes Gemini atteinte. Réessaie dans quelques secondes.");
            }
            throw new RuntimeException("Erreur Gemini : " + e.getStatusCode());
        } catch (Exception e) {
            log.error("Gemini error: {}", e.getMessage());
            throw new RuntimeException("Erreur lors de la communication avec l'IA : " + e.getMessage());
        }
    }
}
