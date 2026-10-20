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

    // ⚡ Static Pre-compiled Pattern (Machi compile f' kol ster!)
    private static final Pattern DIGITS_PATTERN = Pattern.compile("(\\d+)");

    public Map<String, String> processTvcFile(MultipartFile file) throws Exception {
        Map<String, String> tvcDataMap = new HashMap<>(16384);

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);

            if (headerRow == null) throw new Exception("Le fichier TVC est vide.");

            int colIntervention = -1, colAnalyse = -1, colMetrage = -1;
            List<Integer> dureeCols = new ArrayList<>();

            for (Cell cell : headerRow) {
                if (cell.getCellType() != CellType.STRING) continue;
                String headerName = cell.getStringCellValue().trim().toUpperCase();

                if (headerName.equals("EPS") || headerName.equals("ID RDV") ||
                        headerName.contains("INTERVENTION") || headerName.equals("CODE_INTER") ||
                        headerName.contains("RDV")) {
                    colIntervention = cell.getColumnIndex();
                } else if (headerName.contains("ANALYSE") || headerName.contains("CONFORME")) {
                    colAnalyse = cell.getColumnIndex();
                } else if (headerName.equals("METRAGE BY MAPS")) {
                    colMetrage = cell.getColumnIndex();
                } else if (headerName.equals("DURÉE") || headerName.equals("DUREE")) {
                    dureeCols.add(cell.getColumnIndex());
                }
            }

            int colDuree = -1;
            for (int r = 1; r <= Math.min(5, sheet.getLastRowNum()); r++) {
                Row dataRow = sheet.getRow(r);
                if (dataRow != null && !dureeCols.isEmpty() && colDuree == -1) {
                    for (int colIdx : dureeCols) {
                        Cell c = dataRow.getCell(colIdx);
                        String val = getCellValueAsString(c).trim().toLowerCase();
                        if (val.isEmpty() || val.equals("vrai") || val.equals("faux") || val.equals("true") || val.equals("false")) {
                            continue;
                        }
                        colDuree = colIdx;
                        break;
                    }
                }
            }

            if (colDuree == -1 && !dureeCols.isEmpty()) {
                colDuree = dureeCols.get(0);
            }

            if (colIntervention == -1 || colDuree == -1 || colAnalyse == -1 || colMetrage == -1) {
                String missingCols = "";
                if (colIntervention == -1) missingCols += "'Intervention / EPS / ID RDV' ";
                if (colDuree == -1) missingCols += "'Durée (Temps)' ";
                if (colAnalyse == -1) missingCols += "'Analyse / Conforme' ";
                if (colMetrage == -1) missingCols += "'Metrage By Maps' ";
                throw new Exception("Colonnes manquantes dans le fichier TVC : " + missingCols);
            }

            int lastRow = sheet.getLastRowNum();
            for (int i = 1; i <= lastRow; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Cell cellIntervention = row.getCell(colIntervention);
                Cell cellAnalyse = row.getCell(colAnalyse);
                if (cellIntervention == null || cellAnalyse == null) continue;

                String analyse = getCellValueAsString(cellAnalyse).trim();
                if (!"conforme".equalsIgnoreCase(analyse)) continue;

                String intervention = getCellValueAsString(cellIntervention).trim();
                if (intervention.isEmpty()) continue;

                if (isCellYellow(cellAnalyse)) continue;

                double dureeHours = parseDureeToHours(row.getCell(colDuree));
                int metrage = parseMetrage(row.getCell(colMetrage));

                if (metrage > 1000) continue;
                if (dureeHours < 4 && metrage < 150) continue;

                if (dureeHours >= 4) {
                    tvcDataMap.put(intervention, "Durée");
                } else if (metrage >= 150) {
                    tvcDataMap.put(intervention, "Longueur");
                }
            }
        }
        return tvcDataMap;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        switch (cell.getCellType()) {
            case STRING: return cell.getStringCellValue();
            case NUMERIC: return String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
            default: return cell.toString();
        }
    }

    private int parseMetrage(Cell cell) {
        if (cell == null) return 0;
        if (cell.getCellType() == CellType.NUMERIC) {
            return (int) cell.getNumericCellValue();
        }
        String val = getCellValueAsString(cell);
        Matcher matcher = DIGITS_PATTERN.matcher(val);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return 0;
    }

    private double parseDureeToHours(Cell cell) {
        if (cell == null) return 0.0;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getDateCellValue().getHours() + (cell.getDateCellValue().getMinutes() / 60.0);
        } else {
            String val = getCellValueAsString(cell);
            int colonIdx = val.indexOf(':');
            if (colonIdx > 0) {
                try {
                    int hours = Integer.parseInt(val.substring(0, colonIdx).trim());
                    int nextColon = val.indexOf(':', colonIdx + 1);
                    String minStr = nextColon > 0 ? val.substring(colonIdx + 1, nextColon) : val.substring(colonIdx + 1);
                    int mins = Integer.parseInt(minStr.trim());
                    return hours + (mins / 60.0);
                } catch (NumberFormatException e) {
                    return 0.0;
                }
            }
        }
        return 0.0;
    }

    private boolean isCellYellow(Cell cell) {
        CellStyle style = cell.getCellStyle();
        if (style == null) return false;

        short bgColorIndex = style.getFillForegroundColor();
        if (bgColorIndex == IndexedColors.YELLOW.getIndex()) return true;

        Color color = style.getFillForegroundColorColor();
        if (color instanceof XSSFColor) {
            byte[] rgb = ((XSSFColor) color).getRGB();
            if (rgb != null && rgb.length == 3) {
                return rgb[0] == (byte) 255 && rgb[1] == (byte) 255 && rgb[2] == 0;
            }
        }
        return false;
    }
}