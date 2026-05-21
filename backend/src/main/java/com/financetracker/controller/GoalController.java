package com.financetracker.controller;

import com.financetracker.dto.GoalRequest;
import com.financetracker.entity.Goal;
import com.financetracker.service.GoalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;

    @GetMapping
    public ResponseEntity<List<Goal>> getAll() {
        Long userId = goalService.currentUserId();
        return ResponseEntity.ok(goalService.getAll(userId));
    }

    @PostMapping
    public ResponseEntity<Goal> create(@RequestBody GoalRequest request) {
        Long userId = goalService.currentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(goalService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Goal> update(@PathVariable Long id, @RequestBody GoalRequest request) {
        Long userId = goalService.currentUserId();
        return ResponseEntity.ok(goalService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = goalService.currentUserId();
        goalService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/progress")
    public ResponseEntity<Goal> updateProgress(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        Long userId = goalService.currentUserId();
        int progress = body.getOrDefault("progress", 0);
        return ResponseEntity.ok(goalService.updateProgress(id, userId, progress));
    }
}
