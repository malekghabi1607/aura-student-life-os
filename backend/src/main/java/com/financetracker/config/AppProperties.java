package com.financetracker.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String frontendUrl = "http://localhost:5173";
    private String backendUrl = "http://localhost:8080";
    private Mail mail = new Mail();

    public static class Mail {
        private String from = "onboarding@resend.dev";
        public String getFrom() { return from; }
        public void setFrom(String from) { this.from = from; }
    }

    public String getFrontendUrl() { return frontendUrl; }
    public void setFrontendUrl(String frontendUrl) { this.frontendUrl = frontendUrl; }
    public String getBackendUrl() { return backendUrl; }
    public void setBackendUrl(String backendUrl) { this.backendUrl = backendUrl; }
    public Mail getMail() { return mail; }
    public void setMail(Mail mail) { this.mail = mail; }
}
