package com.financetracker.dto;

import java.time.LocalDate;

public class PlanningEventRequest {

    private String title;
    private String description;
    private String type;
    private String location;
    private String duration;
    private LocalDate date;
    private String time;
    private boolean done;

    public PlanningEventRequest() {}

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
}
