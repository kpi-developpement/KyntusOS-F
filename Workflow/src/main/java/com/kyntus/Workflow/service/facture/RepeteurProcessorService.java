package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class RepeteurProcessorService {

    /**
     * 🚀 PROCESS REPETEUR (Validation CR):
     * Kay-qra l-fichier, kay-7seb ch7al mn IMEI kayna, w kay-derbha f' 13.
     * Kay-reje3 Map<Intervention, Montant (MT)>
     */
    public Map<String, String> processRepeteurFile(MultipartFile file) throws Exception {
        Map<String, String> repeteurDataMap = new HashMap<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            if (headerRow == null) throw new Exception("Le fichier Validation CR (Repeteur) est vide.");

            // 1. N-qellbou 3la l-Indices dyal les colonnes
            int colIntervention = -1;
            int colImeis = -1;

            for (Cell cell : headerRow) {
                String headerName = cell.getStringCellValue().trim().toUpperCase();
                if (headerName.contains("INTERVENTION")) {
                    colIntervention = cell.getColumnIndex();
                } else if (headerName.contains("IMEIS RÉPÉTEURS") || headerName.contains("IMEIS REPETEURS")) {
                    colImeis = cell.getColumnIndex();
                }
            }

            if (colIntervention == -1 || colImeis == -1) {
                throw new Exception("Colonnes manquantes (Intervention, IMEIs répéteurs).");
            }

            // 2. N-dourou 3la les lignes
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellIntervention = row.getCell(colIntervention);
                Cell cellImeis = row.getCell(colImeis);

                if (cellIntervention == null) continue;

                String intervention = getCellValueAsString(cellIntervention).trim();
                if (intervention.isEmpty()) continue;

                String imeisString = getCellValueAsString(cellImeis).trim();

                // 🧠 L-MANTIQ DYAL L-CALCUL (Count * 13) 🧠
                int montant = 0;

                // N-t2kkdou blli l-khalya machi khawya w machi fiha ghir tiret "-"
                if (!imeisString.isEmpty() && !imeisString.equals("-") && !imeisString.equalsIgnoreCase("null")) {
                    // N-qesmou l-text b' l-fasila (comma)
                    String[] imeiArray = imeisString.split(",");
                    int validImeiCount = 0;

                    for (String imei : imeiArray) {
                        // N-7iydou l-3ilamat l-khrin b7al l-apostrophe (') awla espace
                        String cleanImei = imei.replaceAll("[^0-9a-zA-Z]", "").trim();
                        // Ila bqa fih ar9am (matalan kber mn 3 7rouf), n-7esbouh IMEI d-bsa7
                        if (cleanImei.length() > 3) {
                            validImeiCount++;
                        }
                    }
                    montant = validImeiCount * 13;
                }

                // N-sauviw f' l-Map (Wakhaa y-koun 0 n-sauviwh bash y-ban f' l-Facture)
                // Awla ila bghiti n-sauviw ghir li fihom > 0, t-qder d-dir if (montant > 0)
                if (montant > 0) {
                    repeteurDataMap.put(intervention, String.valueOf(montant));
                }
            }
        }

        return repeteurDataMap;
    }

    // ====================================================================================
    // 🛠️ METHODES DE SUPPORT
    // ====================================================================================

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) {
            // Bash may-3tinash l-arqam b' l-format scientifique (e.g. 3.23E14)
            long val = (long) cell.getNumericCellValue();
            return String.valueOf(val);
        }
        return cell.toString();
    }
}