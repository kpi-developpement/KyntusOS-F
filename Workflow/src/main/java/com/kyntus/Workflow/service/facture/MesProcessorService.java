package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class MesProcessorService {

    private static final QaProcessorService.QaData EMPTY_QA = new QaProcessorService.QaData();

    public static class MesResult {
        public String codeInter, diagWifi, matLiv, mesQuest, libelleOffre, questionTv;
        public String typeMes, typeMes123p, internet, phone, tv, codeInterDup;
        public int mt, mtPlusDiagWifi;
    }

    /**
     * ⚡ METHODE TAYYARA (O(1) per row): Kat-7seb MES nichan wst FactureMasterService
     * bla ma n-3awdou n-qraw fichierAVide mn jdid!
     */
    public MesResult computeSingleRowMes(
            String codeInter,
            String libelleOffreA,
            String internet,
            String phone,
            String tv,
            Map<String, String> diagWifiMap,
            Map<String, QaProcessorService.QaData> qaMap,
            Map<String, String> offreMap) {

        String libelleOffre = offreMap.getOrDefault(codeInter, libelleOffreA);
        QaProcessorService.QaData qaData = qaMap.getOrDefault(codeInter, EMPTY_QA);

        MesResult mesResult = new MesResult();
        mesResult.codeInter = codeInter;
        mesResult.codeInterDup = codeInter;
        mesResult.libelleOffre = libelleOffre;
        mesResult.internet = internet;
        mesResult.phone = phone;
        mesResult.tv = tv;

        mesResult.diagWifi = diagWifiMap.getOrDefault(codeInter, "");
        mesResult.mesQuest = qaData.mesQuest;
        mesResult.questionTv = qaData.questionTv;
        mesResult.matLiv = qaData.matLiv.isEmpty() ? "OUI" : qaData.matLiv;

        String offreLower = libelleOffre.toLowerCase();
        boolean isSpecialOffre = offreLower.contains("fit") || offreLower.contains("b&you") ||
                offreLower.contains("byou") || offreLower.contains("-26 ans") ||
                offreLower.contains("asso");

        boolean isMatLivOui = mesResult.matLiv.equals("OUI") || mesResult.matLiv.equals("OUI !!!");
        boolean isDiagWifiSet = mesResult.diagWifi.equals("VRAI") || mesResult.diagWifi.equals("FAUX");

        if (isDiagWifiSet) {
            mesResult.typeMes = isMatLivOui ? "MES 1/2/3 P" : "NOK";
        } else {
            if (mesResult.matLiv.equals("NON")) {
                mesResult.typeMes = "NOK";
            } else if (isMatLivOui && isSpecialOffre) {
                mesResult.typeMes = "Branchement IAD (Voir offre)";
            } else if (isMatLivOui && (mesResult.mesQuest.equals("Message_CleEnMainSAO") ||
                    mesResult.mesQuest.equals("Message_CleEnMain") || mesResult.diagWifi.equals("VRAI"))) {
                mesResult.typeMes = "MES 1/2/3 P";
            } else if (isMatLivOui && !isSpecialOffre && !mesResult.questionTv.isEmpty()) {
                mesResult.typeMes = "Branchement IAD (Voir QUESTION TV)";
            } else if (isMatLivOui && !isSpecialOffre && mesResult.questionTv.isEmpty()) {
                mesResult.typeMes = "Branchement IAD TV";
            } else {
                mesResult.typeMes = "";
            }
        }

        boolean forceMt5 = false;
        if ("Branchement IAD TV".equals(mesResult.typeMes) && "NOK".equalsIgnoreCase(mesResult.tv)) {
            mesResult.typeMes = "Branchement IAD";
            forceMt5 = true;
        }

        mesResult.typeMes123p = "";
        if ("MES 1/2/3 P".equals(mesResult.typeMes)) {
            if (!mesResult.internet.isEmpty() || !mesResult.phone.isEmpty() || !mesResult.tv.isEmpty()) {
                int okCount = 0;
                if ("OK".equalsIgnoreCase(mesResult.internet)) okCount++;
                if ("OK".equalsIgnoreCase(mesResult.phone)) okCount++;
                if ("OK".equalsIgnoreCase(mesResult.tv)) okCount++;

                if (okCount <= 1) mesResult.typeMes123p = "1P";
                else if (okCount == 2) mesResult.typeMes123p = "2P";
                else mesResult.typeMes123p = "3P";
            }
        }

        mesResult.mt = 0;
        switch (mesResult.typeMes) {
            case "Branchement IAD TV":
                mesResult.mt = 10;
                break;
            case "Branchement IAD":
            case "Branchement IAD (Voir QUESTION TV)":
            case "Branchement IAD (Voir offre)":
                mesResult.mt = 5;
                break;
            case "MES 1/2/3 P":
                if ("1P".equals(mesResult.typeMes123p)) mesResult.mt = 20;
                else if ("2P".equals(mesResult.typeMes123p)) mesResult.mt = 21;
                else if ("3P".equals(mesResult.typeMes123p)) mesResult.mt = 24;
                break;
        }

        mesResult.mtPlusDiagWifi = mesResult.mt;
        if ("VRAI".equals(mesResult.diagWifi) && isMatLivOui) {
            mesResult.mtPlusDiagWifi += 10;
        }

        if (forceMt5) {
            mesResult.mt = 5;
            mesResult.mtPlusDiagWifi = 5;
        }

        return mesResult;
    }

    /**
     * Khllina had la méthode kheddama bash l-Controller dyalek ma-y-dirch erreur d'compilation!
     * Kat-rje3 Map khawya hit FactureMasterService ghay-3emmerha f' Single-Pass!
     */
    public Map<String, MesResult> processMesData(
            MultipartFile fichierA, Map<String, String> diagWifiMap,
            Map<String, QaProcessorService.QaData> qaMap,
            Map<String, String> offreMap) throws Exception {
        // Zero I/O overhead! L-calcul ghay-ddir f' FactureMasterService f' merra we7da
        return new HashMap<>(32768);
    }
}