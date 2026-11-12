package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

@Service
public class RepeteurProcessorService {

    public Map<String, String> processRepeteurFile(MultipartFile file) throws Exception {
        Map<String, String> repeteurDataMap = new HashMap<>(16384);

        // ⚡ STREAMING : RAM constante
        try (InputStream is = file.getInputStream();
             Workbook workbook = FactureStreamSupport.open(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) throw new Exception("Le fichier Validation CR (Repeteur) est vide.");
            Row headerRow = rows.next();

            int colIntervention = -1;
            int colImeis = -1;

            for (Cell cell : headerRow) {
                String headerName = FactureStreamSupport.cellToString(cell).trim().toUpperCase();
                if (headerName.contains("INTERVENTION")) {
                    colIntervention = cell.getColumnIndex();
                } else if (headerName.contains("IMEIS RÉPÉTEURS") || headerName.contains("IMEIS REPETEURS")) {
                    colImeis = cell.getColumnIndex();
                }
            }

            if (colIntervention == -1 || colImeis == -1) {
                throw new Exception("Colonnes manquantes (Intervention, IMEIs répéteurs).");
            }

            while (rows.hasNext()) {
                Row row = rows.next();
                if (row == null) continue;

                Cell cellIntervention = FactureStreamSupport.safeCell(row, colIntervention);
                Cell cellImeis = FactureStreamSupport.safeCell(row, colImeis);
                if (cellIntervention == null) continue;

                String intervention = FactureStreamSupport.cellToString(cellIntervention).trim();
                if (intervention.isEmpty()) continue;

                String imeisString = FactureStreamSupport.cellToString(cellImeis).trim();

                if (!imeisString.isEmpty() && !"-".equals(imeisString) && !"null".equalsIgnoreCase(imeisString)) {
                    int validImeiCount = countValidImeisFast(imeisString);
                    if (validImeiCount > 0) {
                        repeteurDataMap.put(intervention, String.valueOf(validImeiCount * 13));
                    }
                }
            }
        }
        return repeteurDataMap;
    }

    // ⚡ Ultra-fast scanner bla Regex w bla String.split allocations
    private int countValidImeisFast(String s) {
        int validCount = 0;
        int currentAlnumCount = 0;
        int len = s.length();

        for (int i = 0; i < len; i++) {
            char c = s.charAt(i);
            if (c == ',') {
                if (currentAlnumCount > 3) validCount++;
                currentAlnumCount = 0;
            } else if (Character.isLetterOrDigit(c)) {
                currentAlnumCount++;
            }
        }
        if (currentAlnumCount > 3) validCount++;
        return validCount;
    }
}
