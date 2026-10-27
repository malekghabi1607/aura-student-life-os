package com.financetracker.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record AIChatRequest(
        @NotNull @Size(min = 1, max = 20) List<@NotNull @Valid Message> messages) {
    public record Message(
            @NotNull @Pattern(regexp = "user|assistant") String role,
            @NotBlank @Size(max = 8000) String content) {}

    @AssertTrue(message = "Message content must not exceed 32000 characters in total")
    @JsonIgnore
    public boolean isWithinTotalSize() {
        return messages == null || messages.stream().filter(m -> m != null && m.content() != null)
                .mapToLong(m -> m.content().length()).sum() <= 32000;
    }
}
