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
        // --- AÉRIEN ---
        DICTIONARY.put(303.0, new InstRule("RACCORDEMENT REPARATION", "AERIEN", false, false));
        DICTIONARY.put(306.0, new InstRule("RACCORDEMENT REPARATION", "AERIEN", false, true));
        DICTIONARY.put(348.45, new InstRule("RACCORDEMENT REPARATION", "AERIEN", true, false));
        DICTIONARY.put(351.9, new InstRule("RACCORDEMENT REPARATION", "AERIEN", true, true));

        // --- FACADE ---
        DICTIONARY.put(273.0, new InstRule("RACCORDEMENT REPARATION", "FACADE", false, false));
        DICTIONARY.put(276.0, new InstRule("RACCORDEMENT REPARATION", "FACADE", false, true));
        DICTIONARY.put(313.95, new InstRule("RACCORDEMENT REPARATION", "FACADE", true, false));
        DICTIONARY.put(317.4, new InstRule("RACCORDEMENT REPARATION", "FACADE", true, true));

        // --- CHAMBRE ---
        DICTIONARY.put(218.0, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", false, false));
        DICTIONARY.put(221.0, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", false, true));
        DICTIONARY.put(250.7, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", true, false));
        DICTIONARY.put(254.15, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", true, true));

        // --- IMMEUBLE (INTERIEUR) ---
        DICTIONARY.put(108.0, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", false, false));
        DICTIONARY.put(111.0, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", false, true));
        DICTIONARY.put(124.2, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", true, false));
        DICTIONARY.put(127.65, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", true, true));

        // --- DEPORT ---
        DICTIONARY.put(86.0, new InstRule("DEPORT", "DEPORT", false, false));
        DICTIONARY.put(89.0, new InstRule("DEPORT", "DEPORT", false, true));
        DICTIONARY.put(98.9, new InstRule("DEPORT", "DEPORT", true, false));
        DICTIONARY.put(102.35, new InstRule("DEPORT", "DEPORT", true, true));

        // --- PLP ---
        DICTIONARY.put(67.0, new InstRule("PLP", "EXISTANTE", false, false));
        DICTIONARY.put(70.0, new InstRule("PLP", "EXISTANTE", false, true));
        DICTIONARY.put(77.05, new InstRule("PLP", "EXISTANTE", true, false));
        DICTIONARY.put(80.5, new InstRule("PLP", "EXISTANTE", true, true));
    }

    private InstRule getRuleFuzzy(double price) {
        for (Map.Entry<Double, InstRule> entry : DICTIONARY.entrySet()) {
            if (Math.abs(entry.getKey() - price) <= 0.1) {
                return entry.getValue();
            }
        }
        return null;
    }

    public Map<String, Object> processInstLogic(
            double instPrice, String typeInstallation, String action,
            Boolean currentZoneComplexe, Boolean currentPreAppel) {

        Map<String, Object> updates = new HashMap<>();

        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();

        // Zedt contains blast startsWith bach n-couvriw l'cas ila ktab " à contester" ola fiha espace
        if (actionClean.contains("valid")) return updates;
        if (!actionClean.contains("contest")) return updates;

        // 🔥 REGLE BRASSAGE_PM 🔥
        if (Math.abs(instPrice - 48.0) <= 0.05) {
            updates.put("typeIntervention", "BRASSAGE_PM");
            return updates;
        }

        InstRule rule = getRuleFuzzy(instPrice);
        if (rule == null) {
            return updates;
        }

        if (rule.typeRaccordement != null) {
            updates.put("typeRaccordement", rule.typeRaccordement);
        }

        updates.put("estZoneComplexe", Boolean.TRUE.equals(currentZoneComplexe) || rule.estZoneComplexe);
        updates.put("estPreAppel", Boolean.TRUE.equals(currentPreAppel) || rule.estPreAppel);

        // 3️⃣ UPDATE TYPE INTERVENTION (O vs E2) 🔥
        if ("RACCORDEMENT REPARATION".equals(rule.typeIntervention)) {
            String typeInstClean = (typeInstallation != null) ? typeInstallation.trim().toUpperCase() : "";

            if (typeInstClean.startsWith("E2")) {
                updates.put("typeIntervention", "REPARATION");
            } else if (typeInstClean.startsWith("O")) {
                updates.put("typeIntervention", "RACCORDEMENT");
            } else {
                // Par défaut ila kano des valeurs okhrine
                updates.put("typeIntervention", "RACCORDEMENT");
            }
        } else if (rule.typeIntervention != null) {
            updates.put("typeIntervention", rule.typeIntervention);
        }

        return updates;
    }
}