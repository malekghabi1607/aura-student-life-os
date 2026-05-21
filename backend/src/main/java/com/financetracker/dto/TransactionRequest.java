package com.financetracker.dto;

import com.financetracker.enums.TransactionType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for Transaction create/update requests
 */
@Data
public class TransactionRequest {

    @NotBlank(message = "Description is required")
    @Size(min = 2, max = 200, message = "Description must be between 2 and 200 characters")
    private String description;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @Digits(integer = 13, fraction = 2, message = "Invalid amount format")
    private BigDecimal amount;

    @NotNull(message = "Transaction type is required")
    private TransactionType type;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @Size(max = 500, message = "Notes too long")
    private String notes;

    private Long categoryId;
}
