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
        Map<String, QaData> qaDataMap = new HashMap<>();

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

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellInter = safeGetCell(row, colInter);
                Cell cellQuestionName = safeGetCell(row, colQuestionName);
                Cell cellReponse = safeGetCell(row, colReponse);

                if (cellInter == null || cellQuestionName == null) continue;

                String intervention = getCellValueAsString(cellInter).trim();
                String questionName = getCellValueAsString(cellQuestionName).trim();
                String reponse = getCellValueAsString(cellReponse).trim();

                if (intervention.isEmpty() || questionName.isEmpty()) continue;

                QaData qaData = qaDataMap.getOrDefault(intervention, new QaData());

                // 🧠 L-MANTIQ DYAL QA (M-nqqi mn l-Jder) 🧠
                if (questionName.equalsIgnoreCase("Message_Mise_en_service")) {
                    qaData.mesQuest = "Message_Mise_en_service";

                } else if (questionName.equalsIgnoreCase("Q_Client_Recuperation_Equipement")) {
                    // 🔥 NETTOYAGE DYAL MAT LIV 🔥
                    String cleanedMatLiv = reponse;

                    if (cleanedMatLiv.contains("{") && cleanedMatLiv.contains("error_message")) {
                        cleanedMatLiv = "OUI !!!";
                    } else if (cleanedMatLiv.equalsIgnoreCase("n/a") || cleanedMatLiv.isEmpty()) {
                        cleanedMatLiv = "OUI";
                    } else {
                        cleanedMatLiv = cleanedMatLiv.toUpperCase();
                    }

                    // Priorité l' OUI w OUI !!! (May-t-ecrasach b' NON)
                    if (!qaData.matLiv.startsWith("OUI")) {
                        qaData.matLiv = cleanedMatLiv;
                    }

                } else {
                    // 🔥 NETTOYAGE DYAL LES AUTRES (TV) 🔥
                    if (reponse.equalsIgnoreCase("n/a")) {
                        qaData.questionTv = "";
                    } else {
                        qaData.questionTv = reponse;
                    }
                }

                qaDataMap.put(intervention, qaData);
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
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        if (cell.getCellType() == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
        return cell.toString();
    }
}