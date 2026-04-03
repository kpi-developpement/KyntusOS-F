package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PilotSecurityService {

    private static final Pattern MONTH_PATTERN = Pattern.compile("-M(\\d{1,2})", Pattern.CASE_INSENSITIVE);

    public int extractTargetMonth(String filePeriod, int defaultMonth) {
        if (filePeriod == null || filePeriod.trim().isEmpty()) return defaultMonth;
        Matcher m = MONTH_PATTERN.matcher(filePeriod.trim());
        if (m.find()) {
            try { return Integer.parseInt(m.group(1)); } catch (Exception e) { return defaultMonth; }
        }
        return defaultMonth;
    }

    // 🛡️ THE LOGICAL GUARD (Kay-qbel RZO = PRESTA = FREE = ORANGE = GRINGOTTS...)
    public boolean isExpectedCategory(String rowTypeIntervention, String expectedCategory) {
        if (rowTypeIntervention == null || rowTypeIntervention.trim().isEmpty()) return false;

        String val = rowTypeIntervention.toUpperCase().replaceAll("[\\s_\\-]", "");
        String exp = expectedCategory != null ? expectedCategory.toUpperCase().trim() : "";

        if (exp.equals("RACC") && (val.contains("RACC") || val.contains("RACCORDEMENT"))) return true;
        if (exp.equals("SAV") && val.contains("SAV")) return true;

        // 🔥 PRESTA / RZO LOGIC (BULLETPROOF) 🔥
        if (exp.equals("PRESTA") || exp.equals("RZO")) {
            if (val.contains("RZO") || val.contains("PRESTA") || val.contains("RESEAU") ||
                    val.contains("FREE") || val.contains("ORANGE") || val.contains("SFR") ||
                    val.contains("BOUYGUES") || val.contains("OI") || val.contains("MAINTENEUR") ||
                    val.contains("GRINGOTTS")) { // Zedna l-mots li momkin ytla7o fl fichier
                return true;
            }
        }

        return exp.equals(val);
    }
}