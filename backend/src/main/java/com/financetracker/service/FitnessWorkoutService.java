package com.financetracker.service;

import com.financetracker.dto.FitnessWorkoutRequest;
import com.financetracker.entity.FitnessWorkout;
import com.financetracker.entity.User;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.FitnessWorkoutRepository;
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
public class FitnessWorkoutService {

    private final FitnessWorkoutRepository fitnessWorkoutRepository;
    private final UserRepository userRepository;

    public List<FitnessWorkout> getAll(Long userId) {
        return fitnessWorkoutRepository.findByUserId(userId);
    }

    public FitnessWorkout create(Long userId, FitnessWorkoutRequest dto) {
        FitnessWorkout workout = new FitnessWorkout();
        workout.setUserId(userId);
        workout.setName(dto.getName());
        workout.setType(dto.getType());
        workout.setDuration(dto.getDuration());
        workout.setCalories(dto.getCalories());
        workout.setDate(dto.getDate());
        workout.setNotes(dto.getNotes());
        FitnessWorkout saved = fitnessWorkoutRepository.save(workout);
        log.info("Created fitness workout '{}' for user {}", saved.getName(), userId);
        return saved;
    }

    public FitnessWorkout update(Long id, Long userId, FitnessWorkoutRequest dto) {
        FitnessWorkout workout = getOwnedOrThrow(id, userId);
        workout.setName(dto.getName());
        workout.setType(dto.getType());
        workout.setDuration(dto.getDuration());
        workout.setCalories(dto.getCalories());
        workout.setDate(dto.getDate());
        workout.setNotes(dto.getNotes());
        return fitnessWorkoutRepository.save(workout);
    }

    public void delete(Long id, Long userId) {
        FitnessWorkout workout = getOwnedOrThrow(id, userId);
        fitnessWorkoutRepository.delete(workout);
        log.info("Deleted fitness workout id {} for user {}", id, userId);
    }

    private FitnessWorkout getOwnedOrThrow(Long id, Long userId) {
        FitnessWorkout workout = fitnessWorkoutRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FitnessWorkout not found with id: " + id));
        if (!workout.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("FitnessWorkout not found with id: " + id);
        }
        return workout;
    }

    public Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
