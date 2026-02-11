package com.kyntus.Workflow.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;

    private boolean active = true;

    private int errorCount = 0;

    // --- 🔥 GAMIFICATION : BONUS/MALUS ---
    // Points ajoutés ou retirés manuellement par l'admin (VAR)
    private int manualPoints = 0;
}