package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class LogistiqueParametrageService {

    /**
     * 🚀 LE MOTEUR LOGIQUE POUR LA LOGISTIQUE 🚀
     * @param logistiquePrice Le montant trouvé dans la colonne LOGISTIQUE (ex: 0, 13, 26)
     * @param action L'Action prise par l'équipe ("Valide", "Contester"...)
     * @param currentRepeteurs Le nombre actuel de répéteurs dans le fichier
     * @return Une Map contenant la mise à jour
     */
    public Map<String, Object> processLogistiqueLogic(double logistiquePrice, String action, Integer currentRepeteurs) {

        Map<String, Object> updates = new HashMap<>();

        // 🚨 SECURITE ABSOLUE: On check l'Action d'abord !
        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();

        // Si c'est Valide -> On ne touche à rien
        if (actionClean.startsWith("valid")) return updates;
        // Si ce n'est pas Contester -> On ne touche à rien
        if (!actionClean.startsWith("contest")) return updates;

        // --- DEBUT DU REVERSE-ENGINEERING LOGISTIQUE ---

        // 1. Déduction du nombre de répéteurs basé sur le prix
        int expectedRepeteurs = 0;
        if (logistiquePrice == 13.0) {
            expectedRepeteurs = 1;
        } else if (logistiquePrice == 26.0) {
            expectedRepeteurs = 2;
        } else if (logistiquePrice > 26.0) {
            // Logique mathématique au cas où le prix est 39 (3 répéteurs) etc.
            expectedRepeteurs = (int) (logistiquePrice / 13.0);
        }

        // 2. Récupération de la valeur actuelle (0 si null)
        int actualCurrent = (currentRepeteurs != null) ? currentRepeteurs : 0;

        // 🔥 THE PROFIT RULE: On prend toujours le MAX entre ce que dit le prix et ce qu'a dit le technicien ! 🔥
        int finalRepeteurs = Math.max(expectedRepeteurs, actualCurrent);

        // 3. Application de la mise à jour
        updates.put("nombreRepeteursPoses", finalRepeteurs);

        return updates;
    }
}