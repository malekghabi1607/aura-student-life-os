package com.financetracker.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Category entity — groups transactions (e.g. Food, Salary, Transport)
 */
@Entity
@Table(name = "categories")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 7)
    private String color; // hex color e.g. #FF6384

    @Column(length = 50)
    private String icon; // icon identifier e.g. "shopping-cart"

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "user_id")
    private Long userId;

    @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private List<Transaction> transactions = new ArrayList<>();
}
