package com.financetracker.repository;

import com.financetracker.entity.FitnessWorkout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FitnessWorkoutRepository extends JpaRepository<FitnessWorkout, Long> {
    List<FitnessWorkout> findByUserId(Long userId);
}
