package com.financetracker.service;

import com.financetracker.dto.StudyTaskRequest;
import com.financetracker.entity.StudyTask;
import com.financetracker.entity.User;
import com.financetracker.exception.ResourceNotFoundException;
import com.financetracker.repository.StudyTaskRepository;
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
public class StudyTaskService {

    private final StudyTaskRepository studyTaskRepository;
    private final UserRepository userRepository;

    public List<StudyTask> getAll(Long userId) {
        return studyTaskRepository.findByUserId(userId);
    }

    public StudyTask create(Long userId, StudyTaskRequest dto) {
        StudyTask task = new StudyTask();
        task.setUserId(userId);
        task.setTitle(dto.getTitle());
        task.setSubject(dto.getSubject());
        task.setEstimatedTime(dto.getEstimatedTime());
        task.setDone(dto.isDone());
        StudyTask saved = studyTaskRepository.save(task);
        log.info("Created study task '{}' for user {}", saved.getTitle(), userId);
        return saved;
    }

    public StudyTask update(Long id, Long userId, StudyTaskRequest dto) {
        StudyTask task = getOwnedOrThrow(id, userId);
        task.setTitle(dto.getTitle());
        task.setSubject(dto.getSubject());
        task.setEstimatedTime(dto.getEstimatedTime());
        task.setDone(dto.isDone());
        return studyTaskRepository.save(task);
    }

    public void delete(Long id, Long userId) {
        StudyTask task = getOwnedOrThrow(id, userId);
        studyTaskRepository.delete(task);
        log.info("Deleted study task id {} for user {}", id, userId);
    }

    public StudyTask toggleDone(Long id, Long userId) {
        StudyTask task = getOwnedOrThrow(id, userId);
        task.setDone(!task.isDone());
        return studyTaskRepository.save(task);
    }

    private StudyTask getOwnedOrThrow(Long id, Long userId) {
        StudyTask task = studyTaskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("StudyTask not found with id: " + id));
        if (!task.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("StudyTask not found with id: " + id);
        }
        return task;
    }

    public Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getId();
    }
}
