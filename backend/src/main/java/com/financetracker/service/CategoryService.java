package com.financetracker.service;

import com.financetracker.dto.CategoryRequest;
import com.financetracker.dto.CategoryResponse;
import com.financetracker.entity.Category;
import com.financetracker.entity.User;
import com.financetracker.exception.BadRequestException;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.CategoryRepository;
import com.financetracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
@SuppressWarnings("null")
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public List<CategoryResponse> findAll() {
        return categoryRepository.findByUserId(currentUserId()).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    public CategoryResponse findById(Long id) {
        return CategoryResponse.from(getOwnedOrThrow(id));
    }

    public CategoryResponse create(CategoryRequest request) {
        Long uid = currentUserId();
        if (categoryRepository.existsByNameIgnoreCaseAndUserId(request.getName(), uid)) {
            throw new BadRequestException("Category '" + request.getName() + "' already exists");
        }
        Category category = Category.builder()
                .name(request.getName())
                .color(request.getColor())
                .icon(request.getIcon())
                .description(request.getDescription())
                .userId(uid)
                .build();
        Category saved = categoryRepository.save(category);
        log.info("Created category: {}", saved.getName());
        return CategoryResponse.from(saved);
    }

    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getOwnedOrThrow(id);
        Long uid = currentUserId();

        categoryRepository.findByNameIgnoreCaseAndUserId(request.getName(), uid)
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new BadRequestException("Category '" + request.getName() + "' already exists");
                    }
                });

        category.setName(request.getName());
        category.setColor(request.getColor());
        category.setIcon(request.getIcon());
        category.setDescription(request.getDescription());

        return CategoryResponse.from(categoryRepository.save(category));
    }

    public void delete(Long id) {
        Category category = getOwnedOrThrow(id);
        if (!category.getTransactions().isEmpty()) {
            throw new BadRequestException("Cannot delete category with existing transactions. Reassign or delete them first.");
        }
        categoryRepository.delete(category);
        log.info("Deleted category: {}", category.getName());
    }

    private Category getOwnedOrThrow(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        if (category.getUserId() == null || !category.getUserId().equals(currentUserId())) {
            throw new ResourceNotFoundException("Category not found with id: " + id);
        }
        return category;
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
