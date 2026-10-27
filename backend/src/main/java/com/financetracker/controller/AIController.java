package com.financetracker.controller;

import com.financetracker.dto.AIChatRequest;
import com.financetracker.service.AIService;
import com.financetracker.service.AIRateLimiter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AIController {
    private final AIService aiService;
    private final AIRateLimiter rateLimiter;

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@Valid @RequestBody AIChatRequest request, Principal principal) {
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        rateLimiter.acquire(principal.getName());
        return ResponseEntity.ok(Map.of("content", aiService.chat(request.messages())));
    }
}
