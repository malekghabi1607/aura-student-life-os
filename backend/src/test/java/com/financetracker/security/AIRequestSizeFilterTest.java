package com.financetracker.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import static org.assertj.core.api.Assertions.*;

class AIRequestSizeFilterTest {
    @Test
    void unknownLengthBodyCannotBypassLimit() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/ai/chat") {
            @Override public long getContentLengthLong() { return -1; }
            @Override public int getContentLength() { return -1; }
        };
        request.setContent(new byte[AIRequestSizeFilter.MAX_BYTES + 1]);
        var response = new MockHttpServletResponse();
        new AIRequestSizeFilter().doFilter(request, response, (req, res) -> fail("Must reject before controller"));
        assertThat(response.getStatus()).isEqualTo(413);
    }

    @Test
    void validBodyIsPreserved() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/ai/chat");
        request.setContent("{\"messages\":[]}".getBytes(StandardCharsets.UTF_8));
        new AIRequestSizeFilter().doFilter(request, new MockHttpServletResponse(), (req, res) ->
                assertThat(new String(((HttpServletRequest) req).getInputStream().readAllBytes(), StandardCharsets.UTF_8))
                        .isEqualTo("{\"messages\":[]}"));
    }
}
