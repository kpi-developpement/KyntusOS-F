package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class InterventionProcessorService {

    public Map<String, String> processInterventionFile(MultipartFile file) throws Exception {
        Map<String, String> offreMap = new HashMap<>();

        if (file == null || file.isEmpty()) return offreMap;

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            if (headerRow == null) return offreMap;

            int colInter = -1, colOffre = -1;

            for (Cell cell : headerRow) {
                String header = cell.getStringCellValue().trim().toUpperCase();
                // 🔥 HNA ZEDNA "ID RDV" BASH Y-T3RREF 3LA L-COLONNE 🔥
                if (header.contains("INTERVENTION") || header.equals("NOM") || header.equals("NUMBER") || header.equals("ID RDV") || header.contains("RDV")) {
                    colInter = cell.getColumnIndex();
                }
                else if (header.contains("LIBELLÉ DE L'OFFRE") || header.contains("LIBELLE OFFRE") || header.contains("LIBELLE DE L'OFFRE") || header.equals("LIBELLE") || header.contains("OFFRE")) {
                    colOffre = cell.getColumnIndex();
                }
            }

            // Ila malqa 7etta we7da, y-rje3 Map khawya
            if (colInter == -1 || colOffre == -1) {
                System.err.println("⚠️ [ATTENTION] Colonnes 'Id RDV' ou 'Libellé de l'offre' introuvables dans le fichier Intervention !");
                return offreMap;
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellInter = safeGetCell(row, colInter);
                Cell cellOffre = safeGetCell(row, colOffre);

                if (cellInter == null || cellOffre == null) continue;

                String intervention = getCellValueAsString(cellInter).trim();
                String offre = getCellValueAsString(cellOffre).trim();

                if (!intervention.isEmpty() && !offre.isEmpty()) {
                    offreMap.put(intervention, offre); // Daba ghat-sayva nishan!
                }
            }
        }
        return offreMap;
    }

    // 🛡️ Safe Get Cell (Anti-Crash)
    private Cell safeGetCell(Row row, int colIndex) {
        if (colIndex < 0 || row == null) return null;
        return row.getCell(colIndex);
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        return cell.toString();
    }
}