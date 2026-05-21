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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
@SuppressWarnings("null")
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public List<TransactionResponse> findAll() {
        return transactionRepository.findByUserIdOrderByDateDesc(currentUserId()).stream()
                .map(TransactionResponse::from).toList();
    }

    public List<TransactionResponse> findByType(TransactionType type) {
        return transactionRepository.findByUserIdAndTypeOrderByDateDesc(currentUserId(), type).stream()
                .map(TransactionResponse::from).toList();
    }

    public List<TransactionResponse> findByDateRange(LocalDate start, LocalDate end) {
        return transactionRepository.findByUserIdAndDateBetweenOrderByDateDesc(currentUserId(), start, end).stream()
                .map(TransactionResponse::from).toList();
    }

    public List<TransactionResponse> findByTypeAndDateRange(TransactionType type, LocalDate start, LocalDate end) {
        return transactionRepository.findByUserIdAndTypeAndDateBetweenOrderByDateDesc(currentUserId(), type, start, end).stream()
                .map(TransactionResponse::from).toList();
    }

    public TransactionResponse findById(Long id) {
        return TransactionResponse.from(getOwnedOrThrow(id));
    }

    public TransactionResponse create(TransactionRequest request) {
        Long uid = currentUserId();
        Transaction transaction = Transaction.builder()
                .description(request.getDescription())
                .amount(request.getAmount())
                .type(request.getType())
                .date(request.getDate())
                .notes(request.getNotes())
                .category(resolveCategory(request.getCategoryId()))
                .userId(uid)
                .build();
        Transaction saved = transactionRepository.save(transaction);
        log.info("Created transaction: {} {} {}", saved.getType(), saved.getAmount(), saved.getDescription());
        return TransactionResponse.from(saved);
    }

    public TransactionResponse update(Long id, TransactionRequest request) {
        Transaction transaction = getOwnedOrThrow(id);

        transaction.setDescription(request.getDescription());
        transaction.setAmount(request.getAmount());
        transaction.setType(request.getType());
        transaction.setDate(request.getDate());
        transaction.setNotes(request.getNotes());
        transaction.setCategory(resolveCategory(request.getCategoryId()));

        return TransactionResponse.from(transactionRepository.save(transaction));
    }

    public void delete(Long id) {
        Transaction transaction = getOwnedOrThrow(id);
        transactionRepository.delete(transaction);
        log.info("Deleted transaction id: {}", id);
    }

    private Transaction getOwnedOrThrow(Long id) {
        Transaction t = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
        if (t.getUserId() == null || !t.getUserId().equals(currentUserId())) {
            throw new ResourceNotFoundException("Transaction not found with id: " + id);
        }
        return t;
    }

    private Category resolveCategory(Long categoryId) {
        if (categoryId == null) return null;
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
