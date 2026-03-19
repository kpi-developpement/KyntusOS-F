package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class InstParametrageService {

    // La classe interne pour le dictionnaire INST
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

    // Le dictionnaire en mémoire
    private static final Map<Double, InstRule> DICTIONARY = new HashMap<>();

    static {
        // 🔥 AÉRIEN
        DICTIONARY.put(303.0, new InstRule("RACCORDEMENT REPARATION", "AERIEN", null, null));
        DICTIONARY.put(306.0, new InstRule("RACCORDEMENT REPARATION", "AERIEN", null, true));
        DICTIONARY.put(348.45, new InstRule("RACCORDEMENT REPARATION", "AERIEN", true, null));
        DICTIONARY.put(351.9, new InstRule("RACCORDEMENT REPARATION", "AERIEN", true, true));

        // 🔥 FACADE
        DICTIONARY.put(273.0, new InstRule("RACCORDEMENT REPARATION", "FACADE", null, null));
        DICTIONARY.put(276.0, new InstRule("RACCORDEMENT REPARATION", "FACADE", null, true));
        DICTIONARY.put(313.95, new InstRule("RACCORDEMENT REPARATION", "FACADE", true, null));
        DICTIONARY.put(317.4, new InstRule("RACCORDEMENT REPARATION", "FACADE", true, true));

        // 🔥 CHAMBRE
        DICTIONARY.put(218.0, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", null, null));
        DICTIONARY.put(221.0, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", null, true));
        DICTIONARY.put(250.7, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", true, null));
        DICTIONARY.put(254.15, new InstRule("RACCORDEMENT REPARATION", "CHAMBRE", true, true));

        // 🔥 IMMEUBLE / INTERIEUR
        DICTIONARY.put(108.0, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", null, null));
        DICTIONARY.put(111.0, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", null, true));
        DICTIONARY.put(124.2, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", true, null));
        DICTIONARY.put(127.65, new InstRule("RACCORDEMENT REPARATION", "INTERIEUR", true, true));

        // 🔥 DEPORT
        DICTIONARY.put(86.0, new InstRule("DEPORT", "DEPORT", null, null));
        DICTIONARY.put(89.0, new InstRule("DEPORT", "DEPORT", null, true));
        DICTIONARY.put(98.9, new InstRule("DEPORT", "DEPORT", true, null));
        DICTIONARY.put(102.35, new InstRule("DEPORT", "DEPORT", true, true));

        // 🔥 PLP / EXISTANTE
        DICTIONARY.put(67.0, new InstRule("PLP", "EXISTANTE", null, null));
        DICTIONARY.put(70.0, new InstRule("PLP", "EXISTANTE", null, true));
        DICTIONARY.put(77.05, new InstRule("PLP", "EXISTANTE", true, null));
        DICTIONARY.put(80.5, new InstRule("PLP", "EXISTANTE", true, true));
    }

    /**
     * 🚀 LE MOTEUR LOGIQUE POUR L'INSTALLATION (INST) 🚀
     * @param instPrice Le montant trouvé dans la colonne INST (ex: 77.05)
     * @param typeInstallation La valeur de "Type installation" (ex: "E2...", "O...", etc.)
     * @param action L'Action prise par l'équipe ("Valide", "Contester"...)
     * @return Une Map contenant les colonnes à mettre à jour. Vide si on ne doit rien toucher !
     */
    public Map<String, Object> processInstLogic(double instPrice, String typeInstallation, String action) {
        Map<String, Object> updates = new HashMap<>();

        // 🚨 REGLE D'OR: On vérifie l'Action avant tout ! 🚨
        if (action == null || action.trim().isEmpty()) {
            return updates; // Khawya = On ne touche pas
        }

        String actionClean = action.trim().toLowerCase();

        // Si c'est Valide -> On retourne la Map vide (Zéro modification)
        if (actionClean.startsWith("valid")) {
            return updates;
        }

        // Si ce n'est PAS un Contester -> On retourne aussi la Map vide (Sécurité)
        if (!actionClean.startsWith("contest")) {
            return updates;
        }

        // --- A PARTIR D'ICI, ON EST SUR "CONTESTER", DONC ON APPLIQUE LE REVERSE-ENGINEERING ---

        InstRule rule = DICTIONARY.get(instPrice);
        if (rule == null) return updates; // Prix non trouvé dans le dictionnaire

        updates.put("typeRaccordement", rule.typeRaccordement);

        if (rule.estZoneComplexe != null) {
            updates.put("estZoneComplexe", rule.estZoneComplexe);
        }
        if (rule.estPreAppel != null) {
            updates.put("estPreAppel", rule.estPreAppel);
        }

        if (rule.typeIntervention.equals("RACCORDEMENT REPARATION")) {
            String typeInstClean = (typeInstallation != null) ? typeInstallation.trim().toUpperCase() : "";
            if (typeInstClean.startsWith("O")) {
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