package com.financetracker.dto;

import java.time.LocalDate;

public class GoalRequest {

    private String title;
    private String description;
    private String category;
    private int progress;
    private int target = 100;
    private String unit = "%";
    private String color = "#a855f7";
    private LocalDate deadline;
    private boolean completed;

    public GoalRequest() {}

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
}
