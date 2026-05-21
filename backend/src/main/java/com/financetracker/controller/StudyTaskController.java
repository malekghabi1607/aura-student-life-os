package com.financetracker.controller;

import com.financetracker.dto.StudyTaskRequest;
import com.financetracker.entity.StudyTask;
import com.financetracker.service.StudyTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/study/tasks")
@RequiredArgsConstructor
public class StudyTaskController {

    private final StudyTaskService studyTaskService;

    @GetMapping
    public ResponseEntity<List<StudyTask>> getAll() {
        Long userId = studyTaskService.currentUserId();
        return ResponseEntity.ok(studyTaskService.getAll(userId));
    }

    @PostMapping
    public ResponseEntity<StudyTask> create(@RequestBody StudyTaskRequest request) {
        Long userId = studyTaskService.currentUserId();
        return ResponseEntity.status(HttpStatus.CREATED).body(studyTaskService.create(userId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudyTask> update(@PathVariable Long id, @RequestBody StudyTaskRequest request) {
        Long userId = studyTaskService.currentUserId();
        return ResponseEntity.ok(studyTaskService.update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Long userId = studyTaskService.currentUserId();
        studyTaskService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<StudyTask> toggle(@PathVariable Long id) {
        Long userId = studyTaskService.currentUserId();
        return ResponseEntity.ok(studyTaskService.toggleDone(id, userId));
    }
}
