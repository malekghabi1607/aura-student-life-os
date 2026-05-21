package com.financetracker.service;

import com.financetracker.dto.DashboardStats;
import com.financetracker.entity.User;
import com.financetracker.enums.TransactionType;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StatisticsServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private StatisticsService statisticsService;

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
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getDashboardStats_calculatesBalanceCorrectly() {
        stub(new BigDecimal("100000"), new BigDecimal("60000"),
             new BigDecimal("45000"),  new BigDecimal("25000"));

        DashboardStats stats = statisticsService.getDashboardStats();

        assertThat(stats.getTotalIncome()).isEqualByComparingTo("100000");
        assertThat(stats.getTotalExpense()).isEqualByComparingTo("60000");
        assertThat(stats.getBalance()).isEqualByComparingTo("40000");
    }

    @Test
    void getDashboardStats_calculatesMonthBalanceCorrectly() {
        stub(new BigDecimal("100000"), new BigDecimal("60000"),
             new BigDecimal("45000"),  new BigDecimal("25000"));

        DashboardStats stats = statisticsService.getDashboardStats();

        assertThat(stats.getMonthIncome()).isEqualByComparingTo("45000");
        assertThat(stats.getMonthExpense()).isEqualByComparingTo("25000");
        assertThat(stats.getMonthBalance()).isEqualByComparingTo("20000");
    }

    @Test
    void getDashboardStats_includesCategoryBreakdown() {
        stub(new BigDecimal("100000"), new BigDecimal("60000"),
             new BigDecimal("45000"),  new BigDecimal("25000"));

        List<Object[]> expenseRows = new ArrayList<>();
        expenseRows.add(new Object[]{"Loyer",        new BigDecimal("25000")});
        expenseRows.add(new Object[]{"Alimentation", new BigDecimal("8500")});
        List<Object[]> incomeRows = new ArrayList<>();
        incomeRows.add(new Object[]{"Salaire",   new BigDecimal("45000")});
        incomeRows.add(new Object[]{"Freelance", new BigDecimal("15000")});

        when(transactionRepository.sumAmountByCategoryAndUserId(USER_ID, TransactionType.EXPENSE)).thenReturn(expenseRows);
        when(transactionRepository.sumAmountByCategoryAndUserId(USER_ID, TransactionType.INCOME)).thenReturn(incomeRows);

        DashboardStats stats = statisticsService.getDashboardStats();

        assertThat(stats.getExpensesByCategory()).hasSize(2);
        assertThat(stats.getExpensesByCategory().get(0).getCategory()).isEqualTo("Loyer");
        assertThat(stats.getIncomeByCategory()).hasSize(2);
        assertThat(stats.getIncomeByCategory().get(0).getCategory()).isEqualTo("Salaire");
    }

    @Test
    void getDashboardStats_includesMonthlyTrends() {
        stub(new BigDecimal("100000"), new BigDecimal("60000"),
             new BigDecimal("45000"),  new BigDecimal("25000"));

        List<Object[]> monthlyRows = new ArrayList<>();
        monthlyRows.add(new Object[]{"2026-03", new BigDecimal("45000"), new BigDecimal("35000")});
        monthlyRows.add(new Object[]{"2026-04", new BigDecimal("65000"), new BigDecimal("40000")});
        monthlyRows.add(new Object[]{"2026-05", new BigDecimal("60000"), new BigDecimal("45000")});
        when(transactionRepository.getMonthlyStatsByUserId(any(LocalDate.class), eq(USER_ID))).thenReturn(monthlyRows);

        DashboardStats stats = statisticsService.getDashboardStats();

        assertThat(stats.getMonthlyTrends()).hasSize(3);
        assertThat(stats.getMonthlyTrends().get(0).getMonth()).isEqualTo("2026-03");
        assertThat(stats.getMonthlyTrends().get(0).getIncome()).isEqualByComparingTo("45000");
    }

    @Test
    void getDashboardStats_handlesNullCategoryName() {
        stub(new BigDecimal("100000"), new BigDecimal("60000"),
             new BigDecimal("45000"),  new BigDecimal("25000"));

        List<Object[]> nullCatRow = new ArrayList<>();
        nullCatRow.add(new Object[]{null, new BigDecimal("500")});
        when(transactionRepository.sumAmountByCategoryAndUserId(USER_ID, TransactionType.EXPENSE)).thenReturn(nullCatRow);
        when(transactionRepository.sumAmountByCategoryAndUserId(USER_ID, TransactionType.INCOME)).thenReturn(new ArrayList<>());

        DashboardStats stats = statisticsService.getDashboardStats();

        assertThat(stats.getExpensesByCategory().get(0).getCategory()).isEqualTo("Uncategorized");
    }

    private void stub(BigDecimal totalIncome, BigDecimal totalExpense,
                      BigDecimal monthIncome, BigDecimal monthExpense) {
        when(transactionRepository.sumByUserIdAndType(USER_ID, TransactionType.INCOME)).thenReturn(totalIncome);
        when(transactionRepository.sumByUserIdAndType(USER_ID, TransactionType.EXPENSE)).thenReturn(totalExpense);
        when(transactionRepository.sumByUserIdAndTypeAndDateRange(eq(USER_ID), eq(TransactionType.INCOME), any(), any()))
                .thenReturn(monthIncome);
        when(transactionRepository.sumByUserIdAndTypeAndDateRange(eq(USER_ID), eq(TransactionType.EXPENSE), any(), any()))
                .thenReturn(monthExpense);
        when(transactionRepository.sumAmountByCategoryAndUserId(eq(USER_ID), any())).thenReturn(List.of());
        when(transactionRepository.getMonthlyStatsByUserId(any(), eq(USER_ID))).thenReturn(List.of());
    }
}
