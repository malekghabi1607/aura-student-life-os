package com.financetracker.controller;

import com.financetracker.dto.PlanningEventRequest;
import com.financetracker.entity.PlanningEvent;
import com.financetracker.service.PlanningEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/planning")
@RequiredArgsConstructor
public class PlanningEventController {

    private final PlanningEventService planningEventService;

    @GetMapping
    public ResponseEntity<List<PlanningEvent>> getAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        Long userId = planningEventService.currentUserId();
        if (date != null) {
            return ResponseEntity.ok(planningEventService.getByDate(userId, date));
        }
        return ResponseEntity.ok(planningEventService.getAll(userId));
    }

    @PostMapping
    public ResponseEntity<PlanningEvent> create(@RequestBody PlanningEventRequest request) {
        Long userId = planningEventService.currentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(planningEventService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlanningEvent> update(@PathVariable Long id, @RequestBody PlanningEventRequest request) {
        Long userId = planningEventService.currentUserId();
        return ResponseEntity.ok(planningEventService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = planningEventService.currentUserId();
        planningEventService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
