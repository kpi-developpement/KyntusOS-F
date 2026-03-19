package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class MesParametrageService {

    // La structure de notre dictionnaire MES
    private static class MesRule {
        boolean estMiseEnService;
        boolean estBranchement;
        boolean estDiagnosticWifi;
        int minDiagsRequis; // Combien de "true" on veut au minimum (1, 2, ou 3)

        public MesRule(boolean estMiseEnService, boolean estBranchement, boolean estDiagnosticWifi, int minDiagsRequis) {
            this.estMiseEnService = estMiseEnService;
            this.estBranchement = estBranchement;
            this.estDiagnosticWifi = estDiagnosticWifi;
            this.minDiagsRequis = minDiagsRequis;
        }
    }

    private static final Map<Double, MesRule> DICTIONARY = new HashMap<>();

    static {
        // 🔥 BRANCHEMENT IAD (5€) -> Au moins 1 diag
        DICTIONARY.put(5.0, new MesRule(false, true, false, 1));

        // 🔥 BRANCHEMENT IAD TV (10€) -> Au moins 1 diag (Mais on forcera la TV dans la logique)
        DICTIONARY.put(10.0, new MesRule(false, true, false, 1));

        // 🔥 MES 1P (20€ et 30€) -> Au moins 1 diag
        DICTIONARY.put(20.0, new MesRule(true, false, false, 1));
        DICTIONARY.put(30.0, new MesRule(true, false, true, 1)); // Avec Wifi

        // 🔥 MES 2P (21€ et 31€) -> Au moins 2 diags
        DICTIONARY.put(21.0, new MesRule(true, false, false, 2));
        DICTIONARY.put(31.0, new MesRule(true, false, true, 2)); // Avec Wifi

        // 🔥 MES 3P (24€ et 34€) -> Les 3 diags
        DICTIONARY.put(24.0, new MesRule(true, false, false, 3));
        DICTIONARY.put(34.0, new MesRule(true, false, true, 3)); // Avec Wifi
    }

    /**
     * 🚀 LE MOTEUR LOGIQUE POUR LA MISE EN SERVICE (MES) 🚀
     */
    public Map<String, Object> processMesLogic(
            double mesPrice,
            String action,
            Boolean currentInternet,
            Boolean currentTel,
            Boolean currentTv) {

        Map<String, Object> updates = new HashMap<>();

        // 🚨 SECURITE ABSOLUE: On check l'Action d'abord !
        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();

        // Si c'est Valide -> On ne touche à rien
        if (actionClean.startsWith("valid")) return updates;
        // Si ce n'est pas Contester -> On ne touche à rien
        if (!actionClean.startsWith("contest")) return updates;

        // --- DEBUT DU REVERSE-ENGINEERING MES ---
        MesRule rule = DICTIONARY.get(mesPrice);
        if (rule == null) return updates; // Prix inconnu = on ignore

        // 1. Mise à jour des colonnes de base
        updates.put("estMiseEnService", rule.estMiseEnService);
        updates.put("estBranchement", rule.estBranchement);
        updates.put("estDiagnosticWifi", rule.estDiagnosticWifi);

        // 2. L'INTELLIGENCE DES DIAGNOSTICS (Additive Logic: On ne change jamais True en False)
        boolean isIntTrue = Boolean.TRUE.equals(currentInternet);
        boolean isTelTrue = Boolean.TRUE.equals(currentTel);
        boolean isTvTrue = Boolean.TRUE.equals(currentTv);

        // Règle Spéciale pour 10€ (IAD TV) : La TV DOIT être à true
        if (mesPrice == 10.0 && !isTvTrue) {
            updates.put("estDiagnosticTv", true);
            isTvTrue = true;
        }

        // On compte combien on a de 'true' actuellement
        int currentCount = (isIntTrue ? 1 : 0) + (isTelTrue ? 1 : 0) + (isTvTrue ? 1 : 0);

        // Si on n'a pas atteint le quota minimum, on complète (sans jamais effacer)
        if (currentCount < rule.minDiagsRequis) {

            // Priorité 1 : On allume Internet
            if (!isIntTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticInternet", true);
                currentCount++;
            }

            // Priorité 2 : On allume le Téléphone
            if (!isTelTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticTelephone", true);
                currentCount++;
            }

            // Priorité 3 : On allume la TV
            if (!isTvTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticTv", true);
                currentCount++;
            }
        }

        return updates;
    }
}