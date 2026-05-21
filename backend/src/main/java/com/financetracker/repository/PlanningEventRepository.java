package com.financetracker.repository;

import com.financetracker.entity.PlanningEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PlanningEventRepository extends JpaRepository<PlanningEvent, Long> {
    List<PlanningEvent> findByUserId(Long userId);
    List<PlanningEvent> findByUserIdAndDate(Long userId, LocalDate date);
}
