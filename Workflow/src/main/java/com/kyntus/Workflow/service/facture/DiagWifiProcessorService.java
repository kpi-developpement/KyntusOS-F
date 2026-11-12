package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

@Service
public class DiagWifiProcessorService {

    public Map<String, String> processDiagWifiFile(MultipartFile file) throws Exception {
        Map<String, Boolean> tempMap = new HashMap<>(32768);

        // ⚡ STREAMING : RAM constante, mahma kbar l-fichier
        try (InputStream is = file.getInputStream();
             Workbook workbook = FactureStreamSupport.open(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) throw new Exception("Le fichier Diag Wifi est vide.");
            Row headerRow = rows.next();

            int colIntervention = -1;
            int colDiagRealise = -1;

            for (Cell cell : headerRow) {
                String headerName = FactureStreamSupport.cellToString(cell).trim().toUpperCase();
                if (headerName.contains("INTERVENTION")) {
                    colIntervention = cell.getColumnIndex();
                } else if (headerName.contains("DIAGNOSTIC WIFI RÉALISÉ") || headerName.contains("DIAGNOSTIC WIFI REALISE")) {
                    colDiagRealise = cell.getColumnIndex();
                }
            }

            if (colIntervention == -1 || colDiagRealise == -1) {
                throw new Exception("Colonnes manquantes dans le fichier Diag Wifi (Intervention, Diagnostic WiFi réalisé).");
            }

            while (rows.hasNext()) {
                Row row = rows.next();
                if (row == null) continue;

                Cell cellIntervention = FactureStreamSupport.safeCell(row, colIntervention);
                if (cellIntervention == null) continue;

                String intervention = FactureStreamSupport.cellToString(cellIntervention).trim();
                if (intervention.isEmpty()) continue;

                boolean isRealise = getCellValueAsBoolean(FactureStreamSupport.safeCell(row, colDiagRealise));
                Boolean existing = tempMap.get(intervention);
                if (existing == null || (!existing && isRealise)) {
                    tempMap.put(intervention, isRealise);
                }
            }
        }

        Map<String, String> finalResultMap = new HashMap<>(tempMap.size() * 4 / 3 + 1);
        for (Map.Entry<String, Boolean> entry : tempMap.entrySet()) {
            finalResultMap.put(entry.getKey(), entry.getValue() ? "VRAI" : "FAUX");
        }

        return finalResultMap;
    }

    private boolean getCellValueAsBoolean(Cell cell) {
        if (cell == null) return false;
        CellType type = cell.getCellType();
        if (type == CellType.BOOLEAN) {
            return cell.getBooleanCellValue();
        } else if (type == CellType.STRING) {
            String val = cell.getStringCellValue().trim();
            return val.equalsIgnoreCase("TRUE") || val.equalsIgnoreCase("VRAI") || val.equalsIgnoreCase("OUI") || val.equals("1");
        } else if (type == CellType.NUMERIC) {
            return cell.getNumericCellValue() == 1.0;
        }
        return false;
    }
}
