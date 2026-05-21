package com.financetracker.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean enabled = false;

    @Column
    private String verificationToken;

    @Column
    private String resetToken;

    @Column
    private LocalDateTime resetTokenExpiry;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public User() {}

    public User(Long id, String email, String password, String name,
                boolean enabled, String verificationToken, LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.name = name;
        this.enabled = enabled;
        this.verificationToken = verificationToken;
        this.createdAt = createdAt;
    }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private Long id;
        private String email;
        private String password;
        private String name;
        private boolean enabled = false;
        private String verificationToken;
        private LocalDateTime createdAt;

        public Builder id(Long id)                             { this.id = id; return this; }
        public Builder email(String email)                     { this.email = email; return this; }
        public Builder password(String password)               { this.password = password; return this; }
        public Builder name(String name)                       { this.name = name; return this; }
        public Builder enabled(boolean enabled)                { this.enabled = enabled; return this; }
        public Builder verificationToken(String token)         { this.verificationToken = token; return this; }
        public Builder createdAt(LocalDateTime createdAt)      { this.createdAt = createdAt; return this; }
        public User build() {
            return new User(id, email, password, name, enabled, verificationToken, createdAt);
        }
    }

    public Long getId()                           { return id; }
    public void setId(Long id)                    { this.id = id; }
    public String getEmail()                      { return email; }
    public void setEmail(String email)            { this.email = email; }
    public String getName()                       { return name; }
    public void setName(String name)              { this.name = name; }
    public void setPassword(String password)      { this.password = password; }
    public void setEnabled(boolean enabled)       { this.enabled = enabled; }
    public String getVerificationToken()          { return verificationToken; }
    public void setVerificationToken(String t)    { this.verificationToken = t; }
    public String getResetToken()                 { return resetToken; }
    public void setResetToken(String t)           { this.resetToken = t; }
    public LocalDateTime getResetTokenExpiry()    { return resetTokenExpiry; }
    public void setResetTokenExpiry(LocalDateTime d) { this.resetTokenExpiry = d; }
    public LocalDateTime getCreatedAt()           { return createdAt; }

    // UserDetails
    @Override public String getPassword()                                          { return password; }
    @Override public String getUsername()                                          { return email; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities()      { return List.of(); }
    @Override public boolean isAccountNonExpired()                                 { return true; }
    @Override public boolean isAccountNonLocked()                                  { return true; }
    @Override public boolean isCredentialsNonExpired()                             { return true; }
    @Override public boolean isEnabled()                                           { return enabled; }
}
