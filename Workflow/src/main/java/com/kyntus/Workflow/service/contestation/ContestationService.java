package com.kyntus.Workflow.service.contestation;

import com.github.pjfanning.xlsx.StreamingReader;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ⚖️ MOTEUR DE CONTESTATION.
 *
 * 3 fichiers -> 1 fichier "Contestation" (nefs l-format dyal l-modèle) :
 *   1. GLOBAL  : idIntervention, etat, typeIntervention, Commentaire Bytel,
 *                A3_FIN_CMD, KX, C1_NOK_POSE, C1_PHOTO, sousCategorieControlePhoto,
 *                période, INSTALLATION..TOTAL (montants Bytel).
 *   2. FACTURE : INST, MES, MATERIEL, SUPPORT, LOGISTIQUE, GOULOTTE, TOTAL, Diff (montants dyalna).
 *   3. CA      : Type d'installation validé par la CA, Typologie PBO-PTO validée par la CA,
 *                Typologie PBO-PTO déclarée par le technicien, Statut du RDV.
 *
 * Règles :
 *   - Vr : ch7al mn mera l-EPS ja f EN_ATTENTE_VALIDATION_PARTENAIRE f l-global
 *          (l-passage l-awel = V0, t-tani = V1, ...). Kan-7tafdo b ster we7ed / EPS (l-a7dat).
 *   - Anomalie : Commentaire Bytel (ila machi 0 / "Avancement automatique...")
 *          sinon KX, C1_NOK_POSE, C1_PHOTO, sousCategorieControlePhoto b t-tertib :
 *          kol wa7da machi OK kat-dkhel (ila kanou jouj -> "A / B"),
 *          sinon RAS ila Diff (TOTAL Bytel - TOTAL facture) >= 0.
 *   - Bloc 3 : par colonne, MAX(montant global, montant facture).
 *   - CA : les dossiers mdoublin kay-t-fusionnaw (awel valeur 3amra par colonne).
 */
@Service
public class ContestationService {

    public static final String ETAT_EAVP = "EN_ATTENTE_VALIDATION_PARTENAIRE";
    private static final Pattern EPS_PATTERN = Pattern.compile("EPS-\\d+", Pattern.CASE_INSENSITIVE);
    private static final Pattern PERIODE_PATTERN = Pattern.compile("(\\d{4})\\D{0,3}(\\d{1,2})");
    private static final int HEADER_SCAN_ROWS = 25;

    // ---------- Montants (nom de sortie -> alias acceptés) ----------
    private static final String[] MONTANTS = {"INST", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "GOULOTTE"};

    private static final Map<String, String[]> GLOBAL_COLS = new LinkedHashMap<>();
    private static final Map<String, String[]> FACTURE_COLS = new LinkedHashMap<>();
    private static final Map<String, String[]> CA_COLS = new LinkedHashMap<>();
    private static final String[] KEY_ALIASES = {
            "idintervention", "intervention", "eps", "ideps", "numeroeps", "refeps",
            "iddossier", "dossier", "numerodossier", "ndossier", "nodossier", "referencedossier",
            "reference", "ref", "referenceintervention"
    };

