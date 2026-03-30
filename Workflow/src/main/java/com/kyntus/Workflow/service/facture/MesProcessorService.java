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

    public static class MesResult {
        public String codeInter, diagWifi, matLiv, mesQuest, libelleOffre, questionTv;
        public String typeMes, typeMes123p, internet, phone, tv, codeInterDup;
        public int mt, mtPlusDiagWifi;
    }

    private Row findHeaderRow(Sheet sheet) {
        for (int i = 0; i < 10; i++) {
            Row row = sheet.getRow(i);
            if (row != null) {
                for (Cell cell : row) {
                    if (cell.getCellType() == CellType.STRING) {
                        String val = cell.getStringCellValue().trim().toUpperCase();
                        if (val.equals("CODE_INTER") || val.equals("ETAT")) return row;
                    }
                }
            }
        }
        return sheet.getRow(0);
    }

    private Cell safeGetCell(Row row, int colIndex) {
        if (colIndex < 0 || row == null) return null;
        return row.getCell(colIndex);
    }

    public Map<String, MesResult> processMesData(
            MultipartFile fichierA, Map<String, String> diagWifiMap,
            Map<String, QaProcessorService.QaData> qaMap,
            Map<String, String> offreMap) throws Exception { // 👈 Zidna offreMap hna

        Map<String, MesResult> mesDataMap = new HashMap<>();

        try (InputStream is = fichierA.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = findHeaderRow(sheet);
            int startRow = headerRow.getRowNum() + 1;

            int colInter = -1, colEtat = -1, colOffreA = -1;
            int colInternet = -1, colPhone = -1, colTv = -1;

            for (Cell cell : headerRow) {
                String header = cell.getStringCellValue().trim().toUpperCase();
                if (header.equals("CODE_INTER")) colInter = cell.getColumnIndex();
                else if (header.equals("ETAT")) colEtat = cell.getColumnIndex();
                else if (header.equals("LIBELLE") || header.equals("LIBELLÉ DE L'OFFRE")) colOffreA = cell.getColumnIndex();
                else if (header.equals("INTERNET_STATUS")) colInternet = cell.getColumnIndex();
                else if (header.equals("PHONE_STATUS")) colPhone = cell.getColumnIndex();
                else if (header.equals("TV_STATUS")) colTv = cell.getColumnIndex();
            }

            for (int i = startRow; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellInter = safeGetCell(row, colInter);
                Cell cellEtat = safeGetCell(row, colEtat);
                if (cellInter == null || cellEtat == null) continue;

                String codeInter = getCellValueAsString(cellInter).trim();
                String etat = getCellValueAsString(cellEtat).trim().toUpperCase();

                if (!etat.equals("TERMINEE_OK")) continue;

                // 🔥 L-LIBELLÉ MN FICHIER INTERVENTION (Ila malqahash, kay-rje3 dyal A) 🔥
                String libelleOffreA = getCellValueAsString(safeGetCell(row, colOffreA)).trim();
                String libelleOffre = offreMap.getOrDefault(codeInter, libelleOffreA);

                QaProcessorService.QaData qaData = qaMap.getOrDefault(codeInter, new QaProcessorService.QaData());

                MesResult mesResult = new MesResult();
                mesResult.codeInter = codeInter;
                mesResult.codeInterDup = codeInter;
                mesResult.libelleOffre = libelleOffre; // 👈 100% Nadi
                mesResult.internet = getCellValueAsString(safeGetCell(row, colInternet)).trim();
                mesResult.phone = getCellValueAsString(safeGetCell(row, colPhone)).trim();
                mesResult.tv = getCellValueAsString(safeGetCell(row, colTv)).trim();
                mesResult.diagWifi = diagWifiMap.getOrDefault(codeInter, "FAUX");

                mesResult.mesQuest = qaData.mesQuest;
                mesResult.questionTv = qaData.questionTv;
                mesResult.matLiv = qaData.matLiv.isEmpty() ? "OUI" : qaData.matLiv;

                String offreLower = libelleOffre.toLowerCase();
                boolean isSpecialOffre = offreLower.contains("fit") || offreLower.contains("b&you") ||
                        offreLower.contains("byou") || offreLower.contains("-26 ans") ||
                        offreLower.contains("asso");
                boolean isMatLivOui = mesResult.matLiv.equals("OUI") || mesResult.matLiv.equals("OUI !!!");

                // Calcul dyal TYPE MES
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

                // 🔥 L-QALEB JDID DYAL TV = NOK 🔥
                if ("Branchement IAD TV".equals(mesResult.typeMes)) {
                    if ("NOK".equalsIgnoreCase(mesResult.tv)) {
                        mesResult.typeMes = "Branchement IAD"; // Bddelna Smiya
                    }
                }

                // TYPE MES 1P/2P/3P
                mesResult.typeMes123p = "";
                if ("MES 1/2/3 P".equals(mesResult.typeMes)) {
                    if (mesResult.internet.isEmpty() && mesResult.phone.isEmpty() && mesResult.tv.isEmpty()) {
                        mesResult.typeMes123p = "";
                    } else {
                        int okCount = 0;
                        if (mesResult.internet.equalsIgnoreCase("OK")) okCount++;
                        if (mesResult.phone.equalsIgnoreCase("OK")) okCount++;
                        if (mesResult.tv.equalsIgnoreCase("OK")) okCount++;

                        if (okCount <= 1) mesResult.typeMes123p = "1P";
                        else if (okCount == 2) mesResult.typeMes123p = "2P";
                        else if (okCount == 3) mesResult.typeMes123p = "3P";
                    }
                }

                // 🔥 MT Y-T-7SEB M3A TV=NOK 🔥
                mesResult.mt = 0;
                if ("Branchement IAD TV".equals(mesResult.typeMes)) mesResult.mt = 10;
                else if ("Branchement IAD".equals(mesResult.typeMes)) mesResult.mt = 5; // 👈 Ghat-7et 5DH
                else if ("Branchement IAD (Voir QUESTION TV)".equals(mesResult.typeMes)) mesResult.mt = 5;
                else if ("Branchement IAD (Voir offre)".equals(mesResult.typeMes)) mesResult.mt = 5;
                else if ("MES 1/2/3 P".equals(mesResult.typeMes)) {
                    if ("1P".equals(mesResult.typeMes123p)) mesResult.mt = 20;
                    else if ("2P".equals(mesResult.typeMes123p)) mesResult.mt = 21;
                    else if ("3P".equals(mesResult.typeMes123p)) mesResult.mt = 24;
                }

                mesResult.mtPlusDiagWifi = mesResult.mt;
                if ("VRAI".equals(mesResult.diagWifi) && isMatLivOui) {
                    mesResult.mtPlusDiagWifi += 10;
                }

                mesDataMap.put(codeInter, mesResult);
            }
        }
        return mesDataMap;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        return cell.toString();
    }
}