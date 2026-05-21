package com.financetracker.dto;

import java.time.LocalDate;

public class FitnessWorkoutRequest {

    private String name;
    private String type;
    private Integer duration;
    private Integer calories;
    private LocalDate date;
    private String notes;

    public FitnessWorkoutRequest() {}

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
}
