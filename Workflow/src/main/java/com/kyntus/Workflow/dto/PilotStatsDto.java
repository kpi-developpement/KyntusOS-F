package com.kyntus.Workflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PilotStatsDto {
    private Long id;
    private String username;

    // Workflow Metrics
    private int totalTasks;
    private int validatedTasks;
    private int rejectedTasks;

    // Performance Metrics
    private double qualityScore; // % de 0 a 100
    private int manualPoints;    // Points VAR (Admin)
    private double avgTimeSeconds;

    // The Main Score
    private double leaguePoints;

    // Gamification Rank
    private String tier; // DIAMOND, GOLD, SILVER, BRONZE
}