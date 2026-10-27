package com.financetracker.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AIRateLimiterTest {
    @Test
    void isolatesUsersAndResetsExpiredWindows() {
        Clock clock = mock(Clock.class);
        when(clock.millis()).thenReturn(0L);
        var limiter = new AIRateLimiter(1, 60, clock);
        limiter.acquire("alice");
        assertThatThrownBy(() -> limiter.acquire("alice")).isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getHeaders().getFirst("Retry-After")).isEqualTo("60"));
        assertThatCode(() -> limiter.acquire("bob")).doesNotThrowAnyException();
        when(clock.millis()).thenReturn(60000L);
        assertThatCode(() -> limiter.acquire("alice")).doesNotThrowAnyException();
    }

    @Test
    void concurrentRequestsCannotBypassQuota() throws Exception {
        var limiter = new AIRateLimiter(3, 60);
        var pool = Executors.newFixedThreadPool(8);
        var accepted = new AtomicInteger();
        try {
            var tasks = java.util.stream.IntStream.range(0, 30).<Callable<Void>>mapToObj(i -> () -> {
                try { limiter.acquire("alice"); accepted.incrementAndGet(); }
                catch (ResponseStatusException expected) { assertThat(expected.getStatusCode().value()).isEqualTo(429); }
                return null;
            }).toList();
            for (var result : pool.invokeAll(tasks)) result.get();
            assertThat(accepted.get()).isEqualTo(3);
        } finally { pool.shutdownNow(); }
    }
}
