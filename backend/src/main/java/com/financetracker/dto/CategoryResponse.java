package com.financetracker.dto;

import com.financetracker.entity.Category;
import lombok.Data;

/**
 * DTO for Category responses
 */
@Data
public class CategoryResponse {
    private Long id;
    private String name;
    private String color;
    private String icon;
    private String description;
    private long transactionCount;

    public static CategoryResponse from(Category category) {
        CategoryResponse dto = new CategoryResponse();
        dto.setId(category.getId());
        dto.setName(category.getName());
        dto.setColor(category.getColor());
        dto.setIcon(category.getIcon());
        dto.setDescription(category.getDescription());
        dto.setTransactionCount(category.getTransactions().size());
        return dto;
    }
}
