package com.kyntus.Workflow.service;

import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Stream;

/**
 * Universal high-speed streaming reader for both .xlsx (FastExcel) and .csv/.txt (RFC-4180).
 * Auto-detects ZIP/XLSX magic bytes vs CSV, auto-detects UTF-8 vs Windows-1252 encoding,
 * and auto-detects delimiter (';', ',', or '\t').
 */
public final class TabularFileReader {

    private TabularFileReader() {}

    public static void readRows(MultipartFile file, Consumer<List<String>> rowConsumer) throws Exception {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        try (InputStream raw = file.getInputStream();
             BufferedInputStream bis = new BufferedInputStream(raw, 65536)) {

            bis.mark(65536);
            byte[] probe = new byte[Math.min(65536, 65536)];
            int probeLen = bis.read(probe);
            bis.reset();

            if (probeLen <= 0) return;

            // Detect ZIP magic bytes (PK\x03\x04) -> .xlsx
            boolean isZipArchive = probeLen >= 4
                    && probe[0] == 0x50 && probe[1] == 0x4B
                    && (probe[2] == 0x03 || probe[2] == 0x05 || probe[2] == 0x07);

            if (isZipArchive || (filename.endsWith(".xlsx") && !filename.endsWith(".csv"))) {
                if (!isZipArchive) {
                    // Fallback: file named .xlsx but actually plain CSV text
                    readCsvStream(bis, probe, probeLen, rowConsumer);
                } else {
                    readXlsxStream(bis, rowConsumer);
                }
            } else {
                readCsvStream(bis, probe, probeLen, rowConsumer);
            }
        }
    }

    private static void readXlsxStream(InputStream is, Consumer<List<String>> rowConsumer) throws Exception {
        try (ReadableWorkbook wb = new ReadableWorkbook(is)) {
            org.dhatim.fastexcel.reader.Sheet sheet = wb.getFirstSheet();
            try (Stream<org.dhatim.fastexcel.reader.Row> rowStream = sheet.openStream()) {
                Iterator<org.dhatim.fastexcel.reader.Row> it = rowStream.iterator();
                while (it.hasNext()) {
                    org.dhatim.fastexcel.reader.Row row = it.next();
                    int cellCount = row.getCellCount();
                    List<String> cells = new ArrayList<>(cellCount);
                    for (int i = 0; i < cellCount; i++) {
                        String val = row.getCellText(i);
                        cells.add(val != null ? val : "");
                    }
                    rowConsumer.accept(cells);
                }
            }
        }
    }

    private static void readCsvStream(InputStream is, byte[] probe, int probeLen, Consumer<List<String>> rowConsumer) throws Exception {
        Charset charset = detectCharset(probe, probeLen);
        char delimiter = detectDelimiter(probe, probeLen, charset);

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, charset), 65536)) {
            List<String> currentRow = new ArrayList<>(128);
            StringBuilder cell = new StringBuilder(64);
            boolean inQuotes = false;
            boolean firstChar = true;

            int ch;
            while ((ch = reader.read()) != -1) {
                if (firstChar) {
                    firstChar = false;
                    if (ch == '\uFEFF') {
                        continue; // Strip UTF-8 BOM
                    }
                }

                if (inQuotes) {
                    if (ch == '"') {
                        reader.mark(1);
                        int next = reader.read();
                        if (next == '"') {
                            cell.append('"');
                        } else {
                            inQuotes = false;
                            if (next != -1) {
                                reader.reset();
                            }
                        }
                    } else {
                        cell.append((char) ch);
                    }
                } else {
                    if (ch == '"' && cell.length() == 0) {
                        inQuotes = true;
                    } else if (ch == delimiter) {
                        currentRow.add(cell.toString());
                        cell.setLength(0);
                    } else if (ch == '\r') {
                        reader.mark(1);
                        int next = reader.read();
                        if (next != '\n' && next != -1) {
                            reader.reset();
                        }
                        currentRow.add(cell.toString());
                        cell.setLength(0);
                        rowConsumer.accept(currentRow);
                        currentRow = new ArrayList<>(currentRow.size());
                    } else if (ch == '\n') {
                        currentRow.add(cell.toString());
                        cell.setLength(0);
                        rowConsumer.accept(currentRow);
                        currentRow = new ArrayList<>(currentRow.size());
                    } else {
                        cell.append((char) ch);
                    }
                }
            }

            if (cell.length() > 0 || !currentRow.isEmpty()) {
                currentRow.add(cell.toString());
                rowConsumer.accept(currentRow);
            }
        }
    }

    private static Charset detectCharset(byte[] probe, int len) {
        if (len >= 3 && (probe[0] & 0xFF) == 0xEF && (probe[1] & 0xFF) == 0xBB && (probe[2] & 0xFF) == 0xBF) {
            return StandardCharsets.UTF_8;
        }
        // Validate if probe is valid UTF-8 (ignoring up to last 3 bytes in case a multi-byte char is split)
        int safeLen = Math.max(0, len - 4);
        CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        try {
            decoder.decode(ByteBuffer.wrap(probe, 0, safeLen > 0 ? safeLen : len));
            return StandardCharsets.UTF_8;
        } catch (CharacterCodingException e) {
            return Charset.forName("Windows-1252");
        }
    }

    private static char detectDelimiter(byte[] probe, int len, Charset charset) {
        String sample = new String(probe, 0, Math.min(len, 8192), charset);
        int nl = sample.indexOf('\n');
        String headerLine = nl > 0 ? sample.substring(0, nl) : sample;

        int semicolons = countCharOutsideQuotes(headerLine, ';');
        int commas = countCharOutsideQuotes(headerLine, ',');
        int tabs = countCharOutsideQuotes(headerLine, '\t');

        if (semicolons >= commas && semicolons >= tabs && semicolons > 0) return ';';
        if (tabs > commas && tabs > 0) return '\t';
        if (commas > 0) return ',';
        return ';';
    }

    private static int countCharOutsideQuotes(String line, char target) {
        int count = 0;
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') inQuotes = !inQuotes;
            else if (!inQuotes && c == target) count++;
        }
        return count;
    }
}
