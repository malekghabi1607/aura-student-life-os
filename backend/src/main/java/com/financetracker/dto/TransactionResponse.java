package com.financetracker.dto;

import com.financetracker.entity.Transaction;
import com.financetracker.enums.TransactionType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for Transaction responses — avoids exposing JPA entities directly
 */
@Data
public class TransactionResponse {

    private Long id;
    private String description;
    private BigDecimal amount;
    private TransactionType type;
    private LocalDate date;
    private String notes;
    private Long categoryId;
    private String categoryName;
    private String categoryColor;
    private String categoryIcon;
    private LocalDateTime createdAt;

    public static TransactionResponse from(Transaction t) {
        TransactionResponse dto = new TransactionResponse();
        dto.setId(t.getId());
        dto.setDescription(t.getDescription());
        dto.setAmount(t.getAmount());
        dto.setType(t.getType());
        dto.setDate(t.getDate());
        dto.setNotes(t.getNotes());
        dto.setCreatedAt(t.getCreatedAt());

        if (t.getCategory() != null) {
            dto.setCategoryId(t.getCategory().getId());
            dto.setCategoryName(t.getCategory().getName());
            dto.setCategoryColor(t.getCategory().getColor());
            dto.setCategoryIcon(t.getCategory().getIcon());
        }
        return dto;
    }
}
