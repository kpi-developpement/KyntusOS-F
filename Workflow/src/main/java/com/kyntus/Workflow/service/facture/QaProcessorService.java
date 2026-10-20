package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class QaProcessorService {

    public static class QaData {
        public String mesQuest = "";
        public String matLiv = "";
        public String questionTv = "";
    }

    public Map<String, QaData> processQaFile(MultipartFile file) throws Exception {
        Map<String, QaData> qaDataMap = new HashMap<>(32768);

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            if (headerRow == null) throw new Exception("Le fichier QA est vide.");

            int colInter = -1, colQuestionName = -1, colReponse = -1;

            for (Cell cell : headerRow) {
                String headerName = cell.getStringCellValue().trim().toUpperCase();
                if (headerName.contains("INTERVENTION")) colInter = cell.getColumnIndex();
                else if (headerName.contains("QUESTION NAME")) colQuestionName = cell.getColumnIndex();
                else if (headerName.contains("RÉPONSE") || headerName.contains("REPONSE")) colReponse = cell.getColumnIndex();
            }

            int lastRow = sheet.getLastRowNum();
            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellInter = safeGetCell(row, colInter);
                Cell cellQuestionName = safeGetCell(row, colQuestionName);
                if (cellInter == null || cellQuestionName == null) continue;

                String intervention = getCellValueAsString(cellInter).trim();
                String questionName = getCellValueAsString(cellQuestionName).trim();
                if (intervention.isEmpty() || questionName.isEmpty()) continue;

                String reponse = getCellValueAsString(safeGetCell(row, colReponse)).trim();
                QaData qaData = qaDataMap.computeIfAbsent(intervention, k -> new QaData());

                if ("Message_Mise_en_service".equalsIgnoreCase(questionName)) {
                    qaData.mesQuest = "Message_Mise_en_service";
                } else if ("Q_Client_Recuperation_Equipement".equalsIgnoreCase(questionName)) {
                    if (!qaData.matLiv.startsWith("OUI")) {
                        if (reponse.contains("{") && reponse.contains("error_message")) {
                            qaData.matLiv = "OUI !!!";
                        } else if (reponse.isEmpty() || "n/a".equalsIgnoreCase(reponse)) {
                            qaData.matLiv = "OUI";
                        } else {
                            qaData.matLiv = reponse.toUpperCase();
                        }
                    }
                } else {
                    qaData.questionTv = "n/a".equalsIgnoreCase(reponse) ? "" : reponse;
                }
            }
        }
        return qaDataMap;
    }

    private Cell safeGetCell(Row row, int colIndex) {
        if (colIndex < 0 || row == null) return null;
        return row.getCell(colIndex);
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        CellType type = cell.getCellType();
        if (type == CellType.STRING) return cell.getStringCellValue();
        if (type == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        if (type == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
        return cell.toString();
    }
}