    static {
        GLOBAL_COLS.put("etat", new String[]{"etat", "etatintervention", "statut"});
        GLOBAL_COLS.put("typeIntervention", new String[]{"typeintervention"});
        GLOBAL_COLS.put("Commentaire Bytel", new String[]{"commentairebytel", "commentaire", "commentaires"});
        GLOBAL_COLS.put("A3_FIN_CMD", new String[]{"a3fincmd"});
        GLOBAL_COLS.put("KX", new String[]{"kx"});
        GLOBAL_COLS.put("C1_NOK_POSE", new String[]{"c1nokpose"});
        GLOBAL_COLS.put("C1_PHOTO", new String[]{"c1photo"});
        GLOBAL_COLS.put("sousCategorieControlePhoto", new String[]{"souscategoriecontrolephoto"});
        GLOBAL_COLS.put("periode", new String[]{"periode", "period"});
        GLOBAL_COLS.put("INST", new String[]{"installation", "inst"});
        GLOBAL_COLS.put("MATERIEL", new String[]{"materiel"});
        GLOBAL_COLS.put("MES", new String[]{"mes"});
        GLOBAL_COLS.put("SUPPORT", new String[]{"support"});
        GLOBAL_COLS.put("LOGISTIQUE", new String[]{"logistique"});
        GLOBAL_COLS.put("GOULOTTE", new String[]{"goulotte"});
        GLOBAL_COLS.put("TOTAL", new String[]{"total"});

        FACTURE_COLS.put("INST", new String[]{"inst", "installation"});
        FACTURE_COLS.put("MES", new String[]{"mes"});
        FACTURE_COLS.put("MATERIEL", new String[]{"materiel"});
        FACTURE_COLS.put("SUPPORT", new String[]{"support"});
        FACTURE_COLS.put("LOGISTIQUE", new String[]{"logistique"});
        FACTURE_COLS.put("GOULOTTE", new String[]{"goulotte"});
        FACTURE_COLS.put("TOTAL", new String[]{"total"});
        FACTURE_COLS.put("Diff", new String[]{"diff"});
        FACTURE_COLS.put("TVC", new String[]{"tvc"});

        CA_COLS.put("Type d'installation validé par la CA", new String[]{"typedinstallationvalideparlaca"});
        CA_COLS.put("Typologie PBO-PTO validée par la CA", new String[]{"typologiepboptovalideeparlaca"});
        CA_COLS.put("Typologie PBO-PTO déclarée par le technicien", new String[]{"typologiepboptodeclareeparletechnicien"});
        CA_COLS.put("Statut du RDV", new String[]{"statutdurdv"});
    }

    /** Résultat : le fichier + quelques compteurs pour le front. */
    public record Result(byte[] bytes, int lignes, int ras, int anomalies, int aCompleter,
                         int sansFacture, int sansCa, int multiVersions) {
    }

