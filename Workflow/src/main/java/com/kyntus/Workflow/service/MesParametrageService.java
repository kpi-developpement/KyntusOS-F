package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class MesParametrageService {

    private static class MesRule {
        boolean estMiseEnService;
        boolean estBranchement;
        boolean estDiagnosticWifi;
        int minDiagsRequis;

        public MesRule(boolean estMiseEnService, boolean estBranchement, boolean estDiagnosticWifi, int minDiagsRequis) {
            this.estMiseEnService = estMiseEnService;
            this.estBranchement = estBranchement;
            this.estDiagnosticWifi = estDiagnosticWifi;
            this.minDiagsRequis = minDiagsRequis;
        }
    }

    private static final Map<Double, MesRule> DICTIONARY = new HashMap<>();

    static {
        DICTIONARY.put(5.0, new MesRule(false, true, false, 1));
        DICTIONARY.put(10.0, new MesRule(false, true, false, 1));
        DICTIONARY.put(20.0, new MesRule(true, false, false, 1));
        DICTIONARY.put(30.0, new MesRule(true, false, true, 1));
        DICTIONARY.put(21.0, new MesRule(true, false, false, 2));
        DICTIONARY.put(31.0, new MesRule(true, false, true, 2));
        DICTIONARY.put(24.0, new MesRule(true, false, false, 3));
        DICTIONARY.put(34.0, new MesRule(true, false, true, 3));
    }

    public Map<String, Object> processMesLogic(
            double mesPrice, String action,
            Boolean currentInternet, Boolean currentTel, Boolean currentTv,
            Boolean currentMes, Boolean currentBranchement, Boolean currentWifi) {

        Map<String, Object> updates = new HashMap<>();

        // 🚨 CONDITION RJA3AT: System kay-touchi GHIR ila kanet Action = Contester 🚨
        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();
        if (actionClean.startsWith("valid")) return updates;
        if (!actionClean.startsWith("contest")) return updates;

        // 🔥 L-QALEB HNA: Dkhelna l-Contester, 3ad n-choufou MES = 10 🔥
        if (mesPrice == 10.0) {
            updates.put("estDiagnosticTv", true);
            currentTv = true; // Kan-updatiw l-variable locale bash l-calcul d-les autres règles may-t-ghlatch
        }

        MesRule rule = DICTIONARY.get(mesPrice);
        if (rule == null) return updates;

        updates.put("estMiseEnService", rule.estMiseEnService || Boolean.TRUE.equals(currentMes));
        updates.put("estBranchement", rule.estBranchement || Boolean.TRUE.equals(currentBranchement));
        updates.put("estDiagnosticWifi", rule.estDiagnosticWifi || Boolean.TRUE.equals(currentWifi));

        boolean isIntTrue = Boolean.TRUE.equals(currentInternet);
        boolean isTelTrue = Boolean.TRUE.equals(currentTel);
        boolean isTvTrue = Boolean.TRUE.equals(currentTv);

        int currentCount = (isIntTrue ? 1 : 0) + (isTelTrue ? 1 : 0) + (isTvTrue ? 1 : 0);

        if (currentCount < rule.minDiagsRequis) {
            if (!isIntTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticInternet", true);
                currentCount++;
            }
            if (!isTelTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticTelephone", true);
                currentCount++;
            }
            if (!isTvTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticTv", true);
                currentCount++;
            }
        }

        return updates;
    }
}