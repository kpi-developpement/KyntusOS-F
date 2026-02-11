package com.kyntus.Workflow.dto;

import lombok.Data;
import java.util.List;

@Data
public class DispatchRequestDto {
    private String mode; // "MANUAL", "BATCH" (Template Auto), "FILTER" (Smart)

    // Pour Mode AUTO_BATCH (Template)
    private Long templateId;

    // Pour Mode MANUAL
    private List<Long> taskIds;
    private Long targetPilotId;

    // Pour Mode SMART_FILTER & AUTO_BATCH
    private List<Long> pilotIds; // Les pilotes ciblés

    // Pour Mode SMART_FILTER
    private String filterKey; // La colonne (ex: "Ville")
    private List<String> filterValues; // 🔥 LISTE (ex: ["Oujda", "Berkane"])
}