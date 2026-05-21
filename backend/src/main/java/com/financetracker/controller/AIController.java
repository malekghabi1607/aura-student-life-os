package com.financetracker.controller;

import com.financetracker.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@SuppressWarnings("null")


public class AIController {

    private final AIService aiService;

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> messages = (List<Map<String, String>>) body.get("messages");
        String systemPrompt = (String) body.getOrDefault("system", "Tu es un assistant IA. Réponds en français.");

        String reply = aiService.chat(messages, systemPrompt);
        return ResponseEntity.ok(Map.of("content", reply));
    }
}
