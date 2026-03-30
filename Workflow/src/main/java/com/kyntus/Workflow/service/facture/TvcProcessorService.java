package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TvcProcessorService {

    /**
     * 🚀 PROCESS TVC: Kay-qra .xlsx, kay-cherchem les conditions, w kay-reje3 Map<Intervention, Typologie>
     */
    public Map<String, String> processTvcFile(MultipartFile file) throws Exception {
        Map<String, String> tvcDataMap = new HashMap<>();

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            if (headerRow == null) throw new Exception("Le fichier TVC est vide.");

            // 1. N-qellbou 3la l-Indices dyal les colonnes (Dynamic)
            int colIntervention = -1, colDuree = -1, colAnalyse = -1, colMetrage = -1;

            for (Cell cell : headerRow) {
                String headerName = cell.getStringCellValue().trim().toUpperCase();
                if (headerName.contains("INTERVENTION")) colIntervention = cell.getColumnIndex();
                else if (headerName.contains("DURÉE") || headerName.contains("DUREE")) colDuree = cell.getColumnIndex();
                else if (headerName.contains("ANALYSE")) colAnalyse = cell.getColumnIndex();
                else if (headerName.contains("METRAGE BY MAPS")) colMetrage = cell.getColumnIndex();
            }

            if (colIntervention == -1 || colDuree == -1 || colAnalyse == -1 || colMetrage == -1) {
                throw new Exception("Colonnes manquantes dans le fichier TVC (Intervention, Durée, Analyse, Metrage By Maps).");
            }

            // 2. N-dourou 3la les lignes
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellIntervention = row.getCell(colIntervention);
                Cell cellAnalyse = row.getCell(colAnalyse);
                Cell cellDuree = row.getCell(colDuree);
                Cell cellMetrage = row.getCell(colMetrage);

                if (cellIntervention == null || cellAnalyse == null) continue;

                String intervention = getCellValueAsString(cellIntervention);
                String analyse = getCellValueAsString(cellAnalyse).trim().toLowerCase();

                // 🛑 CONDITION 1: Khassha t-koun "conforme"
                if (!analyse.equals("conforme")) continue;

                // 🛑 CONDITION 2: L-Background ma-khassouch y-koun Sfer (Yellow)
                if (isCellYellow(cellAnalyse)) continue; // "ela kan yellow background ... ade ngle3 ligne kaml"

                // 📐 PARSING DYAL L-DATA
                double dureeHours = parseDureeToHours(cellDuree);
                int metrage = parseMetrage(cellMetrage);

                // 🛑 CONDITION 3 & 4: Suppressions (Gle3 l-Ligne)
                if (metrage > 1000) continue; // "ela deppasa 1000 f METRAGE BY MAPS ta heya yetem7a"
                if (dureeHours < 4 && metrage < 150) continue; // "ela kan 9el b 4h w 9el b 150 m , ta heya nemse7ha"

                // ✅ CONDITION 5: L-Calcul dyal Typologie
                String typologie = "";
                if (dureeHours >= 4) {
                    typologie = "Durée"; // "ela kanet + 4h f colone durée... nstockif feha durée" (w kat-cover 7ta condition dyal Metrage < 150 w Duree > 4h)
                } else if (dureeHours < 4 && metrage >= 150) {
                    typologie = "Longueur"; // "wela kanet 9el b 4h w kanet + 150 dik sa3a typologie ade ndir feha Longeur"
                }

                // 💾 N-sauviw f' l-Map ila lqina Typologie
                if (!typologie.isEmpty()) {
                    tvcDataMap.put(intervention, typologie);
                }
            }
        }
        return tvcDataMap;
    }

    // ====================================================================================
    // 🛠️ METHODES DE SUPPORT (Helpers)
    // ====================================================================================

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue();
            case NUMERIC: return String.valueOf(cell.getNumericCellValue());
            default: return cell.toString();
        }
    }

    /**
     * 🔍 Kay-qleb 3la l-Raqam wst l-text (Matalan "131 m" -> 131)
     */
    private int parseMetrage(Cell cell) {
        if (cell == null) return 0;
        String val = getCellValueAsString(cell);
        Matcher matcher = Pattern.compile("(\\d+)").matcher(val);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 0;
    }

    /**
     * ⏰ Kay-reje3 l-weqt b' s-Swaye3 (Matalan "04:30:00" -> 4.5 hours)
     */
    private double parseDureeToHours(Cell cell) {
        if (cell == null) return 0.0;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            // F' Excel l-Heure kat-tqra Date (fraction of day)
            return cell.getDateCellValue().getHours() + (cell.getDateCellValue().getMinutes() / 60.0);
        } else {
            // Ila kant String "04:30:00"
            String val = getCellValueAsString(cell);
            String[] parts = val.split(":");
            if (parts.length >= 2) {
                try {
                    return Integer.parseInt(parts[0]) + (Integer.parseInt(parts[1]) / 60.0);
                } catch (NumberFormatException e) {
                    return 0.0;
                }
            }
        }
        return 0.0;
    }

    /**
     * 🟨 Kay-verifi wach l-Background dyal Cellul Sfer (Yellow)
     */
    private boolean isCellYellow(Cell cell) {
        CellStyle style = cell.getCellStyle();
        if (style == null) return false;

        // Check 1: Indexed Colors dyal Excel (Yellow howa 13)
        short bgColorIndex = style.getFillForegroundColor();
        if (bgColorIndex == IndexedColors.YELLOW.getIndex()) return true;

        // Check 2: XSSFColor RGB Hex (FF FF 00)
        Color color = style.getFillForegroundColorColor();
        if (color instanceof XSSFColor) {
            byte[] rgb = ((XSSFColor) color).getRGB();
            if (rgb != null && rgb.length == 3) {
                // R=255 (-1 f' byte), G=255 (-1 f' byte), B=0
                if (rgb[0] == (byte) 255 && rgb[1] == (byte) 255 && rgb[2] == 0) {
                    return true;
                }
            }
        }
        return false;
    }
}