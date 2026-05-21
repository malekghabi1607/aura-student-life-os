package com.financetracker.service;

import com.financetracker.dto.CategoryRequest;
import com.financetracker.dto.CategoryResponse;
import com.financetracker.entity.Category;
import com.financetracker.entity.Transaction;
import com.financetracker.entity.User;
import com.financetracker.enums.TransactionType;
import com.financetracker.exception.BadRequestException;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.CategoryRepository;
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
class CategoryServiceTest {

    @Mock private CategoryRepository categoryRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private CategoryService categoryService;

    private Category category;
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
                .description("Revenus salariaux").userId(USER_ID)
                .transactions(new ArrayList<>()).build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void findAll_returnsAllCategories() {
        when(categoryRepository.findByUserId(USER_ID)).thenReturn(List.of(category));

        List<CategoryResponse> result = categoryService.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Salaire");
        assertThat(result.get(0).getTransactionCount()).isZero();
    }

    @Test
    void findById_returnsCategory_whenExists() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        CategoryResponse result = categoryService.findById(1L);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getColor()).isEqualTo("#10b981");
    }

    @Test
    void findById_throws_whenNotFound() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.findById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void create_savesAndReturnsCategory() {
        Category saved = Category.builder()
                .id(2L).name("Alimentation").color("#f59e0b").icon("shopping-cart")
                .userId(USER_ID).transactions(new ArrayList<>()).build();

        CategoryRequest request = new CategoryRequest();
        request.setName("Alimentation");
        request.setColor("#f59e0b");
        request.setIcon("shopping-cart");

        when(categoryRepository.existsByNameIgnoreCaseAndUserId("Alimentation", USER_ID)).thenReturn(false);
        when(categoryRepository.save(any())).thenReturn(saved);

        CategoryResponse result = categoryService.create(request);

        assertThat(result.getId()).isEqualTo(2L);
        assertThat(result.getName()).isEqualTo("Alimentation");
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    void create_throws_whenNameAlreadyExists() {
        CategoryRequest request = new CategoryRequest();
        request.setName("Salaire");

        when(categoryRepository.existsByNameIgnoreCaseAndUserId("Salaire", USER_ID)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.create(request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void update_updatesCategory_whenNameFree() {
        Category updated = Category.builder()
                .id(1L).name("Salaire Net").color("#10b981").icon("briefcase")
                .userId(USER_ID).transactions(new ArrayList<>()).build();

        CategoryRequest request = new CategoryRequest();
        request.setName("Salaire Net");
        request.setColor("#10b981");
        request.setIcon("briefcase");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.findByNameIgnoreCaseAndUserId("Salaire Net", USER_ID)).thenReturn(Optional.empty());
        when(categoryRepository.save(any())).thenReturn(updated);

        CategoryResponse result = categoryService.update(1L, request);

        assertThat(result.getName()).isEqualTo("Salaire Net");
    }

    @Test
    void update_succeeds_whenKeepingSameName() {
        CategoryRequest request = new CategoryRequest();
        request.setName("Salaire");
        request.setColor("#aabbcc");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.findByNameIgnoreCaseAndUserId("Salaire", USER_ID)).thenReturn(Optional.of(category));
        when(categoryRepository.save(any())).thenReturn(category);

        assertThatCode(() -> categoryService.update(1L, request)).doesNotThrowAnyException();
    }

    @Test
    void update_throws_whenNameTakenByAnotherCategory() {
        Category other = Category.builder()
                .id(2L).name("Freelance").userId(USER_ID).transactions(new ArrayList<>()).build();

        CategoryRequest request = new CategoryRequest();
        request.setName("Freelance");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.findByNameIgnoreCaseAndUserId("Freelance", USER_ID)).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> categoryService.update(1L, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void update_throws_whenCategoryNotFound() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.update(99L, new CategoryRequest()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_deletesCategory_whenNoTransactions() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        categoryService.delete(1L);

        verify(categoryRepository).delete(category);
    }

    @Test
    void delete_throws_whenCategoryHasTransactions() {
        Transaction tx = Transaction.builder()
                .id(1L).description("Salaire").amount(new BigDecimal("45000"))
                .type(TransactionType.INCOME).date(LocalDate.now()).userId(USER_ID).build();
        category.getTransactions().add(tx);

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        assertThatThrownBy(() -> categoryService.delete(1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cannot delete category with existing transactions");
    }

    @Test
    void delete_throws_whenNotFound() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
