package com.kyntus.Workflow.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "ventilation_data")
@Data
public class VentilationData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "annee")
    private int year;

    @Column(name = "mois")
    private int month;

    // 🔥 THE FIX: Bdellna LONGTEXT b' TEXT 7it PostgreSQL kay-fhem ghir TEXT l'les chaines kbar 🔥
    @Lob
    @Column(columnDefinition = "TEXT")
    private String jsonData;
}