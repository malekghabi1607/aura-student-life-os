package com.financetracker.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.financetracker.dto.TransactionRequest;
import com.financetracker.dto.TransactionResponse;
import com.financetracker.enums.TransactionType;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TransactionController.class)
@Import(com.financetracker.exception.GlobalExceptionHandler.class)
@SuppressWarnings("null")
class TransactionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private TransactionService transactionService;

    private TransactionResponse response;
    private TransactionRequest validRequest;

    @BeforeEach
    void setUp() {
        response = new TransactionResponse();
        response.setId(1L);
        response.setDescription("Salaire Mai");
        response.setAmount(new BigDecimal("45000.00"));
        response.setType(TransactionType.INCOME);
        response.setDate(LocalDate.of(2026, 5, 1));
        response.setCategoryId(1L);
        response.setCategoryName("Salaire");

        validRequest = new TransactionRequest();
        validRequest.setDescription("Salaire");
        validRequest.setAmount(new BigDecimal("45000.00"));
        validRequest.setType(TransactionType.INCOME);
        validRequest.setDate(LocalDate.of(2026, 5, 1));
    }

    @Test
    void getAll_returns200WithTransactionList() throws Exception {
        when(transactionService.findAll()).thenReturn(List.of(response));

        mockMvc.perform(get("/api/transactions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].description").value("Salaire Mai"))
                .andExpect(jsonPath("$[0].type").value("INCOME"))
                .andExpect(jsonPath("$[0].categoryName").value("Salaire"));
    }

    @Test
    void getAll_filterByType_delegatesToService() throws Exception {
        when(transactionService.findByType(TransactionType.EXPENSE)).thenReturn(List.of());

        mockMvc.perform(get("/api/transactions").param("type", "EXPENSE"))
                .andExpect(status().isOk());

        verify(transactionService).findByType(TransactionType.EXPENSE);
    }

    @Test
    void getAll_filterByDateRange_delegatesToService() throws Exception {
        when(transactionService.findByDateRange(any(), any())).thenReturn(List.of(response));

        mockMvc.perform(get("/api/transactions")
                        .param("startDate", "2026-05-01")
                        .param("endDate", "2026-05-31"))
                .andExpect(status().isOk());

        verify(transactionService).findByDateRange(
                LocalDate.of(2026, 5, 1),
                LocalDate.of(2026, 5, 31)
        );
    }

    @Test
    void getById_returns200_whenExists() throws Exception {
        when(transactionService.findById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/transactions/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.amount").value(45000.0));
    }

    @Test
    void getById_returns404_whenNotFound() throws Exception {
        when(transactionService.findById(99L))
                .thenThrow(new ResourceNotFoundException("Transaction not found with id: 99"));

        mockMvc.perform(get("/api/transactions/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Transaction not found with id: 99"));
    }

    @Test
    void create_returns201_withValidRequest() throws Exception {
        when(transactionService.create(any())).thenReturn(response);

        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value("Salaire Mai"));
    }

    @Test
    void create_returns400_whenDescriptionBlank() throws Exception {
        validRequest.setDescription("");

        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenAmountIsZero() throws Exception {
        validRequest.setAmount(BigDecimal.ZERO);

        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenAmountIsNegative() throws Exception {
        validRequest.setAmount(new BigDecimal("-100.00"));

        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenTypeIsMissing() throws Exception {
        validRequest.setType(null);

        mockMvc.perform(post("/api/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void update_returns200_whenExists() throws Exception {
        when(transactionService.update(eq(1L), any())).thenReturn(response);

        mockMvc.perform(put("/api/transactions/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void update_returns404_whenNotFound() throws Exception {
        when(transactionService.update(eq(99L), any()))
                .thenThrow(new ResourceNotFoundException("Transaction not found with id: 99"));

        mockMvc.perform(put("/api/transactions/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_returns204_whenExists() throws Exception {
        doNothing().when(transactionService).delete(1L);

        mockMvc.perform(delete("/api/transactions/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_returns404_whenNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Transaction not found with id: 99"))
                .when(transactionService).delete(99L);

        mockMvc.perform(delete("/api/transactions/99"))
                .andExpect(status().isNotFound());
    }
}
