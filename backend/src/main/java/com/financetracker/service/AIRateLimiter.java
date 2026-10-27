package com.financetracker.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

/** Per-account fixed windows, bounded memory, no client-controlled IP identifiers. */
@Component
public class AIRateLimiter {
    private record Window(long start, int count) {}
    private final Map<String, Window> windows = new HashMap<>();
    private final int requests;
    private final long windowMillis;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public AIRateLimiter(@Value("${gemini.rate-limit.requests:10}") int requests,
                         @Value("${gemini.rate-limit.window-seconds:60}") long seconds) {
        this(requests, seconds, Clock.systemUTC());
    }

    AIRateLimiter(int requests, long seconds, Clock clock) {
        if (requests < 1 || seconds < 1 || seconds > 86400) {
            throw new IllegalArgumentException("Invalid AI rate limit configuration");
        }
        this.requests = requests;
        this.windowMillis = seconds * 1000;
        this.clock = clock;
    }

    public synchronized void acquire(String user) {
        long now = clock.millis();
        windows.entrySet().removeIf(entry -> now - entry.getValue().start() >= windowMillis);
        Window window = windows.get(user);
        if (window == null && windows.size() >= 10000) throw limited(windowMillis);
        if (window != null && window.count() >= requests) {
            throw limited(windowMillis - (now - window.start()));
        }
        windows.put(user, window == null ? new Window(now, 1) : new Window(window.start(), window.count() + 1));
    }

    private ResponseStatusException limited(long remaining) {
        var headers = new org.springframework.http.HttpHeaders();
        headers.set("Retry-After", Long.toString(Math.max(1, (remaining + 999) / 1000)));
        return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Limite de requêtes IA atteinte. Réessayez plus tard.") {
            @Override public org.springframework.http.HttpHeaders getHeaders() { return headers; }
        };
    }
}
