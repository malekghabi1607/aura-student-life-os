package com.financetracker.controller;

import com.financetracker.dto.FitnessWorkoutRequest;
import com.financetracker.entity.FitnessWorkout;
import com.financetracker.service.FitnessWorkoutService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fitness/workouts")
@RequiredArgsConstructor
public class FitnessWorkoutController {

    private final FitnessWorkoutService fitnessWorkoutService;

    @GetMapping
    public ResponseEntity<List<FitnessWorkout>> getAll() {
        Long userId = fitnessWorkoutService.currentUserId();
        return ResponseEntity.ok(fitnessWorkoutService.getAll(userId));
    }

    @PostMapping
    public ResponseEntity<FitnessWorkout> create(@RequestBody FitnessWorkoutRequest request) {
        Long userId = fitnessWorkoutService.currentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(fitnessWorkoutService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FitnessWorkout> update(@PathVariable Long id, @RequestBody FitnessWorkoutRequest request) {
        Long userId = fitnessWorkoutService.currentUserId();
        return ResponseEntity.ok(fitnessWorkoutService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = fitnessWorkoutService.currentUserId();
        fitnessWorkoutService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
