package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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

            int colIntervention = -1, colAnalyse = -1, colMetrage = -1;
            List<Integer> dureeCols = new ArrayList<>();

            System.out.println("🔍 [TVC PROCESSOR] Lecture des colonnes du fichier : " + file.getOriginalFilename());

            // 1. N-qellbou 3la les colonnes (Support dyal l-Qdim w Jdid)
            for (Cell cell : headerRow) {
                if (cell.getCellType() != CellType.STRING) continue;
                
                String headerName = cell.getStringCellValue().trim().toUpperCase();

                // INTERVENTION (Support: EPS, ID RDV, INTERVENTION, CODE_INTER, RDV)
                if (headerName.equals("EPS") || headerName.equals("ID RDV") || 
                    headerName.contains("INTERVENTION") || headerName.equals("CODE_INTER") || 
                    headerName.contains("RDV")) {
                    colIntervention = cell.getColumnIndex();
                } 
                // ANALYSE (Support: ANALYSE, CONFORME)
                else if (headerName.contains("ANALYSE") || headerName.contains("CONFORME")) {
                    colAnalyse = cell.getColumnIndex();
                } 
                // METRAGE BY MAPS (Strict Match bash n-tjahlo "METRAGE" l-3adiya)
                else if (headerName.equals("METRAGE BY MAPS")) {
                    colMetrage = cell.getColumnIndex();
                }
                // DURÉE (N-jem3ouhom b-jouj bash n-filtriwhom mn be3d)
                else if (headerName.equals("DURÉE") || headerName.equals("DUREE")) {
                    dureeCols.add(cell.getColumnIndex());
                }
            }

            // 🧠 SMART DETECTION DYAL "DURÉE" (L-weqt machi Vrai/Faux) 🧠
            int colDuree = -1;
            
            // N-qellbou f' les 5 stoura lwala bash n-t2ekdou (ila kan s-ster lowel khawi)
            for (int r = 1; r <= Math.min(5, sheet.getLastRowNum()); r++) {
                Row dataRow = sheet.getRow(r);
                if (dataRow != null && !dureeCols.isEmpty() && colDuree == -1) {
                    for (int colIdx : dureeCols) {
                        Cell c = dataRow.getCell(colIdx);
                        String val = getCellValueAsString(c).trim().toLowerCase();
                        
                        if (val.isEmpty()) continue; // Ila khawya doz l-khra
                        
                        // Ila kant fiha vrai awla faux, n-foutha
                        if (val.equals("vrai") || val.equals("faux") || val.equals("true") || val.equals("false")) {
                            continue;
                        }
                        // Ila makantch boolean, hadik hya l-weqt li bghina!
                        colDuree = colIdx;
                        break;
                    }
                }
            }
            
            // Fallback: Ila malqina walo, nakhdou l-wla w saffi
            if (colDuree == -1 && !dureeCols.isEmpty()) {
                colDuree = dureeCols.get(0);
            }

            // 🛑 CHECK DYAL LES COLONNES MANQUANTES 🛑
            if (colIntervention == -1 || colDuree == -1 || colAnalyse == -1 || colMetrage == -1) {
                String missingCols = "";
                if (colIntervention == -1) missingCols += "'Intervention / EPS / ID RDV' ";
                if (colDuree == -1) missingCols += "'Durée (Temps)' ";
                if (colAnalyse == -1) missingCols += "'Analyse / Conforme' ";
                if (colMetrage == -1) missingCols += "'Metrage By Maps' ";
                
                throw new Exception("Colonnes manquantes dans le fichier TVC : " + missingCols);
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

                String intervention = getCellValueAsString(cellIntervention).trim();
                String analyse = getCellValueAsString(cellAnalyse).trim().toLowerCase();

                if (intervention.isEmpty()) continue;

                // 🛑 CONDITION 1: Khassha t-koun "conforme"
                if (!analyse.equals("conforme")) continue;

                // 🛑 CONDITION 2: L-Background ma-khassouch y-koun Sfer (Yellow)
                if (isCellYellow(cellAnalyse)) continue;

                // 📐 PARSING DYAL L-DATA
                double dureeHours = parseDureeToHours(cellDuree);
                int metrage = parseMetrage(cellMetrage);

                // 🛑 CONDITION 3 & 4: Suppressions (Gle3 l-Ligne)
                if (metrage > 1000) continue;
                if (dureeHours < 4 && metrage < 150) continue;

                // ✅ CONDITION 5: L-Calcul dyal Typologie
                String typologie = "";
                if (dureeHours >= 4) {
                    typologie = "Durée";
                } else if (dureeHours < 4 && metrage >= 150) {
                    typologie = "Longueur";
                }

                // 💾 N-sauviw f' l-Map
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
            case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
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
            return cell.getDateCellValue().getHours() + (cell.getDateCellValue().getMinutes() / 60.0);
        } else {
            String val = getCellValueAsString(cell);
            String[] parts = val.split(":");
            if (parts.length >= 2) {
                try {
                    return Integer.parseInt(parts[0].trim()) + (Integer.parseInt(parts[1].trim()) / 60.0);
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

        short bgColorIndex = style.getFillForegroundColor();
        if (bgColorIndex == IndexedColors.YELLOW.getIndex()) return true;

        Color color = style.getFillForegroundColorColor();
        if (color instanceof XSSFColor) {
            byte[] rgb = ((XSSFColor) color).getRGB();
            if (rgb != null && rgb.length == 3) {
                if (rgb[0] == (byte) 255 && rgb[1] == (byte) 255 && rgb[2] == 0) {
                    return true;
                }
            }
        }
        return false;
    }
}