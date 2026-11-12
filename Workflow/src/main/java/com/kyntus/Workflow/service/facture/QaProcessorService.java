package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Iterator;
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

        // ⚡ STREAMING : ma-b9ach XSSFWorkbook li kan kay-7ett l-fichier kamel f r-RAM
        try (InputStream is = file.getInputStream();
             Workbook workbook = FactureStreamSupport.open(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) throw new Exception("Le fichier QA est vide.");
            Row headerRow = rows.next();

            int colInter = -1, colQuestionName = -1, colReponse = -1;

            for (Cell cell : headerRow) {
                String headerName = FactureStreamSupport.cellToString(cell).trim().toUpperCase();
                if (headerName.contains("INTERVENTION")) colInter = cell.getColumnIndex();
                else if (headerName.contains("QUESTION NAME")) colQuestionName = cell.getColumnIndex();
                else if (headerName.contains("RÉPONSE") || headerName.contains("REPONSE")) colReponse = cell.getColumnIndex();
            }

            while (rows.hasNext()) {
                Row row = rows.next();
                if (row == null) continue;

                Cell cellInter = FactureStreamSupport.safeCell(row, colInter);
                Cell cellQuestionName = FactureStreamSupport.safeCell(row, colQuestionName);
                if (cellInter == null || cellQuestionName == null) continue;

                String intervention = FactureStreamSupport.cellToString(cellInter).trim();
                String questionName = FactureStreamSupport.cellToString(cellQuestionName).trim();
                if (intervention.isEmpty() || questionName.isEmpty()) continue;

                String reponse = FactureStreamSupport.cellToString(
                        FactureStreamSupport.safeCell(row, colReponse)).trim();
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
}
