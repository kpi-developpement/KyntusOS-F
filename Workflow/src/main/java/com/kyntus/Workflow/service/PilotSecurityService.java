package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PilotSecurityService {

    // ⏱️ L-QALEB L-JDID: L-Mouteur li kay-jbed sh-her mn l-Periode (Smart Routing)
    public int extractTargetMonth(String filePeriod, int defaultMonth) {
        if (filePeriod == null || filePeriod.trim().isEmpty()) return defaultMonth;

        // Kay-qelleb 3la -M01, -M1, -M12 wsst l-text (ex: "2026-M01")
        Matcher m = Pattern.compile("-M(\\d{1,2})", Pattern.CASE_INSENSITIVE).matcher(filePeriod.trim());
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1)); // Kay-rje3 ghir l-Mois (1, 2, 12...)
            } catch (Exception e) {
                return defaultMonth;
            }
        }
        return defaultMonth; // Ila malqa walo, kay-khellih f' sh-her d-l'import l-asli
    }

    // 🛡️ CATEGORY GUARD (SOUPLE: Une seule occurrence suffit)
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