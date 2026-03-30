package com.kyntus.Workflow.service.ventilation;

import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.dhatim.fastexcel.reader.Row;
import org.dhatim.fastexcel.reader.Sheet;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Stream;

@Service
public class VentilationExcelParser {

    /**
     * 🚀 Qraya Dynamique w Dkiya : Kat-qelleb GHIR 3la l-wriqa li fiha l-Colonnes s-s7a7.
     */
    public Map<String, List<Map<String, String>>> parseAllSheets(MultipartFile file) throws Exception {
        Map<String, List<Map<String, String>>> result = new HashMap<>();

        try (InputStream is = file.getInputStream();
             ReadableWorkbook wb = new ReadableWorkbook(is)) {

            for (Sheet sheet : wb.getSheets().toList()) {
                String sheetName = sheet.getName();
                List<Map<String, String>> sheetData = new ArrayList<>();

                try (Stream<Row> rowStream = sheet.openStream()) {
                    Iterator<Row> rowIterator = rowStream.iterator();

                    if (!rowIterator.hasNext()) continue;

                    // 1. Qraya dyal l-Header
                    Row headerRow = rowIterator.next();
                    List<String> headers = new ArrayList<>();
                    boolean isTargetSheet = false;

                    for (int i = 0; i < headerRow.getCellCount(); i++) {
                        String colName = headerRow.getCellText(i);
                        String cleanName = colName != null && !colName.trim().isEmpty() ? colName.trim() : "COL_" + i;
                        headers.add(cleanName);

                        // 🔥 L-FILTRE DKII 🔥 : Kan-t2ekdou wach hada howa l-fichier d-bsa7
                        if (cleanName.equalsIgnoreCase("CODE_INTER") || cleanName.equalsIgnoreCase("Mt SST")) {
                            isTargetSheet = true;
                        }
                    }

                    // Ila l-Wriqa mafihash had l-colonnes, نقّزها (Skip) w douz l-wriqa jaya
                    if (!isTargetSheet) {
                        continue;
                    }

                    // 2. Qraya dyal les Lignes (Ghir dyal l-wriqa s-s7i7a)
                    while (rowIterator.hasNext()) {
                        Row row = rowIterator.next();
                        Map<String, String> rowData = new LinkedHashMap<>();
                        boolean isEmpty = true;

                        for (int i = 0; i < headers.size(); i++) {
                            String val = (i < row.getCellCount()) ? row.getCellText(i) : "";
                            String cleanVal = (val != null) ? val.trim() : "";

                            if (!cleanVal.isEmpty()) isEmpty = false;

                            rowData.put(headers.get(i), cleanVal);
                        }

                        if (!isEmpty) {
                            sheetData.add(rowData);
                        }
                    }
                }

                // Ila qrina l-wriqa s-s7i7a, kan-zidouha f-resultat
                if (!sheetData.isEmpty()) {
                    result.put(sheetName, sheetData);
                }
            }
        }
        return result;
    }
}