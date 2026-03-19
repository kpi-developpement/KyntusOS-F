package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;

@Service
public class PilotSecurityService {

    // ⏱️ 1. PERIOD GUARD (STRICT: Ligne we7da ghalta = CRASH)
    public void validatePeriodGuard(String filePeriod, int expectedYear, int expectedMonth, int rowNum) {
        if (filePeriod == null || filePeriod.trim().isEmpty()) return; // Ignorer si la cellule est vide

        // Formater l'attendu en "2026-M01"
        String expectedFormat = String.format("%04d-M%02d", expectedYear, expectedMonth);

        if (!filePeriod.equalsIgnoreCase(expectedFormat)) {
            throw new RuntimeException("⏱️ ERREUR PERIODE: La ligne " + rowNum + " contient [" + filePeriod + "] au lieu de [" + expectedFormat + "]. Fichier bloqué !");
        }
    }

    // 🛡️ 2. CATEGORY GUARD (SOUPLE: Une seule occurrence suffit)
    public boolean isExpectedCategory(String rowTypeIntervention, String expectedCategory) {
        if (rowTypeIntervention == null || rowTypeIntervention.trim().isEmpty()) return false;

        String val = rowTypeIntervention.toUpperCase().trim();
        String exp = expectedCategory.toUpperCase().trim();

        if (exp.equals("RACC") && val.contains("RACC")) return true;
        if (exp.equals("SAV") && val.contains("SAV")) return true;
        if ((exp.equals("PRESTA") || exp.equals("RZO")) && (val.contains("RZO") || val.contains("PRESTA"))) return true;

        return false;
    }
}