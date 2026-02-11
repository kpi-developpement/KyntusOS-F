package com.kyntus.Workflow.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class DashboardSummaryDto {
    private GlobalStats global;
    private List<ProjectSummary> projects;

    @Data
    public static class GlobalStats {
        private int totalToDo;
        private int totalInProgress;
        private int totalDone;
        private int totalValid;
    }

    @Data
    public static class ProjectSummary {
        private Long templateId;
        private String templateName;
        private int progress; // 0 à 100
        private int totalTasks;

        // Mini Stats
        private int countToDo;
        private int countActive;
        private int countDone;
        private int countValid;
        private int countRejected;

        // X-Ray Details
        private List<String> activePilots; // Noms des pilotes actifs
        private List<String> criticalEps;  // EPS en erreur/rejet
    }
}