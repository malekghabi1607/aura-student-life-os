package com.financetracker.service;

import com.financetracker.dto.PlanningEventRequest;
import com.financetracker.entity.PlanningEvent;
import com.financetracker.entity.User;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.PlanningEventRepository;
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
public class PlanningEventService {

    private final PlanningEventRepository planningEventRepository;
    private final UserRepository userRepository;

    public List<PlanningEvent> getAll(Long userId) {
        return planningEventRepository.findByUserId(userId);
    }

    public List<PlanningEvent> getByDate(Long userId, LocalDate date) {
        return planningEventRepository.findByUserIdAndDate(userId, date);
    }

    public PlanningEvent create(Long userId, PlanningEventRequest dto) {
        PlanningEvent event = new PlanningEvent();
        event.setUserId(userId);
        event.setTitle(dto.getTitle());
        event.setDescription(dto.getDescription());
        event.setType(dto.getType());
        event.setLocation(dto.getLocation());
        event.setDuration(dto.getDuration());
        event.setDate(dto.getDate());
        event.setTime(dto.getTime());
        event.setDone(dto.isDone());
        PlanningEvent saved = planningEventRepository.save(event);
        log.info("Created planning event '{}' for user {}", saved.getTitle(), userId);
        return saved;
    }

    public PlanningEvent update(Long id, Long userId, PlanningEventRequest dto) {
        PlanningEvent event = getOwnedOrThrow(id, userId);
        event.setTitle(dto.getTitle());
        event.setDescription(dto.getDescription());
        event.setType(dto.getType());
        event.setLocation(dto.getLocation());
        event.setDuration(dto.getDuration());
        event.setDate(dto.getDate());
        event.setTime(dto.getTime());
        event.setDone(dto.isDone());
        return planningEventRepository.save(event);
    }

    public void delete(Long id, Long userId) {
        PlanningEvent event = getOwnedOrThrow(id, userId);
        planningEventRepository.delete(event);
        log.info("Deleted planning event id {} for user {}", id, userId);
    }

    private PlanningEvent getOwnedOrThrow(Long id, Long userId) {
        PlanningEvent event = planningEventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PlanningEvent not found with id: " + id));
        if (!event.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("PlanningEvent not found with id: " + id);
        }
        return event;
    }

    public Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
