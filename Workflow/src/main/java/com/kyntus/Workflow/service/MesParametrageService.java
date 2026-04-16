package com.kyntus.Workflow.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class MesParametrageService {

    private static class MesRule {
        Boolean estMiseEnService;
        Boolean estBranchement;
        Boolean estDiagnosticWifi;
        int minDiagsRequis;
        Boolean forceTv;

        public MesRule(Boolean estMiseEnService, Boolean estBranchement, Boolean estDiagnosticWifi, int minDiagsRequis, Boolean forceTv) {
            this.estMiseEnService = estMiseEnService;
            this.estBranchement = estBranchement;
            this.estDiagnosticWifi = estDiagnosticWifi;
            this.minDiagsRequis = minDiagsRequis;
            this.forceTv = forceTv;
        }
    }

    private static final Map<Double, MesRule> DICTIONARY = new HashMap<>();

    static {
        // --- BRANCHEMENT IAD ---
        // MT = 5 : MES = False, Branchement = True, Au moins 1 diag
        DICTIONARY.put(5.0, new MesRule(false, true, false, 1, false));
        // MT = 10 : MES = False, Branchement = True, Force TV = True
        DICTIONARY.put(10.0, new MesRule(false, true, false, 1, true));

        // --- MES 1P & MES 1P + DIAG ---
        // MT = 20 : MES = True, Branchement = False, Au moins 1 diag, WIFI = False
        DICTIONARY.put(20.0, new MesRule(true, false, false, 1, false));
        // MT = 30 : MES = True, Branchement = False, Au moins 1 diag, WIFI = True
        DICTIONARY.put(30.0, new MesRule(true, false, true, 1, false));

        // --- MES 2P & MES 2P + DIAG ---
        // MT = 21 : MES = True, Branchement = False, Au moins 2 diags, WIFI = False
        DICTIONARY.put(21.0, new MesRule(true, false, false, 2, false));
        // MT = 31 : MES = True, Branchement = False, Au moins 2 diags, WIFI = True
        DICTIONARY.put(31.0, new MesRule(true, false, true, 2, false));

        // --- MES 3P & MES 3P + DIAG ---
        // MT = 24 : MES = True, Branchement = False, Les 3 diags, WIFI = False
        DICTIONARY.put(24.0, new MesRule(true, false, false, 3, false));
        // MT = 34 : MES = True, Branchement = False, Les 3 diags, WIFI = True
        DICTIONARY.put(34.0, new MesRule(true, false, true, 3, false));
    }

    private MesRule getRuleFuzzy(double price) {
        for (Map.Entry<Double, MesRule> entry : DICTIONARY.entrySet()) {
            if (Math.abs(entry.getKey() - price) <= 0.05) {
                return entry.getValue();
            }
        }
        return null;
    }

    public Map<String, Object> processMesLogic(
            double mesPrice, String action,
            Boolean currentInternet, Boolean currentTel, Boolean currentTv,
            Boolean currentMes, Boolean currentBranchement, Boolean currentWifi) {

        Map<String, Object> updates = new HashMap<>();

        // 🚨 PROTECTON: System kay-touchi GHIR ila kanet Action = Contester 🚨
        if (action == null || action.trim().isEmpty()) return updates;
        String actionClean = action.trim().toLowerCase();

        if (actionClean.contains("valid")) return updates;
        if (!actionClean.contains("contest")) return updates;

        // Récupération de la règle avec tolérance (0.05)
        MesRule rule = getRuleFuzzy(mesPrice);
        if (rule == null) return updates;

        // 1️⃣ UPDATE BOOLEANS DE BASE (Logique Additive)
        updates.put("estMiseEnService", Boolean.TRUE.equals(currentMes) || rule.estMiseEnService);
        updates.put("estBranchement", Boolean.TRUE.equals(currentBranchement) || rule.estBranchement);

        // 🔥 L'Wifi ghay-t-appliqua ghir 3la 30, 31, 34 7it dnaynahoum f dictionnaire 🔥
        updates.put("estDiagnosticWifi", Boolean.TRUE.equals(currentWifi) || rule.estDiagnosticWifi);

        // 2️⃣ ANALYSE DES DIAGNOSTICS ACTUELS
        boolean isIntTrue = Boolean.TRUE.equals(currentInternet);
        boolean isTelTrue = Boolean.TRUE.equals(currentTel);
        boolean isTvTrue = Boolean.TRUE.equals(currentTv);

        // 🔥 REGLE SPECIALE MT = 10 (Force TV) 🔥
        if (rule.forceTv) {
            updates.put("estDiagnosticTv", true);
            isTvTrue = true;
        }

        // 3️⃣ COMPTAGE ET REMPLISSAGE "AU MOINS X"
        int currentCount = (isIntTrue ? 1 : 0) + (isTelTrue ? 1 : 0) + (isTvTrue ? 1 : 0);

        if (currentCount < rule.minDiagsRequis) {
            // Priorité 1 : Internet
            if (!isIntTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticInternet", true);
                currentCount++;
            }
            // Priorité 2 : Téléphone
            if (!isTelTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticTelephone", true);
                currentCount++;
            }
            // Priorité 3 : TV
            if (!isTvTrue && currentCount < rule.minDiagsRequis) {
                updates.put("estDiagnosticTv", true);
                currentCount++;
            }
        }

        return updates;
    }
}