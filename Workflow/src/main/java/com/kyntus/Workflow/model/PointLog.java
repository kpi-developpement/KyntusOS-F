package com.kyntus.Workflow.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "point_logs")
public class PointLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "pilot_id")
    private User pilot;

    // Qui a donné les points ? (L'Admin)
    @ManyToOne
    @JoinColumn(name = "admin_id")
    private User admin;

    private int points; // ex: +50 ou -20

    @Column(columnDefinition = "TEXT")
    private String reason; // "A sauvé la prod", "Retard", etc.

    private LocalDateTime createdAt = LocalDateTime.now();
}