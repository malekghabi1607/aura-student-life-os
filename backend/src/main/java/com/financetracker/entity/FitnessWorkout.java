package com.financetracker.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fitness_workouts")
public class FitnessWorkout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // cardio, musculation, yoga, sport, other

    private Integer duration; // minutes

    private Integer calories;

    private LocalDate date;

    private String notes;

    @Column(nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public FitnessWorkout() {}

    // Getters & Setters
    public Long getId()                              { return id; }
    public void setId(Long id)                       { this.id = id; }

    public String getName()                          { return name; }
    public void setName(String name)                 { this.name = name; }

    public String getType()                          { return type; }
    public void setType(String type)                 { this.type = type; }

    public Integer getDuration()                     { return duration; }
    public void setDuration(Integer duration)        { this.duration = duration; }

    public Integer getCalories()                     { return calories; }
    public void setCalories(Integer calories)        { this.calories = calories; }

    public LocalDate getDate()                       { return date; }
    public void setDate(LocalDate date)              { this.date = date; }

    public String getNotes()                         { return notes; }
    public void setNotes(String notes)               { this.notes = notes; }

    public Long getUserId()                          { return userId; }
    public void setUserId(Long userId)               { this.userId = userId; }

    public LocalDateTime getCreatedAt()              { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
