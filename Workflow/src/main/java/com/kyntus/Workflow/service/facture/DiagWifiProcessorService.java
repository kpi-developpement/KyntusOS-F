package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class DiagWifiProcessorService {

    /**
     * 🚀 PROCESS DIAG WIFI: Kay-qra l-fichier, kay-gérer les doublons b' Logical OR,
     * w kay-reje3 Map<Intervention, "VRAI" ou "FAUX">
     */
    public Map<String, String> processDiagWifiFile(MultipartFile file) throws Exception {
        // Hna ghan-khedmou b' Boolean bash y-jina sahel f' l-Calcul dyal (True || False)
        Map<String, Boolean> tempMap = new HashMap<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            if (headerRow == null) throw new Exception("Le fichier Diag Wifi est vide.");

            // 1. N-qellbou 3la l-Indices dyal les colonnes
            int colIntervention = -1;
            int colDiagRealise = -1;

            for (Cell cell : headerRow) {
                String headerName = cell.getStringCellValue().trim().toUpperCase();
                if (headerName.contains("INTERVENTION")) {
                    colIntervention = cell.getColumnIndex();
                } else if (headerName.contains("DIAGNOSTIC WIFI RÉALISÉ") || headerName.contains("DIAGNOSTIC WIFI REALISE")) {
                    colDiagRealise = cell.getColumnIndex();
                }
            }

            if (colIntervention == -1 || colDiagRealise == -1) {
                throw new Exception("Colonnes manquantes dans le fichier Diag Wifi (Intervention, Diagnostic WiFi réalisé).");
            }

            // 2. N-dourou 3la les lignes
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellIntervention = row.getCell(colIntervention);
                Cell cellDiag = row.getCell(colDiagRealise);

                if (cellIntervention == null) continue;

                String intervention = getCellValueAsString(cellIntervention).trim();
                if (intervention.isEmpty()) continue;

                boolean isRealise = getCellValueAsBoolean(cellDiag);

                // 🧠 THE GRAND MASTER LOGIC (LOGICAL OR) 🧠
                // Ila kant l-Intervention kayna f' l-Map, ghadi n-diro l-Valeur l-qdima || l-Valeur j-jdida.
                // Ila makantch, getOrDefault ghat-3tiha false f-lwel.
                tempMap.put(intervention, tempMap.getOrDefault(intervention, false) || isRealise);
            }
        }

        // 3. N-trjmou l-Boolean l-Format l-m-tloub ("VRAI" awla "FAUX") bash y-mchi l-Fichier A
        Map<String, String> finalResultMap = new HashMap<>();
        for (Map.Entry<String, Boolean> entry : tempMap.entrySet()) {
            finalResultMap.put(entry.getKey(), entry.getValue() ? "VRAI" : "FAUX");
        }

        return finalResultMap;
    }

    // ====================================================================================
    // 🛠️ METHODES DE SUPPORT (Helpers)
    // ====================================================================================

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        return cell.toString();
    }

    /**
     * 🔍 Kay-qra l-Cellule w kay-reje3 Boolean d-bsa7 wakha y-koun m-ktoub String f' Excel
     */
    private boolean getCellValueAsBoolean(Cell cell) {
        if (cell == null) return false;

        if (cell.getCellType() == CellType.BOOLEAN) {
            return cell.getBooleanCellValue();
        } else if (cell.getCellType() == CellType.STRING) {
            String val = cell.getStringCellValue().trim().toUpperCase();
            return val.equals("TRUE") || val.equals("VRAI") || val.equals("OUI") || val.equals("1");
        } else if (cell.getCellType() == CellType.NUMERIC) {
            return cell.getNumericCellValue() == 1.0;
        }
        return false;
    }
}