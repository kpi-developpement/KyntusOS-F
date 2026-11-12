package com.kyntus.Workflow.service.facture;

import com.github.pjfanning.xlsx.StreamingReader;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;

import java.io.InputStream;

/**
 * ⚡ L-QALB DYAL L-FIX DYAL R-RAM.
 *
 * Qbel : kol processor kan kay-dir `new XSSFWorkbook(is)`, yaani kay-7ett
 * L-FICHIER KAMEL f l-RAM b l-objets dyal POI. Fichier xlsx dyal 40 Mo
 * kay-wlli 1.5–3 Go f l-heap. 5 fichiers f request we7da + l'fichier
 * "A REMPLIS" = OutOfMemoryError, w b-sebbab dak OOM l-JVM kat-bloka
 * w KOLCHI kay-wlli 500 (7ta login) 7ta t-redeployi.
 *
 * Daba : kan-qraw b StreamingReader (SAX) : ster b ster, ghir 100 ster
 * f l-RAM f kol lehda. R-RAM kat-b9a quasi-constante mahma kbar l-fichier.
 *
 * ⚠️ 7DOUD DYAL STREAMING (mohim ila zedti processor jdid) :
 *    - sheet.getRow(i) w sheet.getLastRowNum() MA-KAY-KHDEM-OU-CH.
 *      Khass t-boucli : for (Row row : sheet) { ... }
 *    - row.getCell(index) KAY-KHDEM (ghir 3la s-ster l-7ali).
 *    - Les styles (couleurs) kay-khdemo ghir ila 3titi readStyles = true.
 */
final class FactureStreamSupport {

    /** Chhal mn ster kay-b9a f l-RAM. 100 = compromis mezyan. */
    private static final int ROW_CACHE = 100;
    /** Buffer dyal l-lecture XML. */
    private static final int BUFFER_SIZE = 8 * 1024;

    private FactureStreamSupport() {
    }

    /** Workbook streamé bla styles (l-cas l-3adi : ghir les valeurs). */
    static Workbook open(InputStream is) {
        return baseBuilder(false).open(is);
    }

    /** Workbook streamé M3A les styles (7it TVC kay-7tajj couleur + format date). */
    static Workbook openWithStyles(InputStream is) {
        return baseBuilder(true).open(is);
    }

    private static StreamingReader.Builder baseBuilder(boolean readStyles) {
        return StreamingReader.builder()
                .rowCacheSize(ROW_CACHE)
                .bufferSize(BUFFER_SIZE)
                // SharedStrings f fichier temporaire : hadi hiya l-7aja li
                // kat-weffer l-aktar RAM f les exports kbar (bzzaf dyal texte m-3awed)
                .setUseSstTempFile(true)
                .setAvoidTempFiles(false)
                .setReadComments(false)
                .setReadHyperlinks(false)
                .setReadShapes(false)
                .setReadSharedFormulas(false)
                .setReadStyles(readStyles);
    }

    /** Qari l-valeur dyal cell b-7al String, kifma kanet f l-code l-qdim. */
    static String cellToString(Cell cell) {
        if (cell == null) return "";
        CellType type = cell.getCellType();
        if (type == CellType.STRING) return cell.getStringCellValue();
        if (type == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        if (type == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
        if (type == CellType.BLANK) return "";
        String s = cell.toString();
        return s == null ? "" : s;
    }

    /** row.getCell(i) m3a 7imaya mn index -1 (bla NullPointer / IllegalArgument). */
    static Cell safeCell(Row row, int colIndex) {
        if (row == null || colIndex < 0) return null;
        try {
            return row.getCell(colIndex);
        } catch (RuntimeException e) {
            return null;
        }
    }
}
