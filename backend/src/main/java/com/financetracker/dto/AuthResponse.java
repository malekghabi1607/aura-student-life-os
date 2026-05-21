package com.financetracker.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String email;
    private String name;

    public AuthResponse(String token, String email, String name) {
        this.token = token;
        this.email = email;
        this.name = name;
    }
}
