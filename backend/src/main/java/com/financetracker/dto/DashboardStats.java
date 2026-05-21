package com.financetracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Dashboard statistics DTO — aggregated financial data
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {

    // Totals
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal balance;

    // This month
    private BigDecimal monthIncome;
    private BigDecimal monthExpense;
    private BigDecimal monthBalance;

    // Category breakdown (for pie charts)
    private List<CategoryStat> expensesByCategory;
    private List<CategoryStat> incomeByCategory;

    // Monthly trend (for line/bar charts)
    private List<MonthlyTrend> monthlyTrends;

    @Data
    @NoArgsConstructor
    public static class CategoryStat {
        private String category;
        private BigDecimal amount;

        public CategoryStat(String category, BigDecimal amount) {
            this.category = category;
            this.amount = amount;
        }
    }

    @Data
    @NoArgsConstructor
    public static class MonthlyTrend {
        private String month;
        private BigDecimal income;
        private BigDecimal expense;

        public MonthlyTrend(String month, BigDecimal income, BigDecimal expense) {
            this.month = month;
            this.income = income;
            this.expense = expense;
        }
    }
}
