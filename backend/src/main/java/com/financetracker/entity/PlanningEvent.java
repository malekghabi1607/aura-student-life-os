package com.financetracker.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "planning_events")
public class PlanningEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(nullable = false)
    private String type; // exam, fitness, deadline, study, meeting, other

    private String location;

    private String duration;

    @Column(nullable = false)
    private LocalDate date;

    private String time;

    private boolean done = false;

    @Column(nullable = false)
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public PlanningEvent() {}

    // Getters & Setters
    public Long getId()                              { return id; }
    public void setId(Long id)                       { this.id = id; }

    public String getTitle()                         { return title; }
    public void setTitle(String title)               { this.title = title; }

    public String getDescription()                   { return description; }
    public void setDescription(String description)   { this.description = description; }

    public String getType()                          { return type; }
    public void setType(String type)                 { this.type = type; }

    public String getLocation()                      { return location; }
    public void setLocation(String location)         { this.location = location; }

    public String getDuration()                      { return duration; }
    public void setDuration(String duration)         { this.duration = duration; }

    public LocalDate getDate()                       { return date; }
    public void setDate(LocalDate date)              { this.date = date; }

    public String getTime()                          { return time; }
    public void setTime(String time)                 { this.time = time; }

    public boolean isDone()                          { return done; }
    public void setDone(boolean done)                { this.done = done; }

    public Long getUserId()                          { return userId; }
    public void setUserId(Long userId)               { this.userId = userId; }

    public LocalDateTime getCreatedAt()              { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
