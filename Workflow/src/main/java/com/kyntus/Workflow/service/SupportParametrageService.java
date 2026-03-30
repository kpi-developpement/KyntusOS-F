package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class SupportParametrageService {

    public Map<String, Object> processSupportLogic(double supportPrice, String action, Double currentMontantDevis) {

        Map<String, Object> updates = new HashMap<>();

        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();

        if (actionClean.startsWith("valid")) return updates;
        if (!actionClean.startsWith("contest")) return updates;

        double actualDevis = (currentMontantDevis != null) ? currentMontantDevis : 0.0;

        // 🚨 REGLE SPECIALE 200€ : Complexe = true, Devis = INCHANGE ! 🚨
        if (supportPrice == 200.0) {
            updates.put("estInterventionComplexe", true);
            // On ne touche PAS au montant devis, il restera tel qu'il était (0 ou autre)
        }
        // 🚨 LES AUTRES PRIX : On met à jour le devis
        else if (supportPrice > 0.0) {
            updates.put("montantDevis", Math.max(supportPrice, actualDevis));
        }

        return updates;
    }
}