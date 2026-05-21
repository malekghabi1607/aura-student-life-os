package com.financetracker.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger documentation configuration
 * Access at: http://localhost:8080/swagger-ui.html
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI financeTrackerOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Finance Tracker API")
                        .description("Personal Budget Management REST API — manages transactions, categories, and statistics")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Malek")
                                .email("malek@example.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")));
    }
}
