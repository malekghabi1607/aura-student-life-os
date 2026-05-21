package com.financetracker.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO for Category create/update requests
 */
@Data
public class CategoryRequest {

    @NotBlank(message = "Category name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @Size(max = 7, message = "Color must be a valid hex color (e.g. #FF6384)")
    private String color;

    private String icon;

    @Size(max = 500)
    private String description;
}
