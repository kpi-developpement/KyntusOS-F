package com.kyntus.Workflow.service.facture;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TvcProcessorService {

    // Static Pre-compiled Pattern (Machi compile f kol ster!)
    private static final Pattern DIGITS_PATTERN = Pattern.compile("(\\d+)");

    /** Chhal mn ster kan-chouf bach n-detecti chkoun hiya l-vraie colonne DUREE. */
    private static final int DUREE_PROBE_ROWS = 5;

    /**
     * Snapshot dyal ster : f mode streaming ma-n9der-ch n-7ett l-objet Row f
     * jnb w n-rje3 lih mn be3d. Donc kan-khzen ghir les valeurs li n-7tajj.
     */
    private static final class RowSnapshot {
        String intervention = "";
        String analyse = "";
        boolean analyseYellow = false;
        int metrage = 0;
        /** colIdx dyal chaque candidat DUREE -> heures */
        final Map<Integer, Double> dureeHours = new HashMap<>();
        final Map<Integer, String> dureeRaw = new HashMap<>();
    }

    public Map<String, String> processTvcFile(MultipartFile file) throws Exception {
        Map<String, String> tvcDataMap = new HashMap<>(16384);

        // STREAMING M3A LES STYLES : kan-7tajj couleur (jaune) + format date
        try (InputStream is = file.getInputStream();
             Workbook workbook = FactureStreamSupport.openWithStyles(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rows = sheet.iterator();

            if (!rows.hasNext()) throw new Exception("Le fichier TVC est vide.");
            Row headerRow = rows.next();

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

            // --- Phase 1 : n-qraw l-ewwel 5 ster w n-khzenhom, bach n-detecti colDuree ---
            List<RowSnapshot> buffered = new ArrayList<>(DUREE_PROBE_ROWS);
            while (rows.hasNext() && buffered.size() < DUREE_PROBE_ROWS) {
                Row row = rows.next();
                if (row == null) continue;
                buffered.add(snapshot(row, colIntervention, colAnalyse, colMetrage, dureeCols));
            }

            int colDuree = -1;
            for (RowSnapshot snap : buffered) {
                if (colDuree != -1) break;
                for (int colIdx : dureeCols) {
                    String val = snap.dureeRaw.getOrDefault(colIdx, "").trim().toLowerCase();
                    if (val.isEmpty() || val.equals("vrai") || val.equals("faux")
                            || val.equals("true") || val.equals("false")) {
                        continue;
                    }
                    colDuree = colIdx;
                    break;
                }
            }

            if (colDuree == -1 && !dureeCols.isEmpty()) {
                colDuree = dureeCols.get(0);
            }

            if (colIntervention == -1 || colDuree == -1 || colAnalyse == -1 || colMetrage == -1) {
                String missingCols = "";
                if (colIntervention == -1) missingCols += "Intervention / EPS / ID RDV; ";
                if (colDuree == -1) missingCols += "Duree (Temps); ";
                if (colAnalyse == -1) missingCols += "Analyse / Conforme; ";
                if (colMetrage == -1) missingCols += "Metrage By Maps; ";
                throw new Exception("Colonnes manquantes dans le fichier TVC : " + missingCols);
            }

            // --- Phase 2 : n-traitiw les ster li khzenna ---
            for (RowSnapshot snap : buffered) {
                Double h = snap.dureeHours.get(colDuree);
                consume(tvcDataMap, snap, h == null ? 0.0 : h);
            }

            // --- Phase 3 : n-kemmlou streaming 3la l-b9iya ---
            while (rows.hasNext()) {
                Row row = rows.next();
                if (row == null) continue;

                Cell cellIntervention = FactureStreamSupport.safeCell(row, colIntervention);
                Cell cellAnalyse = FactureStreamSupport.safeCell(row, colAnalyse);
                if (cellIntervention == null || cellAnalyse == null) continue;

                String analyse = FactureStreamSupport.cellToString(cellAnalyse).trim();
                if (!"conforme".equalsIgnoreCase(analyse)) continue;

                String intervention = FactureStreamSupport.cellToString(cellIntervention).trim();
                if (intervention.isEmpty()) continue;

                if (isCellYellow(cellAnalyse)) continue;

                double dureeHours = parseDureeToHours(FactureStreamSupport.safeCell(row, colDuree));
                int metrage = parseMetrage(FactureStreamSupport.safeCell(row, colMetrage));

                put(tvcDataMap, intervention, dureeHours, metrage);
            }
        }
        return tvcDataMap;
    }

    private RowSnapshot snapshot(Row row, int colIntervention, int colAnalyse,
                                 int colMetrage, List<Integer> dureeCols) {
        RowSnapshot snap = new RowSnapshot();

        Cell cellIntervention = FactureStreamSupport.safeCell(row, colIntervention);
        Cell cellAnalyse = FactureStreamSupport.safeCell(row, colAnalyse);

        snap.analyse = FactureStreamSupport.cellToString(cellAnalyse).trim();
        snap.analyseYellow = cellAnalyse != null && isCellYellow(cellAnalyse);
        snap.metrage = parseMetrage(FactureStreamSupport.safeCell(row, colMetrage));

        // Ila cellIntervention wla cellAnalyse khawyin, kan-khelliw intervention
        // khawya w `consume` kay-skipi (kifma kan kay-dir l-code l-qdim b continue).
        if (cellIntervention == null || cellAnalyse == null) {
            snap.intervention = "";
        } else {
            snap.intervention = FactureStreamSupport.cellToString(cellIntervention).trim();
        }

        for (int colIdx : dureeCols) {
            Cell c = FactureStreamSupport.safeCell(row, colIdx);
            snap.dureeRaw.put(colIdx, FactureStreamSupport.cellToString(c));
            snap.dureeHours.put(colIdx, parseDureeToHours(c));
        }
        return snap;
    }

    private void consume(Map<String, String> tvcDataMap, RowSnapshot snap, double dureeHours) {
        if (snap.intervention.isEmpty()) return;
        if (!"conforme".equalsIgnoreCase(snap.analyse)) return;
        if (snap.analyseYellow) return;
        put(tvcDataMap, snap.intervention, dureeHours, snap.metrage);
    }

    private void put(Map<String, String> tvcDataMap, String intervention, double dureeHours, int metrage) {
        if (metrage > 1000) return;
        if (dureeHours < 4 && metrage < 150) return;

        if (dureeHours >= 4) {
            tvcDataMap.put(intervention, "Durée");
        } else if (metrage >= 150) {
            tvcDataMap.put(intervention, "Longueur");
        }
    }

    private String getCellValueAsString(Cell cell) {
        return FactureStreamSupport.cellToString(cell);
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
        if (cell.getCellType() == CellType.NUMERIC && isDateFormatted(cell)) {
            java.util.Date d = cell.getDateCellValue();
            if (d == null) return 0.0;
            java.util.Calendar cal = java.util.Calendar.getInstance();
            cal.setTime(d);
            return cal.get(java.util.Calendar.HOUR_OF_DAY)
                    + (cal.get(java.util.Calendar.MINUTE) / 60.0);
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

    /** F mode streaming l-style ymken ykoun null : khass n-7taw ras-na. */
    private boolean isDateFormatted(Cell cell) {
        try {
            return DateUtil.isCellDateFormatted(cell);
        } catch (RuntimeException e) {
            return false;
        }
    }

    private boolean isCellYellow(Cell cell) {
        CellStyle style;
        try {
            style = cell.getCellStyle();
        } catch (RuntimeException e) {
            return false;
        }
        if (style == null) return false;

        try {
            short bgColorIndex = style.getFillForegroundColor();
            if (bgColorIndex == IndexedColors.YELLOW.getIndex()) return true;

            Color color = style.getFillForegroundColorColor();
            if (color instanceof XSSFColor) {
                byte[] rgb = ((XSSFColor) color).getRGB();
                if (rgb != null && rgb.length == 3) {
                    return rgb[0] == (byte) 255 && rgb[1] == (byte) 255 && rgb[2] == 0;
                }
            }
        } catch (RuntimeException e) {
            return false;
        }
        return false;
    }
}
