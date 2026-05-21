package com.financetracker.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "study_tasks")
public class StudyTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String subject;

    private String estimatedTime;

    private boolean done = false;

    @Column(nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public StudyTask() {}

    // Getters & Setters
    public Long getId()                              { return id; }
    public void setId(Long id)                       { this.id = id; }

    public String getTitle()                         { return title; }
    public void setTitle(String title)               { this.title = title; }

    public String getSubject()                       { return subject; }
    public void setSubject(String subject)           { this.subject = subject; }

    public String getEstimatedTime()                 { return estimatedTime; }
    public void setEstimatedTime(String estimatedTime) { this.estimatedTime = estimatedTime; }

    public boolean isDone()                          { return done; }
    public void setDone(boolean done)                { this.done = done; }

    public Long getUserId()                          { return userId; }
    public void setUserId(Long userId)               { this.userId = userId; }

    public LocalDateTime getCreatedAt()              { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
