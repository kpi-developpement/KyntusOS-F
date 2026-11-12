package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

@Service
public class InterventionProcessorService {

    public Map<String, String> processInterventionFile(MultipartFile file) throws Exception {
        Map<String, String> offreMap = new HashMap<>(32768);

        if (file == null || file.isEmpty()) return offreMap;

        // ⚡ STREAMING : RAM constante
        try (InputStream is = file.getInputStream();
             Workbook workbook = FactureStreamSupport.open(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) return offreMap;
            Row headerRow = rows.next();

            int colInter = -1, colOffre = -1;

            for (Cell cell : headerRow) {
                String header = FactureStreamSupport.cellToString(cell).trim().toUpperCase();
                if (header.contains("INTERVENTION") || header.equals("NOM") || header.equals("NUMBER") || header.equals("ID RDV") || header.contains("RDV")) {
                    colInter = cell.getColumnIndex();
                } else if (header.contains("LIBELLÉ DE L'OFFRE") || header.contains("LIBELLE OFFRE") || header.contains("LIBELLE DE L'OFFRE") || header.equals("LIBELLE") || header.contains("OFFRE")) {
                    colOffre = cell.getColumnIndex();
                }
            }

            if (colInter == -1 || colOffre == -1) {
                return offreMap;
            }

            while (rows.hasNext()) {
                Row row = rows.next();
                if (row == null) continue;

                Cell cellInter = FactureStreamSupport.safeCell(row, colInter);
                if (cellInter == null) continue;

                String intervention = FactureStreamSupport.cellToString(cellInter).trim();
                if (!intervention.isEmpty()) {
                    Cell cellOffre = FactureStreamSupport.safeCell(row, colOffre);
                    String offre = (cellOffre == null) ? "" : FactureStreamSupport.cellToString(cellOffre).trim();
                    offreMap.put(intervention, offre);
                }
            }
        }
        return offreMap;
    }
}