    // =====================================================================
    // ENTRY POINT
    // =====================================================================
    public Result generate(MultipartFile global, MultipartFile facture, MultipartFile ca) throws Exception {
        Table g = readTable(global, GLOBAL_COLS, "GLOBAL");
        Table f = readTable(facture, FACTURE_COLS, "FACTURE");
        Table c = (ca == null || ca.isEmpty()) ? null : readTable(ca, CA_COLS, "CA");

        // ---- 1. GLOBAL : regroupement par EPS ----
        Map<String, List<Map<String, Object>>> globalByEps = new LinkedHashMap<>();
        for (Map<String, Object> r : g.rows) {
            globalByEps.computeIfAbsent((String) r.get(KEY), k -> new ArrayList<>()).add(r);
        }

        // ---- 2. FACTURE + CA : fusion des doublons ----
        Map<String, Map<String, Object>> factureByEps = mergeDuplicates(f.rows);
        Map<String, Map<String, Object>> caByEps = c == null ? Map.of() : mergeDuplicates(c.rows);

        try (SXSSFWorkbook wb = new SXSSFWorkbook(500)) {
            wb.setCompressTempFiles(true);
            SXSSFSheet sheet = wb.createSheet("Contestation");
            Styles st = new Styles(wb);
            List<OutCol> cols = outputColumns(st);

            Row header = sheet.createRow(0);
            header.setHeightInPoints(32);
            for (int i = 0; i < cols.size(); i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols.get(i).title);
                cell.setCellStyle(cols.get(i).headerStyle);
                sheet.setColumnWidth(i, cols.get(i).width * 256);
            }
            sheet.createFreezePane(1, 1);

            int rowIdx = 1, ras = 0, anomalies = 0, aCompleter = 0, sansFacture = 0, sansCa = 0, multi = 0;

            for (Map.Entry<String, List<Map<String, Object>>> e : globalByEps.entrySet()) {
                String eps = e.getKey();
                List<Map<String, Object>> versions = e.getValue();
                // Tri chronologique stable : période puis ordre du fichier
                versions.sort(Comparator.<Map<String, Object>>comparingLong(v -> periodeRank(v.get("periode")))
                        .thenComparingLong(v -> (Long) v.get("__seq")));
                Map<String, Object> cur = versions.get(versions.size() - 1);

                long passages = versions.stream()
                        .filter(v -> ETAT_EAVP.equalsIgnoreCase(str(v.get("etat")).trim()))
                        .count();
                int vr = (int) Math.max(0, passages - 1);
                if (vr > 0) multi++;

                Map<String, Object> fac = factureByEps.get(eps);
                Map<String, Object> caRow = caByEps.get(eps);
                if (fac == null) sansFacture++;
                if (c != null && caRow == null) sansCa++;

                double totalBytel = num(cur.get("TOTAL"));
                double totalFacture = 0;
                for (String m : MONTANTS) totalFacture += fac == null ? 0 : num(fac.get(m));
                double diff2 = totalBytel - totalFacture;

                double[] bloc3 = new double[MONTANTS.length];
                double total3 = 0;
                for (int i = 0; i < MONTANTS.length; i++) {
                    double a = num(cur.get(MONTANTS[i]));
                    double b = fac == null ? 0 : num(fac.get(MONTANTS[i]));
                    bloc3[i] = Math.max(a, b);
                    total3 += bloc3[i];
                }
                double diff3 = totalBytel - total3;

                String anomalie = anomalie(cur, diff2);
                if ("RAS".equals(anomalie)) ras++;
                else if (anomalie.isEmpty()) aCompleter++;
                else anomalies++;

                Row row = sheet.createRow(rowIdx);
                int excelRow = rowIdx + 1;
                int ci = 0;
                // A..C
                text(row, ci++, eps, st.body);
                text(row, ci++, str(cur.get("etat")), st.body);
                text(row, ci++, str(cur.get("typeIntervention")), st.body);
                // D Vr / E Anomalie / F Commentaire Bytel
                text(row, ci++, "V" + vr, vr > 0 ? st.bodyWarn : st.bodyCenter);
                text(row, ci++, anomalie, "RAS".equals(anomalie) ? st.bodyOk
                        : anomalie.isEmpty() ? st.bodyEmpty : st.bodyAnomalie);
                value(row, ci++, cur.get("Commentaire Bytel"), st.body);
                // G..I Commentaire Bytel V0..V2 / J..L Commentaire V0..V2
                for (int k = 0; k < 6; k++) text(row, ci++, "-", st.bodyCenter);
                // M Commentaire Actuel / N ACTION / O Injection (à remplir par le pilote)
                text(row, ci++, "", st.body);
                text(row, ci++, "", st.body);
                text(row, ci++, "", st.body);
                // P..U contrôles + période
                for (String k : new String[]{"A3_FIN_CMD", "KX", "C1_NOK_POSE", "C1_PHOTO", "sousCategorieControlePhoto", "periode"}) {
                    value(row, ci++, cur.get(k), st.body);
                }
                // V..AB montants Bytel (ordre du modèle)
                int colTotalBytel = -1;
                for (String k : new String[]{"INST", "MATERIEL", "MES", "SUPPORT", "LOGISTIQUE", "GOULOTTE", "TOTAL"}) {
                    if (k.equals("TOTAL")) colTotalBytel = ci;
                    number(row, ci++, cur.get(k), st.num);
                }
                String tb = colRef(colTotalBytel) + excelRow;
                // AC..AH montants facture + AI TOTAL + AJ Diff
                int start2 = ci;
                for (String m : MONTANTS) number(row, ci++, fac == null ? null : fac.get(m), st.num2);
                formula(row, ci++, "SUM(" + colRef(start2) + excelRow + ":" + colRef(ci - 2) + excelRow + ")", totalFacture, st.num2Bold);
                formula(row, ci++, tb + "-" + colRef(ci - 2) + excelRow, diff2, diff2 < -0.005 ? st.numNeg : st.numPos);
                // AK TVC
                value(row, ci++, fac == null ? null : fac.get("TVC"), st.body);
                // AL..AQ bloc 3 + AR TOTAL + AS Diff
                int start3 = ci;
                for (double v : bloc3) {
                    Cell cell = row.createCell(ci++);
                    cell.setCellValue(v);
                    cell.setCellStyle(st.num3);
                }
                formula(row, ci++, "SUM(" + colRef(start3) + excelRow + ":" + colRef(ci - 2) + excelRow + ")", total3, st.num3Bold);
                formula(row, ci++, tb + "-" + colRef(ci - 2) + excelRow, diff3, diff3 < -0.005 ? st.numNeg : st.numPos);
                // AT..AW CA
                for (String k : CA_COLS.keySet()) value(row, ci++, caRow == null ? null : caRow.get(k), st.body);

                rowIdx++;
            }

            if (rowIdx > 1) {
                sheet.setAutoFilter(new CellRangeAddress(0, rowIdx - 1, 0, cols.size() - 1));
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            wb.dispose();
            return new Result(out.toByteArray(), rowIdx - 1, ras, anomalies, aCompleter, sansFacture, sansCa, multi);
        }
    }

