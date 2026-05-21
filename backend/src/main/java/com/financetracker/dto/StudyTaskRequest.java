package com.financetracker.dto;

public class StudyTaskRequest {

    private String title;
    private String subject;
    private String estimatedTime;
    private boolean done;

    public StudyTaskRequest() {}

    public String getTitle()                         { return title; }
    public void setTitle(String title)               { this.title = title; }

    public String getSubject()                       { return subject; }
    public void setSubject(String subject)           { this.subject = subject; }

    public String getEstimatedTime()                 { return estimatedTime; }
    public void setEstimatedTime(String estimatedTime) { this.estimatedTime = estimatedTime; }

    public boolean isDone()                          { return done; }
    public void setDone(boolean done)                { this.done = done; }
}
