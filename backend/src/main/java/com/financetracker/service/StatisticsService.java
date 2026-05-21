package com.financetracker.service;

import com.financetracker.dto.DashboardStats;
import com.financetracker.entity.User;
import com.financetracker.enums.TransactionType;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.TransactionRepository;
import com.financetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatisticsService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public DashboardStats getDashboardStats() {
        Long uid = currentUserId();

        BigDecimal totalIncome  = transactionRepository.sumByUserIdAndType(uid, TransactionType.INCOME);
        BigDecimal totalExpense = transactionRepository.sumByUserIdAndType(uid, TransactionType.EXPENSE);
        BigDecimal balance      = totalIncome.subtract(totalExpense);

        LocalDate now          = LocalDate.now();
        LocalDate firstOfMonth = now.withDayOfMonth(1);
        LocalDate lastOfMonth  = now.withDayOfMonth(now.lengthOfMonth());

        BigDecimal monthIncome  = transactionRepository.sumByUserIdAndTypeAndDateRange(uid, TransactionType.INCOME,  firstOfMonth, lastOfMonth);
        BigDecimal monthExpense = transactionRepository.sumByUserIdAndTypeAndDateRange(uid, TransactionType.EXPENSE, firstOfMonth, lastOfMonth);
        BigDecimal monthBalance = monthIncome.subtract(monthExpense);

        List<DashboardStats.CategoryStat> expensesByCategory = transactionRepository
                .sumAmountByCategoryAndUserId(uid, TransactionType.EXPENSE).stream()
                .map(row -> new DashboardStats.CategoryStat(
                        row[0] != null ? (String) row[0] : "Uncategorized",
                        (BigDecimal) row[1]))
                .toList();

        List<DashboardStats.CategoryStat> incomeByCategory = transactionRepository
                .sumAmountByCategoryAndUserId(uid, TransactionType.INCOME).stream()
                .map(row -> new DashboardStats.CategoryStat(
                        row[0] != null ? (String) row[0] : "Uncategorized",
                        (BigDecimal) row[1]))
                .toList();

        LocalDate twelveMonthsAgo = now.minusMonths(11).withDayOfMonth(1);
        List<DashboardStats.MonthlyTrend> monthlyTrends = transactionRepository
                .getMonthlyStatsByUserId(twelveMonthsAgo, uid).stream()
                .map(row -> new DashboardStats.MonthlyTrend(
                        (String) row[0],
                        row[1] != null ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO,
                        row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO))
                .toList();

        return DashboardStats.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .balance(balance)
                .monthIncome(monthIncome)
                .monthExpense(monthExpense)
                .monthBalance(monthBalance)
                .expensesByCategory(expensesByCategory)
                .incomeByCategory(incomeByCategory)
                .monthlyTrends(monthlyTrends)
                .build();
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
