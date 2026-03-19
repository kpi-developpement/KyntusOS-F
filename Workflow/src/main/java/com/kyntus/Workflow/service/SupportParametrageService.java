package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class SupportParametrageService {

    /**
     * 🚀 LE MOTEUR LOGIQUE POUR LE SUPPORT & DEVIS 🚀
     * @param supportPrice Le montant trouvé dans la colonne SUPPORT (ex: 0, 200, 300)
     * @param action L'Action prise par l'équipe ("Valide", "Contester"...)
     * @param currentMontantDevis Le montant actuel du devis dans le fichier
     * @return Une Map contenant les mises à jour
     */
    public Map<String, Object> processSupportLogic(double supportPrice, String action, Double currentMontantDevis) {

        Map<String, Object> updates = new HashMap<>();

        // 🚨 SECURITE ABSOLUE: On check l'Action d'abord !
        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();

        // Si c'est Valide -> On ne touche à rien
        if (actionClean.startsWith("valid")) return updates;
        // Si ce n'est pas Contester -> On ne touche à rien
        if (!actionClean.startsWith("contest")) return updates;

        // --- DEBUT DU REVERSE-ENGINEERING SUPPORT & DEVIS ---

        // 1. Récupération de la valeur actuelle du devis (0 si null)
        double actualDevis = (currentMontantDevis != null) ? currentMontantDevis : 0.0;

        // 2. Traitement selon le prix
        if (supportPrice == 200.0) {
            // Règle Spéciale 200€
            updates.put("estInterventionComplexe", true);
            updates.put("montantDevis", Math.max(200.0, actualDevis));
        } else if (supportPrice > 0.0) {
            // Tout autre prix (ex: 300€) -> On ne touche pas à complexe, on gère juste le devis
            updates.put("montantDevis", Math.max(supportPrice, actualDevis));
        } else if (supportPrice == 0.0) {
            // Si le prix support est 0, on garde le devis tel quel s'il existe (Math.max gère ça)
            updates.put("montantDevis", Math.max(0.0, actualDevis));
        }

        return updates;
    }
}