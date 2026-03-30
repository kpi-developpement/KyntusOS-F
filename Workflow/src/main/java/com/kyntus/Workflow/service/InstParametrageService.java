package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class InstParametrageService {

    private static class InstRule {
        String typeIntervention;
        String typeRaccordement;
        Boolean estZoneComplexe;
        Boolean estPreAppel;

        public InstRule(String typeIntervention, String typeRaccordement, Boolean estZoneComplexe, Boolean estPreAppel) {
            this.typeIntervention = typeIntervention;
            this.typeRaccordement = typeRaccordement;
            this.estZoneComplexe = estZoneComplexe;
            this.estPreAppel = estPreAppel;
        }
    }

    private static final Map<Double, InstRule> DICTIONARY = new HashMap<>();

    static {
        DICTIONARY.put(303.0, new InstRule("RACCORDEMENT REPARATION", "AERIEN", null, null));
        DICTIONARY.put(306.0, new InstRule("RACCORDEMENT REPARATION", "AERIEN", null, true));
        DICTIONARY.put(348.45, new InstRule("RACCORDEMENT REPARATION", "AERIEN", true, null));
        DICTIONARY.put(351.9, new InstRule("RACCORDEMENT REPARATION", "AERIEN", true, true));

        DICTIONARY.put(273.0, new InstRule("RACCORDEMENT REPARATION", "FACADE", null, null));
        DICTIONARY.put(276.0, new InstRule("RACCORDEMENT REPARATION", "FACADE", null, true));
        DICTIONARY.put(313.95, new InstRule("RACCORDEMENT REPARATION", "FACADE", true, null));
        DICTIONARY.put(317.4, new InstRule("RACCORDEMENT REPARATION", "FACADE", true, true));

        DICTIONARY.put(218.0, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", null, null));
        DICTIONARY.put(221.0, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", null, true));
        DICTIONARY.put(250.7, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", true, null));
        DICTIONARY.put(254.15, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", true, true));

        DICTIONARY.put(108.0, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", null, null));
        DICTIONARY.put(111.0, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", null, true));
        DICTIONARY.put(124.2, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", true, null));
        DICTIONARY.put(127.65, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", true, true));

        DICTIONARY.put(86.0, new InstRule("DEPORT", "DEPORT", null, null));
        DICTIONARY.put(89.0, new InstRule("DEPORT", "DEPORT", null, true));
        DICTIONARY.put(98.9, new InstRule("DEPORT", "DEPORT", true, null));
        DICTIONARY.put(102.35, new InstRule("DEPORT", "DEPORT", true, true));

        DICTIONARY.put(67.0, new InstRule("PLP", "EXISTANTE", null, null));
        DICTIONARY.put(70.0, new InstRule("PLP", "EXISTANTE", null, true));
        DICTIONARY.put(77.05, new InstRule("PLP", "EXISTANTE", true, null));
        DICTIONARY.put(80.5, new InstRule("PLP", "EXISTANTE", true, true));
    }

    private InstRule getRuleFuzzy(double price) {
        for (Map.Entry<Double, InstRule> entry : DICTIONARY.entrySet()) {
            if (Math.abs(entry.getKey() - price) <= 0.05) {
                return entry.getValue();
            }
        }
        return null;
    }

    public Map<String, Object> processInstLogic(
            double instPrice, String typeInstallation, String action,
            Boolean currentZoneComplexe, Boolean currentPreAppel) {

        Map<String, Object> updates = new HashMap<>();

        // 🚨 CONDITION RJA3AT: System kay-touchi GHIR ila kanet Action = Contester 🚨
        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();
        if (actionClean.startsWith("valid")) return updates;
        if (!actionClean.startsWith("contest")) return updates;

        InstRule rule = getRuleFuzzy(instPrice);
        if (rule == null) {
            return updates;
        }

        updates.put("typeRaccordement", rule.typeRaccordement);

        boolean ruleZoneComplexe = rule.estZoneComplexe != null ? rule.estZoneComplexe : false;
        boolean rulePreAppel = rule.estPreAppel != null ? rule.estPreAppel : false;

        updates.put("estZoneComplexe", Boolean.TRUE.equals(currentZoneComplexe) || ruleZoneComplexe);
        updates.put("estPreAppel", Boolean.TRUE.equals(currentPreAppel) || rulePreAppel);

        if (rule.typeIntervention.equals("RACCORDEMENT REPARATION")) {
            String typeInstClean = (typeInstallation != null) ? typeInstallation.trim().toUpperCase() : "";

            if (typeInstClean.startsWith("O") || typeInstClean.startsWith("0")) {
                updates.put("typeIntervention", "RACCORDEMENT");
            } else if (typeInstClean.startsWith("E2")) {
                updates.put("typeIntervention", "REPARATION");
            } else {
                updates.put("typeIntervention", "RACCORDEMENT");
            }
        } else {
            updates.put("typeIntervention", rule.typeIntervention);
        }

        return updates;
    }
}