    // =====================================================================
    // RÈGLE ANOMALIE
    // =====================================================================
    static String anomalie(Map<String, Object> r, double diff) {
        String com = str(r.get("Commentaire Bytel")).trim();
        if (!isNeutralComment(com)) return com;

        List<String> noks = new ArrayList<>();
        for (String k : new String[]{"KX", "C1_NOK_POSE", "C1_PHOTO", "sousCategorieControlePhoto"}) {
            String v = str(r.get(k)).trim();
            if (!isOk(v)) noks.add(v);
        }
        if (!noks.isEmpty()) return String.join(" / ", noks);
        return diff >= -0.005 ? "RAS" : "";
    }

    static boolean isNeutralComment(String s) {
        if (s.isEmpty() || s.equals("0") || s.equals("-") || s.equals("0.0")) return true;
        return normalize(s).startsWith("avancementautomatiquedelintervention");
    }

    static boolean isOk(String v) {
        if (v.isEmpty() || v.equals("0") || v.equals("0.0") || v.equals("-")) return true;
        String n = normalize(v);
        return n.startsWith("ok") || n.startsWith("prestationjustifie");
    }

    // =====================================================================
    // LECTURE (streaming : RAM constante mahma kbar l-fichier)
    // =====================================================================
    private static final String KEY = "__eps";

    private static final class Table {
        final List<Map<String, Object>> rows = new ArrayList<>();
        int score = -1;
    }

    private Table readTable(MultipartFile file, Map<String, String[]> wanted, String label) throws Exception {
        Table best = new Table();
        try (InputStream is = file.getInputStream();
             Workbook wb = StreamingReader.builder()
                     .rowCacheSize(200).bufferSize(8192)
                     .setUseSstTempFile(true).setAvoidTempFiles(false)
                     .setReadComments(false).setReadHyperlinks(false).setReadShapes(false)
                     .setReadSharedFormulas(false).setReadStyles(false)
                     .open(is)) {

            for (Sheet sheet : wb) {
                Table t = new Table();
                Map<String, Integer> colIdx = null;
                int keyCol = -1;
                int scanned = 0;
                long seq = 0;

                for (Row row : sheet) {
                    if (colIdx == null) {
                        if (scanned++ >= HEADER_SCAN_ROWS) break;
                        Map<String, Integer> found = new HashMap<>();
                        int foundKey = -1;
                        int last = row.getLastCellNum();
                        Map<String, Integer> headerPos = new HashMap<>();
                        for (int i = 0; i < last; i++) {
                            String h = normalize(cellString(safeCell(row, i)));
                            if (!h.isEmpty()) headerPos.putIfAbsent(h, i);
                        }
                        for (String alias : KEY_ALIASES) {
                            if (headerPos.containsKey(alias)) { foundKey = headerPos.get(alias); break; }
                        }
                        for (Map.Entry<String, String[]> w : wanted.entrySet()) {
                            for (String alias : w.getValue()) {
                                Integer p = headerPos.get(alias);
                                if (p != null) { found.put(w.getKey(), p); break; }
                            }
                        }
                        int score = found.size() + (foundKey >= 0 ? 1 : 0);
                        if (found.size() >= Math.min(2, wanted.size()) && score > t.score) {
                            colIdx = found;
                            keyCol = foundKey;
                            t.score = score;
                        }
                        continue;
                    }

                    String eps = null;
                    if (keyCol >= 0) eps = extractEps(cellString(safeCell(row, keyCol)));
                    if (eps == null) {
                        int last = row.getLastCellNum();
                        for (int i = 0; i < last && eps == null; i++) {
                            Cell cell = safeCell(row, i);
                            if (cell != null && cell.getCellType() == CellType.STRING) {
                                eps = extractEps(cell.getStringCellValue());
                            }
                        }
                    }
                    if (eps == null) continue;

                    Map<String, Object> r = new HashMap<>();
                    r.put(KEY, eps);
                    r.put("__seq", seq++);
                    for (Map.Entry<String, Integer> col : colIdx.entrySet()) {
                        Object v = cellValue(safeCell(row, col.getValue()));
                        if (v != null) r.put(col.getKey(), v);
                    }
                    t.rows.add(r);
                }

                if (t.score > best.score || (t.score == best.score && t.rows.size() > best.rows.size())) {
                    best = t;
                }
            }
        }
        if (best.score < 0) {
            throw new IllegalArgumentException("Fichier " + label + " (" + file.getOriginalFilename()
                    + ") : en-têtes introuvables. Colonnes attendues : " + String.join(", ", wanted.keySet()));
        }
        if (best.rows.isEmpty()) {
            throw new IllegalArgumentException("Fichier " + label + " (" + file.getOriginalFilename()
                    + ") : aucune ligne avec un EPS (EPS-xxxxxxx) trouvée.");
        }
        System.out.println("   ↳ CONTESTATION " + label + " : " + best.rows.size() + " lignes");
        return best;
    }

