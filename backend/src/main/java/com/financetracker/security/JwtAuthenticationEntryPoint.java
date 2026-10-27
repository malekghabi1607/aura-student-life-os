package com.financetracker.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.authentication.Http403ForbiddenEntryPoint;

import java.io.IOException;

/**
 * A request that presented a Bearer token rejected by {@link JwtFilter} (expired, bad signature,
 * revoked version, disabled or unknown account) gets a generic 401. Requests without a token
 * keep the previous behaviour (403). The reason is never disclosed to the client.
 */
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final AuthenticationEntryPoint anonymous = new Http403ForbiddenEntryPoint();

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException, ServletException {
        if (request.getAttribute(JwtFilter.REJECTED_TOKEN_ATTRIBUTE) == null) {
            anonymous.commence(request, response, exception);
            return;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setHeader("WWW-Authenticate", "Bearer error=\"invalid_token\"");
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":401,\"message\":\"Invalid or expired token\"}");
    }
}
