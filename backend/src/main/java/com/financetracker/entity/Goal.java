package com.financetracker.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "goals")
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(nullable = false)
    private String category; // study, fitness, finance, culture, skills

    @Column(nullable = false)
    private int progress = 0;

    private int target = 100;

    private String unit = "%";

    private String color = "#a855f7";

    private LocalDate deadline;

    private boolean completed = false;

    @Column(nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public Goal() {}

    // Getters & Setters
    public Long getId()                          { return id; }
    public void setId(Long id)                   { this.id = id; }

    public String getTitle()                     { return title; }
    public void setTitle(String title)           { this.title = title; }

    public String getDescription()               { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory()                  { return category; }
    public void setCategory(String category)     { this.category = category; }

    public int getProgress()                     { return progress; }
    public void setProgress(int progress)        { this.progress = progress; }

    public int getTarget()                       { return target; }
    public void setTarget(int target)            { this.target = target; }

    public String getUnit()                      { return unit; }
    public void setUnit(String unit)             { this.unit = unit; }

    public String getColor()                     { return color; }
    public void setColor(String color)           { this.color = color; }

    public LocalDate getDeadline()               { return deadline; }
    public void setDeadline(LocalDate deadline)  { this.deadline = deadline; }

    public boolean isCompleted()                 { return completed; }
    public void setCompleted(boolean completed)  { this.completed = completed; }

    public Long getUserId()                      { return userId; }
    public void setUserId(Long userId)           { this.userId = userId; }

    public LocalDateTime getCreatedAt()          { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
