package com.kyntus.Workflow.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "ventilation_data")
@Data // Ila knti khddam b' Lombok, sinon dir les Getters w Setters b' yeddik
public class VentilationData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "annee")
    private int year;

    @Column(name = "mois")
    private int month;

    // 🔥 LONGTEXT bash y-hzz l-JSON kbir dyal Excel kamel bla may-t-planta 🔥
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String jsonData;
}