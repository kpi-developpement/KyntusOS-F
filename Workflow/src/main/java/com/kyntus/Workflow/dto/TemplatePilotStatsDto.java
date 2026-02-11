package com.kyntus.Workflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TemplatePilotStatsDto {
    private Long pilotId;
    private String pilotName;
    private String avatarUrl; // Optionnel, ndirouh initials ila makanch

    // Les compteurs
    private int todoCount;       // A_FAIRE
    private int inProgressCount; // EN_COURS
    private int doneCount;       // DONE (A Valider)
    private int validCount;      // VALIDE
    private int errorCount;      // REJETE

    // Progress Global (0-100%)
    private int completionRate;
}