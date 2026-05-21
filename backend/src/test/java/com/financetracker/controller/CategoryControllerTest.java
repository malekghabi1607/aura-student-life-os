package com.financetracker.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.dto.CategoryRequest;
import com.financetracker.dto.CategoryResponse;
import com.financetracker.exception.BadRequestException;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.service.CategoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CategoryController.class)
@Import(com.financetracker.exception.GlobalExceptionHandler.class)
@SuppressWarnings("null")
class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CategoryService categoryService;

    private CategoryResponse response;
    private CategoryRequest validRequest;

    @BeforeEach
    void setUp() {
        response = new CategoryResponse();
        response.setId(1L);
        response.setName("Salaire");
        response.setColor("#10b981");
        response.setIcon("briefcase");
        response.setDescription("Revenus salariaux");
        response.setTransactionCount(3);

        validRequest = new CategoryRequest();
        validRequest.setName("Alimentation");
        validRequest.setColor("#f59e0b");
        validRequest.setIcon("shopping-cart");
    }

    @Test
    void getAll_returns200WithCategoryList() throws Exception {
        when(categoryService.findAll()).thenReturn(List.of(response));

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Salaire"))
                .andExpect(jsonPath("$[0].color").value("#10b981"))
                .andExpect(jsonPath("$[0].transactionCount").value(3));
    }

    @Test
    void getAll_returnsEmptyList_whenNoCategories() throws Exception {
        when(categoryService.findAll()).thenReturn(List.of());

        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getById_returns200_whenExists() throws Exception {
        when(categoryService.findById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/categories/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.icon").value("briefcase"));
    }

    @Test
    void getById_returns404_whenNotFound() throws Exception {
        when(categoryService.findById(99L))
                .thenThrow(new ResourceNotFoundException("Category not found with id: 99"));

        mockMvc.perform(get("/api/categories/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Category not found with id: 99"));
    }

    @Test
    void create_returns201_withValidRequest() throws Exception {
        when(categoryService.create(any())).thenReturn(response);

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Salaire"));
    }

    @Test
    void create_returns400_whenNameIsBlank() throws Exception {
        validRequest.setName("");

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenNameTooShort() throws Exception {
        validRequest.setName("A"); // moins de 2 caractères

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenNameAlreadyExists() throws Exception {
        validRequest.setName("Salaire");
        when(categoryService.create(any()))
                .thenThrow(new BadRequestException("Category 'Salaire' already exists"));

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Category 'Salaire' already exists"));
    }

    @Test
    void update_returns200_whenExists() throws Exception {
        when(categoryService.update(eq(1L), any())).thenReturn(response);

        mockMvc.perform(put("/api/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void update_returns404_whenNotFound() throws Exception {
        when(categoryService.update(eq(99L), any()))
                .thenThrow(new ResourceNotFoundException("Category not found with id: 99"));

        mockMvc.perform(put("/api/categories/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_returns204_whenExists() throws Exception {
        doNothing().when(categoryService).delete(1L);

        mockMvc.perform(delete("/api/categories/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_returns400_whenCategoryHasTransactions() throws Exception {
        doThrow(new BadRequestException("Cannot delete category with existing transactions. Reassign or delete them first."))
                .when(categoryService).delete(1L);

        mockMvc.perform(delete("/api/categories/1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Cannot delete category with existing transactions. Reassign or delete them first."));
    }

    @Test
    void delete_returns404_whenNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Category not found with id: 99"))
                .when(categoryService).delete(99L);

        mockMvc.perform(delete("/api/categories/99"))
                .andExpect(status().isNotFound());
    }
}
