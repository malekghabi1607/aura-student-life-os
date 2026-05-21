package com.financetracker.service;

import com.financetracker.dto.GoalRequest;
import com.financetracker.entity.Goal;
import com.financetracker.entity.User;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.GoalRepository;
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
public class GoalService {

    private final GoalRepository goalRepository;
    private final UserRepository userRepository;

    public List<Goal> getAll(Long userId) {
        return goalRepository.findByUserId(userId);
    }

    public Goal create(Long userId, GoalRequest dto) {
        Goal goal = new Goal();
        goal.setUserId(userId);
        goal.setTitle(dto.getTitle());
        goal.setDescription(dto.getDescription());
        goal.setCategory(dto.getCategory());
        goal.setProgress(dto.getProgress());
        goal.setTarget(dto.getTarget());
        goal.setUnit(dto.getUnit());
        goal.setColor(dto.getColor());
        goal.setDeadline(dto.getDeadline());
        goal.setCompleted(dto.isCompleted());
        Goal saved = goalRepository.save(goal);
        log.info("Created goal '{}' for user {}", saved.getTitle(), userId);
        return saved;
    }

    public Goal update(Long id, Long userId, GoalRequest dto) {
        Goal goal = getOwnedOrThrow(id, userId);
        goal.setTitle(dto.getTitle());
        goal.setDescription(dto.getDescription());
        goal.setCategory(dto.getCategory());
        goal.setProgress(dto.getProgress());
        goal.setTarget(dto.getTarget());
        goal.setUnit(dto.getUnit());
        goal.setColor(dto.getColor());
        goal.setDeadline(dto.getDeadline());
        goal.setCompleted(dto.isCompleted());
        return goalRepository.save(goal);
    }

    public void delete(Long id, Long userId) {
        Goal goal = getOwnedOrThrow(id, userId);
        goalRepository.delete(goal);
        log.info("Deleted goal id {} for user {}", id, userId);
    }

    public Goal updateProgress(Long id, Long userId, int progress) {
        Goal goal = getOwnedOrThrow(id, userId);
        goal.setProgress(progress);
        if (progress >= goal.getTarget()) {
            goal.setCompleted(true);
        }
        return goalRepository.save(goal);
    }

    private Goal getOwnedOrThrow(Long id, Long userId) {
        Goal goal = goalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found with id: " + id));
        if (!goal.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Goal not found with id: " + id);
        }
        return goal;
    }

    public Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
