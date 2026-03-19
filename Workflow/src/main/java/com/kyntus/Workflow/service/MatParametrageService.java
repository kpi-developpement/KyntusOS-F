package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class MatParametrageService {

    /**
     * 🚀 LE MOTEUR LOGIQUE POUR LE MATERIEL (MAT) 🚀
     * @param matPrice Le montant trouvé dans la colonne MAT (ex: 0, 41.22...)
     * @param action L'Action prise par l'équipe ("Valide", "Contester"...)
     * @param currentEstFournisseurBytel La valeur actuelle dans le fichier (True/False)
     * @return Une Map contenant la mise à jour (estFournisseurBytel)
     */
    public Map<String, Object> processMatLogic(double matPrice, String action, Boolean currentEstFournisseurBytel) {

        Map<String, Object> updates = new HashMap<>();

        // 🚨 SECURITE ABSOLUE: On check l'Action d'abord !
        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();

        // Si c'est Valide -> On ne touche à rien
        if (actionClean.startsWith("valid")) return updates;
        // Si ce n'est pas Contester -> On ne touche à rien
        if (!actionClean.startsWith("contest")) return updates;

        // --- DEBUT DU REVERSE-ENGINEERING MAT ---

        // L-Qaleb dyal "Additive Logic" : Ila kant deja True, Makan-qissouhach !
        boolean isCurrentlyTrue = Boolean.TRUE.equals(currentEstFournisseurBytel);

        if (isCurrentlyTrue) {
            return updates; // "ela estFournisseurBytel kanet true sf kheliha true"
        }

        // Si on arrive ici, ça veut dire que ce n'est PAS True actuellement (soit False, soit Null)
        if (matPrice == 0.0) {
            // "ela fl collone MAT l9a = 0 ade ydirha false"
            updates.put("estFournisseurBytel", false);
        } else {
            // "ela kanet tkhalef zero ade tweli true"
            updates.put("estFournisseurBytel", true);
        }

        return updates;
    }
}