    /** Fusion des doublons : par colonne, la 1ère valeur non vide gagne. */
    private static Map<String, Map<String, Object>> mergeDuplicates(List<Map<String, Object>> rows) {
        Map<String, Map<String, Object>> out = new HashMap<>(rows.size() * 2);
        for (Map<String, Object> r : rows) {
            Map<String, Object> m = out.computeIfAbsent((String) r.get(KEY), k -> new HashMap<>());
            for (Map.Entry<String, Object> e : r.entrySet()) {
                Object cur = m.get(e.getKey());
                if (cur == null || str(cur).trim().isEmpty()) m.put(e.getKey(), e.getValue());
            }
        }
        return out;
    }

    // =====================================================================
    // HELPERS
    // =====================================================================
    static String normalize(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    private static String extractEps(String s) {
        if (s == null || s.isEmpty()) return null;
        Matcher m = EPS_PATTERN.matcher(s);
        return m.find() ? m.group().toUpperCase(Locale.ROOT) : null;
    }

    /** "2026-M10" -> 202610 (tri chronologique ; "M9" < "M10" contrairement au tri texte). */
    static long periodeRank(Object p) {
        Matcher m = PERIODE_PATTERN.matcher(str(p));
        if (!m.find()) return 0;
        return Long.parseLong(m.group(1)) * 100 + Long.parseLong(m.group(2));
    }

    static String str(Object o) {
        if (o == null) return "";
        if (o instanceof Double d) {
            if (d == Math.rint(d) && !Double.isInfinite(d)) return String.valueOf(d.longValue());
            return String.valueOf(d);
        }
        return o.toString();
    }

    static double num(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.doubleValue();
        String s = o.toString().trim().replace(" ", "").replace(" ", "").replace("€", "").replace(",", ".");
        if (s.isEmpty() || s.equals("-")) return 0;
        try { return Double.parseDouble(s); } catch (NumberFormatException e) { return 0; }
    }

    private static Cell safeCell(Row row, int i) {
        if (row == null || i < 0) return null;
        try { return row.getCell(i); } catch (RuntimeException e) { return null; }
    }

    private static String cellString(Cell c) {
        return str(cellValue(c));
    }

    private static Object cellValue(Cell c) {
        if (c == null) return null;
        try {
            CellType t = c.getCellType();
            if (t == CellType.FORMULA) t = c.getCachedFormulaResultType();
            switch (t) {
                case STRING: {
                    String s = c.getStringCellValue();
                    return s == null || s.isEmpty() ? null : s;
                }
                case NUMERIC: return c.getNumericCellValue();
                case BOOLEAN: return String.valueOf(c.getBooleanCellValue());
                default: return null;
            }
        } catch (RuntimeException e) {
            String s = c.toString();
            return s == null || s.isEmpty() ? null : s;
        }
    }

    private static String colRef(int idx) {
        StringBuilder sb = new StringBuilder();
        int n = idx + 1;
        while (n > 0) {
            int r = (n - 1) % 26;
            sb.insert(0, (char) ('A' + r));
            n = (n - 1) / 26;
        }
        return sb.toString();
    }

    private static void text(Row row, int ci, String v, CellStyle s) {
        Cell c = row.createCell(ci);
        c.setCellValue(v == null ? "" : v);
        c.setCellStyle(s);
    }

    private static void value(Row row, int ci, Object v, CellStyle s) {
        Cell c = row.createCell(ci);
        if (v instanceof Double d) c.setCellValue(d);
        else c.setCellValue(v == null ? "" : v.toString());
        c.setCellStyle(s);
    }

    private static void number(Row row, int ci, Object v, CellStyle s) {
        Cell c = row.createCell(ci);
        if (v != null && !str(v).trim().isEmpty()) c.setCellValue(num(v));
        c.setCellStyle(s);
    }

    private static void formula(Row row, int ci, String f, double cached, CellStyle s) {
        Cell c = row.createCell(ci);
        c.setCellFormula(f);
        c.setCellValue(Math.round(cached * 100.0) / 100.0); // valeur pré-calculée (aperçu / lecteurs sans recalcul)
        c.setCellStyle(s);
    }

    // =====================================================================
    // COLONNES DE SORTIE (ordre + couleurs du modèle Contestation)
    // =====================================================================
    private record OutCol(String title, CellStyle headerStyle, int width) {
    }

    private static List<OutCol> outputColumns(Styles st) {
        List<OutCol> c = new ArrayList<>();
        c.add(new OutCol("idIntervention", st.hBlue, 17));
        c.add(new OutCol("etat", st.hBlue, 22));
        c.add(new OutCol("typeIntervention", st.hBlue, 16));
        c.add(new OutCol("Vr", st.hBlue, 7));
        c.add(new OutCol("Anomalie", st.hRed, 34));
        c.add(new OutCol("Commentaire Bytel", st.hOrange, 30));
        c.add(new OutCol("Commentaire Bytel V0", st.hOrangeW, 14));
        c.add(new OutCol("Commentaire Bytel V1", st.hOrangeW, 14));
        c.add(new OutCol("Commentaire Bytel V2", st.hOrangeW, 14));
        c.add(new OutCol("Commentaire V0", st.hNavy, 14));
        c.add(new OutCol("Commentaire V1", st.hNavy, 14));
        c.add(new OutCol("Commentaire V2", st.hNavy, 14));
        c.add(new OutCol("Commentaire Actuel", st.hNavy, 26));
        c.add(new OutCol("ACTION", st.hYellow, 14));
        c.add(new OutCol("Injection", st.hYellow, 12));
        for (String h : new String[]{"A3_FIN_CMD", "KX", "C1_NOK_POSE", "C1_PHOTO", "sousCategorieControlePhoto", "periode"}) {
            c.add(new OutCol(h, st.hOrange, h.length() > 12 ? 26 : 14));
        }
        for (String h : new String[]{"INSTALLATION", "MATERIEL", "MES", "SUPPORT", "LOGISTIQUE", "GOULOTTE", "TOTAL"}) {
            c.add(new OutCol(h, st.hYellow, 12));
        }
        for (String h : new String[]{"INST", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "GOULOTTE", "TOTAL"}) {
            c.add(new OutCol(h, st.hNavy, 11));
        }
        c.add(new OutCol("Diff", st.hOrange, 11));
        c.add(new OutCol("TVC", st.hNavy, 20));
        for (String h : new String[]{"INST", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "GOULOTTE", "TOTAL", "Diff"}) {
            c.add(new OutCol(h, st.hGreen, 11));
        }
        for (String h : CA_COLS.keySet()) c.add(new OutCol(h, st.hSalmon, 26));
        return c;
    }

    private static final class Styles {
        final CellStyle hBlue, hRed, hOrange, hOrangeW, hNavy, hYellow, hGreen, hSalmon;
        final CellStyle body, bodyCenter, bodyOk, bodyAnomalie, bodyEmpty, bodyWarn;
        final CellStyle num, num2, num2Bold, num3, num3Bold, numNeg, numPos;

        Styles(SXSSFWorkbook wb) {
            hBlue = header(wb, "00B0F0", true);
            hRed = header(wb, "FF0000", true);
            hOrange = header(wb, "FFC000", false);
            hOrangeW = header(wb, "FFC000", true);
            hNavy = header(wb, "002060", true);
            hYellow = header(wb, "FFFF00", false);
            hGreen = header(wb, "00B050", true);
            hSalmon = header(wb, "F1A983", false);

            body = body(wb, null, false, null, HorizontalAlignment.LEFT);
            bodyCenter = body(wb, null, false, null, HorizontalAlignment.CENTER);
            bodyOk = body(wb, "E2EFDA", true, "375623", HorizontalAlignment.LEFT);
            bodyAnomalie = body(wb, "FCE4E4", true, "C00000", HorizontalAlignment.LEFT);
            bodyEmpty = body(wb, "FFF2CC", false, null, HorizontalAlignment.LEFT);
            bodyWarn = body(wb, "FFF2CC", true, "9C5700", HorizontalAlignment.CENTER);

            short fmt = wb.createDataFormat().getFormat("#,##0.00");
            num = numStyle(wb, fmt, null, false, null);
            num2 = numStyle(wb, fmt, "DDEBF7", false, null);
            num2Bold = numStyle(wb, fmt, "BDD7EE", true, "002060");
            num3 = numStyle(wb, fmt, "E2EFDA", false, null);
            num3Bold = numStyle(wb, fmt, "C6E0B4", true, "375623");
            numNeg = numStyle(wb, fmt, "FCE4E4", true, "C00000");
            numPos = numStyle(wb, fmt, null, true, "375623");
        }

        private static XSSFColor rgb(String hex) {
            return new XSSFColor(new byte[]{
                    (byte) Integer.parseInt(hex.substring(0, 2), 16),
                    (byte) Integer.parseInt(hex.substring(2, 4), 16),
                    (byte) Integer.parseInt(hex.substring(4, 6), 16)}, null);
        }

        private static void borders(CellStyle s) {
            s.setBorderBottom(BorderStyle.THIN);
            s.setBorderTop(BorderStyle.THIN);
            s.setBorderLeft(BorderStyle.THIN);
            s.setBorderRight(BorderStyle.THIN);
            s.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            s.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            s.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            s.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        }

        private static CellStyle header(SXSSFWorkbook wb, String fill, boolean whiteText) {
            XSSFCellStyle s = (XSSFCellStyle) wb.createCellStyle();
            s.setFillForegroundColor(rgb(fill));
            s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            s.setAlignment(HorizontalAlignment.CENTER);
            s.setVerticalAlignment(VerticalAlignment.CENTER);
            s.setWrapText(true);
            borders(s);
            XSSFFont f = (XSSFFont) wb.createFont();
            f.setBold(true);
            f.setFontHeightInPoints((short) 10);
            f.setColor(rgb(whiteText ? "FFFFFF" : "000000"));
            s.setFont(f);
            return s;
        }

        private static CellStyle body(SXSSFWorkbook wb, String fill, boolean bold, String color, HorizontalAlignment al) {
            XSSFCellStyle s = (XSSFCellStyle) wb.createCellStyle();
            if (fill != null) {
                s.setFillForegroundColor(rgb(fill));
                s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            }
            s.setAlignment(al);
            s.setVerticalAlignment(VerticalAlignment.CENTER);
            borders(s);
            XSSFFont f = (XSSFFont) wb.createFont();
            f.setFontHeightInPoints((short) 10);
            f.setBold(bold);
            if (color != null) f.setColor(rgb(color));
            s.setFont(f);
            return s;
        }

        private static CellStyle numStyle(SXSSFWorkbook wb, short fmt, String fill, boolean bold, String color) {
            CellStyle s = body(wb, fill, bold, color, HorizontalAlignment.RIGHT);
            s.setDataFormat(fmt);
            return s;
        }
    }
}
