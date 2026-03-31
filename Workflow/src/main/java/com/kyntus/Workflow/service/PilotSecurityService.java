package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PilotSecurityService {

    // ⚡ STATIC PATTERN: Bash ma-t-3awedsh t-compila 90,000 merra (Zero CPU Load) ⚡
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