package com.financetracker.repository;

import com.financetracker.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserId(Long userId);
    Optional<Category> findByNameIgnoreCaseAndUserId(String name, Long userId);
    boolean existsByNameIgnoreCaseAndUserId(String name, Long userId);
    Optional<Category> findByNameIgnoreCase(String name);
}
