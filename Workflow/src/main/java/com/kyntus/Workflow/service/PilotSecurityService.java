package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PilotSecurityService {

    // ⚡ STATIC PATTERN: Bash n-7afdou 3la l-Vitesse l-Qoswa ⚡
    private static final Pattern MONTH_PATTERN = Pattern.compile("-M(\\d{1,2})", Pattern.CASE_INSENSITIVE);

    public int extractTargetMonth(String filePeriod, int defaultMonth) {
        if (filePeriod == null || filePeriod.trim().isEmpty()) return defaultMonth;

        Matcher m = MONTH_PATTERN.matcher(filePeriod.trim());
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (Exception e) {
                return defaultMonth;
            }
        }
        return defaultMonth;
    }

    // 🛡️ THE SMART GUARD (Kay-3ref ay variation dyal RZO / PRESTA / OPERATEURS)
    public boolean isExpectedCategory(String rowTypeIntervention, String expectedCategory) {
        if (rowTypeIntervention == null || rowTypeIntervention.trim().isEmpty()) return false;

        String val = rowTypeIntervention.toUpperCase().trim();
        String exp = expectedCategory.toUpperCase().trim();

        if (exp.equals("RACC") && (val.contains("RACC") || val.contains("RACCORDEMENT"))) return true;
        if (exp.equals("SAV") && val.contains("SAV")) return true;

        // 🚨 PRESTA/RZO: System Dki kay-qbel ay variation m-khelta
        if (exp.equals("PRESTA") || exp.equals("RZO")) {
            // N-qblou ay kelma 3ndha 3alaqa b-Presta/Rzo/Operateurs f' string we7da!
            if (val.matches(".*(PRESTA|RZO|RÉSEAU|RESEAU|FREE|ORANGE|SFR|BOUYGUES|OI|MAINTENEUR).*")) {
                return true;
            }
        }

        return false;
    }
}