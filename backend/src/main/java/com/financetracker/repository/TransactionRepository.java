package com.financetracker.repository;

import com.financetracker.entity.Transaction;
import com.financetracker.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdOrderByDateDesc(Long userId);
    List<Transaction> findByUserIdAndTypeOrderByDateDesc(Long userId, TransactionType type);
    List<Transaction> findByUserIdAndDateBetweenOrderByDateDesc(Long userId, LocalDate start, LocalDate end);
    List<Transaction> findByUserIdAndTypeAndDateBetweenOrderByDateDesc(Long userId, TransactionType type, LocalDate start, LocalDate end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :uid AND t.type = :type")
    BigDecimal sumByUserIdAndType(@Param("uid") Long userId, @Param("type") TransactionType type);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.userId = :uid AND t.type = :type AND t.date BETWEEN :start AND :end")
    BigDecimal sumByUserIdAndTypeAndDateRange(@Param("uid") Long userId, @Param("type") TransactionType type,
                                              @Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT c.name, SUM(t.amount) FROM Transaction t JOIN t.category c WHERE t.userId = :uid AND t.type = :type GROUP BY c.name")
    List<Object[]> sumAmountByCategoryAndUserId(@Param("uid") Long userId, @Param("type") TransactionType type);

    @Query(value = """
        SELECT TO_CHAR(date, 'YYYY-MM') as month,
               SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income,
               SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense
        FROM transactions
        WHERE date >= :startDate AND user_id = :uid
        GROUP BY TO_CHAR(date, 'YYYY-MM')
        ORDER BY month
        """, nativeQuery = true)
    List<Object[]> getMonthlyStatsByUserId(@Param("startDate") LocalDate startDate, @Param("uid") Long userId);
}
