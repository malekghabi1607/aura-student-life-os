package com.financetracker.service;

import com.financetracker.dto.TransactionRequest;
import com.financetracker.dto.TransactionResponse;
import com.financetracker.entity.Category;
import com.financetracker.entity.Transaction;
import com.financetracker.entity.User;
import com.financetracker.enums.TransactionType;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.CategoryRepository;
import com.financetracker.repository.TransactionRepository;
import com.financetracker.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class TransactionServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private TransactionService transactionService;

    private Category category;
    private Transaction transaction;
    private static final Long USER_ID = 1L;
    private static final String USER_EMAIL = "test@test.com";

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(USER_EMAIL, null, List.of()));

        User mockUser = new User();
        mockUser.setId(USER_ID);
        mockUser.setEmail(USER_EMAIL);
        lenient().when(userRepository.findByEmail(USER_EMAIL)).thenReturn(Optional.of(mockUser));

        category = Category.builder()
                .id(1L).name("Salaire").color("#10b981").icon("briefcase")
                .userId(USER_ID).transactions(new ArrayList<>()).build();

        transaction = Transaction.builder()
                .id(1L).description("Salaire Mai").amount(new BigDecimal("45000.00"))
                .type(TransactionType.INCOME).date(LocalDate.of(2026, 5, 1))
                .category(category).userId(USER_ID).build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createAndUpdate_rejectAnotherUsersCategoryInBothDirections() {
        User secondUser = new User();
        secondUser.setId(2L);
        secondUser.setEmail("second@test.com");
        when(userRepository.findByEmail(secondUser.getEmail())).thenReturn(Optional.of(secondUser));

        Category secondCategory = Category.builder().id(2L).userId(2L).name("Private").build();
        List<Category> categories = List.of(category, secondCategory);
        when(categoryRepository.findByIdAndUserId(anyLong(), anyLong())).thenAnswer(invocation ->
                categories.stream().filter(c -> c.getId().equals(invocation.getArgument(0))
                        && c.getUserId().equals(invocation.getArgument(1))).findFirst());

        for (long id = 1; id <= 2; id++) {
            String email = id == 1 ? USER_EMAIL : secondUser.getEmail();
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(email, null, List.of()));
            Transaction owned = Transaction.builder().id(id).userId(id).build();
            when(transactionRepository.findById(id)).thenReturn(Optional.of(owned));
            TransactionRequest request = new TransactionRequest();
            request.setCategoryId(3 - id);

            assertThatThrownBy(() -> transactionService.create(request))
                    .isInstanceOf(ResourceNotFoundException.class);
            long transactionId = id;
            assertThatThrownBy(() -> transactionService.update(transactionId, request))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
        verify(transactionRepository, never()).save(any());
        verify(categoryRepository, never()).findById(any());
    }

    @Test
    void eachUserCanCreateAndUpdateWithTheirOwnCategory() {
        User secondUser = new User();
        secondUser.setId(2L);
        secondUser.setEmail("second@test.com");
        when(userRepository.findByEmail(secondUser.getEmail())).thenReturn(Optional.of(secondUser));
        Category secondCategory = Category.builder().id(2L).userId(2L).name("Private").build();
        when(categoryRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(category));
        when(categoryRepository.findByIdAndUserId(2L, 2L)).thenReturn(Optional.of(secondCategory));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        for (long id = 1; id <= 2; id++) {
            SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                    id == 1 ? USER_EMAIL : secondUser.getEmail(), null, List.of()));
            TransactionRequest request = new TransactionRequest();
            request.setDescription("Own transaction");
            request.setAmount(BigDecimal.TEN);
            request.setDate(LocalDate.now());
            request.setType(TransactionType.EXPENSE);
            request.setCategoryId(id);
            assertThat(transactionService.create(request).getCategoryId()).isEqualTo(id);

            Transaction owned = Transaction.builder().id(id).userId(id).build();
            when(transactionRepository.findById(id)).thenReturn(Optional.of(owned));
            assertThat(transactionService.update(id, request).getCategoryId()).isEqualTo(id);
        }
        verify(transactionRepository, times(4)).save(any(Transaction.class));
    }

    @Test
    void findAll_returnsAllTransactionsMappedToDtos() {
        when(transactionRepository.findByUserIdOrderByDateDesc(USER_ID)).thenReturn(List.of(transaction));

        List<TransactionResponse> result = transactionService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getDescription()).isEqualTo("Salaire Mai");
        assertThat(result.get(0).getAmount()).isEqualByComparingTo("45000.00");
        assertThat(result.get(0).getCategoryName()).isEqualTo("Salaire");
    }

    @Test
    void findById_returnsTransaction_whenExists() {
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(transaction));

        TransactionResponse result = transactionService.findById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getType()).isEqualTo(TransactionType.INCOME);
    }

    @Test
    void findById_throws_whenNotFound() {
        when(transactionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void create_savesAndReturnsTransaction() {
        TransactionRequest request = new TransactionRequest();
        request.setDescription("Salaire");
        request.setAmount(new BigDecimal("45000.00"));
        request.setType(TransactionType.INCOME);
        request.setDate(LocalDate.now());
        request.setCategoryId(1L);

        when(categoryRepository.findByIdAndUserId(1L, USER_ID)).thenReturn(Optional.of(category));
        when(transactionRepository.save(any())).thenReturn(transaction);

        TransactionResponse result = transactionService.create(request);

        assertThat(result.getDescription()).isEqualTo("Salaire Mai");
        verify(transactionRepository).save(any(Transaction.class));
    }

    @Test
    void create_withNullCategory_savesWithoutCategory() {
        Transaction txNoCategory = Transaction.builder()
                .id(2L).description("Divers").amount(new BigDecimal("100.00"))
                .type(TransactionType.EXPENSE).date(LocalDate.now()).userId(USER_ID).build();

        TransactionRequest request = new TransactionRequest();
        request.setDescription("Divers");
        request.setAmount(new BigDecimal("100.00"));
        request.setType(TransactionType.EXPENSE);
        request.setDate(LocalDate.now());

        when(transactionRepository.save(any())).thenReturn(txNoCategory);

        TransactionResponse result = transactionService.create(request);

        assertThat(result.getCategoryId()).isNull();
        verify(categoryRepository, never()).findById(any());
    }

    @Test
    void create_throws_whenCategoryNotFound() {
        TransactionRequest request = new TransactionRequest();
        request.setDescription("Test");
        request.setAmount(new BigDecimal("100.00"));
        request.setType(TransactionType.EXPENSE);
        request.setDate(LocalDate.now());
        request.setCategoryId(99L);

        when(categoryRepository.findByIdAndUserId(99L, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Category not found");
    }

    @Test
    void update_updatesAndReturnsTransaction() {
        Transaction updated = Transaction.builder()
                .id(1L).description("Salaire Modifié").amount(new BigDecimal("50000.00"))
                .type(TransactionType.INCOME).date(LocalDate.now())
                .category(category).userId(USER_ID).build();

        TransactionRequest request = new TransactionRequest();
        request.setDescription("Salaire Modifié");
        request.setAmount(new BigDecimal("50000.00"));
        request.setType(TransactionType.INCOME);
        request.setDate(LocalDate.now());
        request.setCategoryId(1L);

        when(transactionRepository.findById(1L)).thenReturn(Optional.of(transaction));
        when(categoryRepository.findByIdAndUserId(1L, USER_ID)).thenReturn(Optional.of(category));
        when(transactionRepository.save(any())).thenReturn(updated);

        TransactionResponse result = transactionService.update(1L, request);

        assertThat(result.getDescription()).isEqualTo("Salaire Modifié");
        assertThat(result.getAmount()).isEqualByComparingTo("50000.00");
    }

    @Test
    void update_throws_whenTransactionNotFound() {
        when(transactionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.update(99L, new TransactionRequest()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Transaction not found");
    }

    @Test
    void delete_deletesTransaction_whenExists() {
        when(transactionRepository.findById(1L)).thenReturn(Optional.of(transaction));

        transactionService.delete(1L);

        verify(transactionRepository).delete(transaction);
    }

    @Test
    void delete_throws_whenNotFound() {
        when(transactionRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> transactionService.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void findByType_returnsOnlyMatchingTransactions() {
        when(transactionRepository.findByUserIdAndTypeOrderByDateDesc(USER_ID, TransactionType.INCOME))
                .thenReturn(List.of(transaction));

        List<TransactionResponse> result = transactionService.findByType(TransactionType.INCOME);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getType()).isEqualTo(TransactionType.INCOME);
    }

    @Test
    void findByDateRange_returnsTransactionsInRange() {
        LocalDate start = LocalDate.of(2026, 5, 1);
        LocalDate end   = LocalDate.of(2026, 5, 31);

        when(transactionRepository.findByUserIdAndDateBetweenOrderByDateDesc(USER_ID, start, end))
                .thenReturn(List.of(transaction));

        List<TransactionResponse> result = transactionService.findByDateRange(start, end);

        assertThat(result).hasSize(1);
    }

    @Test
    void findByTypeAndDateRange_returnsFilteredTransactions() {
        LocalDate start = LocalDate.of(2026, 5, 1);
        LocalDate end   = LocalDate.of(2026, 5, 31);

        when(transactionRepository.findByUserIdAndTypeAndDateBetweenOrderByDateDesc(USER_ID, TransactionType.INCOME, start, end))
                .thenReturn(List.of(transaction));

        List<TransactionResponse> result = transactionService.findByTypeAndDateRange(TransactionType.INCOME, start, end);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getType()).isEqualTo(TransactionType.INCOME);
    }
}
