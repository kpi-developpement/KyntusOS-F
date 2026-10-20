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
        Map<String, String> offreMap = new HashMap<>(32768);

        if (file == null || file.isEmpty()) return offreMap;

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return offreMap;

            int colInter = -1, colOffre = -1;

            for (Cell cell : headerRow) {
                String header = cell.getStringCellValue().trim().toUpperCase();
                if (header.contains("INTERVENTION") || header.equals("NOM") || header.equals("NUMBER") || header.equals("ID RDV") || header.contains("RDV")) {
                    colInter = cell.getColumnIndex();
                } else if (header.contains("LIBELLÉ DE L'OFFRE") || header.contains("LIBELLE OFFRE") || header.contains("LIBELLE DE L'OFFRE") || header.equals("LIBELLE") || header.contains("OFFRE")) {
                    colOffre = cell.getColumnIndex();
                }
            }

            if (colInter == -1 || colOffre == -1) {
                return offreMap;
            }

            int lastRow = sheet.getLastRowNum();
            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellInter = safeGetCell(row, colInter);
                if (cellInter == null) continue;

                String intervention = getCellValueAsString(cellInter).trim();
                if (!intervention.isEmpty()) {
                    Cell cellOffre = safeGetCell(row, colOffre);
                    String offre = (cellOffre == null) ? "" : getCellValueAsString(cellOffre).trim();
                    offreMap.put(intervention, offre);
                }
            }
        }
        return offreMap;
    }

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