package com.kyntus.Workflow.service;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.PilotRecordRepository;
import com.kyntus.Workflow.repository.UserRepository;

import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct; // 🔥 IMPORT JDID BASH YKHDEM L'INDEX AUTO

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class PilotImportService {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final JsonFactory jsonFactory;
    private final ObjectWriter mapWriter;

    public PilotImportService(JdbcTemplate jdbcTemplate, DataSource dataSource, UserRepository userRepository, ObjectMapper objectMapper, PilotRecordRepository pilotRecordRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.jsonFactory = objectMapper.getFactory();
        this.mapWriter = objectMapper.writerFor(Map.class);
    }

    // 🚀 L'INTELLIGENCE D'LES ARCHITECTES: CREATION AUTO DES INDEX POUR LA RAPIDITE 🚀
    @PostConstruct
    public void initIndexes() {
        try {
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_pilot_records_main ON pilot_records(category, import_year, import_month)");
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_pilot_records_eps ON pilot_records(eps_reference)");
            System.out.println("✅ [KYNTUS NEXUS] BDD Indexes Vérifiés & Optimisés (Vitesse x100).");
        } catch (Exception e) {
            System.out.println("⚠️ [KYNTUS NEXUS] Impossible de créer les Index (peut-être déjà existants).");
        }
    }

    public static class EpsRecord {
        public String eps;
        public int fileRank;
        public String dataJson;
        public int dataHash;
        public String sourceFile;

        public EpsRecord(String eps, int fileRank, String dataJson, int dataHash, String sourceFile) {
            this.eps = eps; this.fileRank = fileRank; this.dataJson = dataJson; this.dataHash = dataHash; this.sourceFile = sourceFile;
        }
    }

    private int computeDataHash(Map<String, String> data) {
        TreeMap<String, String> sorted = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (Map.Entry<String, String> entry : data.entrySet()) {
            String val = entry.getValue() == null ? "" : entry.getValue().trim();
            if (!val.isEmpty()) {
                sorted.put(entry.getKey().trim(), val);
            }
        }
        return sorted.toString().hashCode();
    }

    private int computeDataHashFromJson(String dataJson) {
        try {
            Map<String, Object> rawMap = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
            Map<String, String> strMap = new HashMap<>();
            for(Map.Entry<String, Object> e : rawMap.entrySet()) {
                strMap.put(e.getKey(), e.getValue() != null ? String.valueOf(e.getValue()) : "");
            }
            return computeDataHash(strMap);
        } catch(Exception e) { return 0; }
    }

    private int extractFileRank(String filename) {
        if (filename == null) return 999999999;
        Matcher prefixMatcher = Pattern.compile("^(\\d+)-").matcher(filename);
        if (prefixMatcher.find()) {
            return Integer.parseInt(prefixMatcher.group(1));
        }
        Matcher dateMatcher = Pattern.compile("(\\d{2})(\\d{2})(\\d{4})").matcher(filename);
        if (dateMatcher.find()) {
            String day = dateMatcher.group(1);
            String month = dateMatcher.group(2);
            String year = dateMatcher.group(3);
            return Integer.parseInt(year + month + day);
        }
        return 999999999;
    }

    public void importPilotExcelBatch(List<MultipartFile> files, Long pilotId, int year, int month, String category) throws Exception {
        List<MultipartFile> mutableFiles = new ArrayList<>(files);
        mutableFiles.sort((f1, f2) -> {
            int r1 = extractFileRank(f1.getOriginalFilename());
            int r2 = extractFileRank(f2.getOriginalFilename());
            return Integer.compare(r1, r2);
        });

        for (MultipartFile file : mutableFiles) {
            importPilotExcel(file, pilotId, year, month, category);
        }
    }

    public void importPilotExcel(MultipartFile file, Long pilotId, int year, int month, String category) throws Exception {
        User pilot = userRepository.findAll().stream()
                .filter(u -> u.getRole().toString().equals("PILOT"))
                .findFirst().orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));
        Long resolvedPilotId = pilot.getId();

        String rawFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "UNKNOWN";
        String filename = new java.io.File(rawFilename).getName();

        int currentFileRank = extractFileRank(filename);

        try (InputStream inputStream = file.getInputStream();
             ReadableWorkbook wb = new ReadableWorkbook(inputStream)) {
            org.dhatim.fastexcel.reader.Sheet sheet = wb.getFirstSheet();
            try (Stream<org.dhatim.fastexcel.reader.Row> rowStream = sheet.openStream()) {
                Iterator<org.dhatim.fastexcel.reader.Row> rowIterator = rowStream.iterator();
                if (!rowIterator.hasNext()) return;

                org.dhatim.fastexcel.reader.Row headerRow = rowIterator.next();
                Map<Integer, String> colMap = new HashMap<>();
                int epsColIndex = -1;

                for (int i = 0; i < headerRow.getCellCount(); i++) {
                    String colName = headerRow.getCellText(i);
                    if (colName != null && !colName.trim().isEmpty()) {
                        colName = colName.trim();
                        if (colName.equalsIgnoreCase("idIntervention") || colName.equalsIgnoreCase("EPS")) epsColIndex = i;
                        else if (!colName.equalsIgnoreCase("IMPORT_DATE") && !colName.equalsIgnoreCase("VER") && !colName.equalsIgnoreCase("VERSION")) colMap.put(i, colName);
                    }
                }

                List<EpsRecord> batch = new ArrayList<>();
                try (Connection conn = dataSource.getConnection()) {
                    conn.setAutoCommit(false);

                    while (rowIterator.hasNext()) {
                        org.dhatim.fastexcel.reader.Row row = rowIterator.next();
                        String eps = "";
                        Map<String, String> dynamicData = new HashMap<>(colMap.size());
                        boolean rowIsEmpty = true;

                        for (int i = 0; i < row.getCellCount(); i++) {
                            String val = row.getCellText(i);
                            String cleanVal = (val != null) ? val.trim() : "";
                            if (i == epsColIndex) { eps = cleanVal; if (!eps.isEmpty()) rowIsEmpty = false; continue; }
                            String colName = colMap.get(i);
                            if (colName == null) continue;
                            if (!cleanVal.isEmpty()) rowIsEmpty = false;
                            dynamicData.put(colName, cleanVal);
                        }

                        if (rowIsEmpty) continue;
                        if (eps.isEmpty()) eps = "AUTO-" + Long.toHexString(System.nanoTime());

                        int dataHash = computeDataHash(dynamicData);
                        String dataJson = mapWriter.writeValueAsString(dynamicData);
                        batch.add(new EpsRecord(eps, currentFileRank, dataJson, dataHash, filename));

                        if (batch.size() >= 5000) {
                            processAndInsertBatch(conn, batch, resolvedPilotId, year, month, category);
                            batch.clear();
                        }
                    }
                    if (!batch.isEmpty()) {
                        processAndInsertBatch(conn, batch, resolvedPilotId, year, month, category);
                    }
                }
            }
        }
    }

    private void processAndInsertBatch(Connection conn, List<EpsRecord> batch, Long pilotId, int year, int month, String category) throws Exception {
        Set<String> epsSet = batch.stream().map(r -> r.eps).collect(Collectors.toSet());

        String inSql = String.join(",", Collections.nCopies(epsSet.size(), "?"));
        String fetchLatestSql = "SELECT eps_reference, dynamic_data, version FROM (" +
                "  SELECT eps_reference, dynamic_data, version, " +
                "         ROW_NUMBER() OVER(PARTITION BY eps_reference ORDER BY file_rank DESC, id DESC) as rn " +
                "  FROM pilot_records " +
                "  WHERE category = ? AND import_year = ? AND import_month = ? AND eps_reference IN (" + inSql + ")" +
                ") t WHERE rn = 1";

        Map<String, Integer> dbLatestHashes = new HashMap<>();
        Map<String, Integer> dbLatestVersions = new HashMap<>();

        try (PreparedStatement psFetch = conn.prepareStatement(fetchLatestSql)) {
            psFetch.setString(1, category);
            psFetch.setInt(2, year);
            psFetch.setInt(3, month);
            int pIdx = 4;
            for (String eps : epsSet) psFetch.setString(pIdx++, eps);

            try (ResultSet rs = psFetch.executeQuery()) {
                while (rs.next()) {
                    String eps = rs.getString(1);
                    String dbJson = rs.getString(2);
                    String verStr = rs.getString(3);

                    dbLatestHashes.put(eps, computeDataHashFromJson(dbJson));

                    int vNum = 0;
                    if (verStr != null && verStr.toUpperCase().startsWith("V")) {
                        try { vNum = Integer.parseInt(verStr.substring(1)); } catch (Exception ignored) {}
                    }
                    dbLatestVersions.put(eps, vNum);
                }
            }
        }

        String insertSql = "INSERT INTO pilot_records (eps_reference, dynamic_data, version, imported_at, pilot_id, import_year, import_month, category, source_file, file_rank) VALUES (?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?)";
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        int insertCount = 0;

        try (PreparedStatement psInsert = conn.prepareStatement(insertSql)) {
            for (EpsRecord rec : batch) {
                Integer lastHash = dbLatestHashes.get(rec.eps);
                int lastVNum = dbLatestVersions.getOrDefault(rec.eps, 0);

                if (lastHash == null || lastHash != rec.dataHash) {
                    String newVersion = "V" + (lastVNum + 1);

                    psInsert.setString(1, rec.eps);
                    psInsert.setString(2, rec.dataJson);
                    psInsert.setString(3, newVersion);
                    psInsert.setTimestamp(4, now);
                    psInsert.setLong(5, pilotId);
                    psInsert.setInt(6, year);
                    psInsert.setInt(7, month);
                    psInsert.setString(8, category);
                    psInsert.setString(9, rec.sourceFile);
                    psInsert.setInt(10, rec.fileRank);
                    psInsert.addBatch();
                    insertCount++;

                    dbLatestHashes.put(rec.eps, rec.dataHash);
                    dbLatestVersions.put(rec.eps, lastVNum + 1);
                }
            }
            if (insertCount > 0) psInsert.executeBatch();
        }
        conn.commit();
    }

    @Transactional(readOnly = true)
    public List<String> getImportedFiles(String category, int year, int month) {
        String sql = "SELECT DISTINCT source_file FROM pilot_records WHERE category = ? AND import_year = ? AND import_month = ? AND source_file IS NOT NULL";
        List<String> files = jdbcTemplate.queryForList(sql, String.class, category, year, month);

        files.sort((f1, f2) -> {
            int r1 = extractFileRank(f1);
            int r2 = extractFileRank(f2);
            return Integer.compare(r1, r2);
        });

        return files;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void deleteSpecificFile(String category, int year, int month, String filename) {
        String sql = "DELETE FROM pilot_records WHERE category = ? AND import_year = ? AND import_month = ? AND source_file = ?";
        jdbcTemplate.update(sql, category, year, month, filename);
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel(Long pilotId, int year, int month, String category) throws Exception {
        String keysSql = "SELECT DISTINCT jsonb_object_keys(dynamic_data) FROM pilot_records WHERE import_year = ? AND import_month = ? AND category = ?";
        List<String> dbKeys = jdbcTemplate.queryForList(keysSql, String.class, year, month, category);

        Set<String> dynamicHeaders = new LinkedHashSet<>(dbKeys);
        dynamicHeaders.removeIf(h -> h.equalsIgnoreCase("idIntervention") || h.equalsIgnoreCase("EPS")
                || h.equalsIgnoreCase("etat") || h.equalsIgnoreCase("commentaire"));

        List<String> finalDynamicHeaders = new ArrayList<>(dynamicHeaders);
        Map<String, Integer> headerIndexMap = new HashMap<>();
        for (int i = 0; i < finalDynamicHeaders.size(); i++) headerIndexMap.put(finalDynamicHeaders.get(i), i + 4);

        String finalSql = "SELECT eps_reference, version, dynamic_data, imported_at FROM pilot_records WHERE import_year = ? AND import_month = ? AND category = ?";

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(finalSql)) {

            conn.setAutoCommit(false);
            ps.setFetchSize(10000);
            ps.setInt(1, year); ps.setInt(2, month); ps.setString(3, category);

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet(category + " Export");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            int hIdx = 0;
            headerRow.createCell(hIdx++).setCellValue("idIntervention");
            headerRow.createCell(hIdx++).setCellValue("VER");
            headerRow.createCell(hIdx++).setCellValue("ETAT");
            headerRow.createCell(hIdx++).setCellValue("COMMENTAIRE");
            for (String h : finalDynamicHeaders) headerRow.createCell(hIdx++).setCellValue(h);
            headerRow.createCell(hIdx).setCellValue("IMPORT_DATE");

            try (ResultSet rs = ps.executeQuery()) {
                int rowNum = 1;
                while (rs.next()) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(rs.getString(1) != null ? rs.getString(1) : "");
                    row.createCell(1).setCellValue(rs.getString(2) != null ? rs.getString(2) : "");
                    java.sql.Timestamp importedAt = rs.getTimestamp(4);
                    String dataJson = rs.getString(3);

                    try (JsonParser parser = jsonFactory.createParser(dataJson)) {
                        while (!parser.isClosed()) {
                            JsonToken token = parser.nextToken();
                            if (token == null) break;
                            if (token == JsonToken.FIELD_NAME) {
                                String key = parser.getCurrentName();
                                parser.nextToken();
                                String value = parser.getText();

                                if (key.equalsIgnoreCase("etat")) row.createCell(2).setCellValue(value);
                                else if (key.equalsIgnoreCase("commentaire")) row.createCell(3).setCellValue(value);
                                else {
                                    Integer colIdx = headerIndexMap.get(key);
                                    if (colIdx != null) row.createCell(colIdx).setCellValue(value != null ? value : "");
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                    row.createCell(finalDynamicHeaders.size() + 4).setCellValue(importedAt != null ? importedAt.toString() : "");
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportHistoryByEpsList(MultipartFile file, Long pilotId, int year, int month, String category) throws Exception {
        Set<String> inputEpsList = new LinkedHashSet<>();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        if (filename.endsWith(".txt") || filename.endsWith(".csv")) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) {
                    String eps = line.replace("\uFEFF", "").replace("\"", "").trim();
                    if (!eps.isEmpty() && !eps.equalsIgnoreCase("EPS") && !eps.equalsIgnoreCase("idIntervention")) inputEpsList.add(eps);
                }
            }
        } else {
            try (InputStream is = file.getInputStream();
                 ReadableWorkbook wb = new ReadableWorkbook(is)) {
                org.dhatim.fastexcel.reader.Sheet sheet = wb.getFirstSheet();
                try (Stream<org.dhatim.fastexcel.reader.Row> rowStream = sheet.openStream()) {
                    Iterator<org.dhatim.fastexcel.reader.Row> it = rowStream.iterator();
                    if (it.hasNext()) {
                        org.dhatim.fastexcel.reader.Row header = it.next();
                        int epsCol = 0;
                        for (int i = 0; i < header.getCellCount(); i++) {
                            String text = header.getCellText(i);
                            if (text != null && (text.trim().equalsIgnoreCase("EPS") || text.trim().equalsIgnoreCase("idIntervention"))) epsCol = i;
                        }
                        while (it.hasNext()) {
                            org.dhatim.fastexcel.reader.Row row = it.next();
                            if (row.getCellCount() > epsCol) {
                                String val = row.getCellText(epsCol);
                                if (val != null && !val.trim().isEmpty()) inputEpsList.add(val.trim());
                            }
                        }
                    }
                }
            }
        }

        if (inputEpsList.isEmpty()) throw new RuntimeException("Aucun EPS trouvé.");
        Map<String, Map<String, String>> historyMap = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (String eps : inputEpsList) historyMap.put(eps, new HashMap<>());

        Set<String> allDiscoveredVersions = new HashSet<>();
        List<String> epsArrayList = new ArrayList<>(inputEpsList);
        int batchSize = 5000;

        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            for (int i = 0; i < epsArrayList.size(); i += batchSize) {
                List<String> subList = epsArrayList.subList(i, Math.min(i + batchSize, epsArrayList.size()));
                String inSql = String.join(",", Collections.nCopies(subList.size(), "?"));

                String sql = "SELECT eps_reference, version, dynamic_data FROM pilot_records " +
                        "WHERE import_year = ? AND import_month = ? AND category = ? AND LOWER(TRIM(eps_reference)) IN (" + inSql + ") ORDER BY id ASC";

                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setFetchSize(5000);
                    ps.setInt(1, year); ps.setInt(2, month); ps.setString(3, category);
                    int pIdx = 4;
                    for(String s : subList) ps.setString(pIdx++, s.toLowerCase().trim());

                    try (ResultSet rs = ps.executeQuery()) {
                        while (rs.next()) {
                            String eps = rs.getString(1);
                            String ver = rs.getString(2) != null ? rs.getString(2).trim().toUpperCase() : "V1";
                            String dataJson = rs.getString(3);
                            String comm = "-";

                            try (JsonParser parser = jsonFactory.createParser(dataJson)) {
                                while (!parser.isClosed()) {
                                    JsonToken token = parser.nextToken();
                                    if (token == null) break;
                                    if (token == JsonToken.FIELD_NAME && parser.getCurrentName().equalsIgnoreCase("commentaire")) {
                                        parser.nextToken();
                                        comm = parser.getText();
                                        if(comm == null || comm.trim().isEmpty()) comm = "-";
                                        break;
                                    }
                                }
                            } catch (Exception ignored) {}

                            allDiscoveredVersions.add(ver);
                            if (historyMap.containsKey(eps)) historyMap.get(eps).put(ver, comm);
                        }
                    }
                }
            }
            conn.commit();
        }

        List<String> sortedVersions = new ArrayList<>(allDiscoveredVersions);
        sortedVersions.sort((v1, v2) -> {
            try {
                return Integer.compare(Integer.parseInt(v1.replaceAll("\\D+", "")), Integer.parseInt(v2.replaceAll("\\D+", "")));
            } catch (Exception e) { return v1.compareTo(v2); }
        });

        if (sortedVersions.isEmpty()) sortedVersions.add("V1");

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            workbook.setCompressTempFiles(true);
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Historique EPS");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("EPS");
            for (int i = 0; i < sortedVersions.size(); i++) headerRow.createCell(i + 1).setCellValue("COMMENTAIRE " + sortedVersions.get(i));

            int rIdx = 1;
            for (String originalEps : inputEpsList) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                row.createCell(0).setCellValue(originalEps);
                Map<String, String> epsData = historyMap.get(originalEps);
                for (int i = 0; i < sortedVersions.size(); i++) {
                    row.createCell(i + 1).setCellValue((epsData != null && epsData.containsKey(sortedVersions.get(i))) ? epsData.get(sortedVersions.get(i)) : "Non trouvé");
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void clearRecordsByCategoryAndDate(String category, int year, int month) {
        String sql = "DELETE FROM pilot_records WHERE id IN (SELECT id FROM pilot_records WHERE category = ? AND import_year = ? AND import_month = ? LIMIT 10000)";
        int deletedRows;
        do {
            deletedRows = jdbcTemplate.update(sql, category, year, month);
            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        } while (deletedRows > 0);
    }

    @Transactional(readOnly = true)
    public List<String> getValidationAlerts(String category, int year, int month) {
        String sql = "SELECT eps_reference, dynamic_data FROM pilot_records " +
                "WHERE category = ? AND import_year = ? AND import_month = ? " +
                "ORDER BY eps_reference, file_rank ASC, id ASC";

        Map<String, List<String>> epsHistory = new HashMap<>();

        jdbcTemplate.query(sql, rs -> {
            String eps = rs.getString("eps_reference");
            String dataJson = rs.getString("dynamic_data");

            String statut = "";
            try (JsonParser parser = jsonFactory.createParser(dataJson)) {
                while (!parser.isClosed()) {
                    JsonToken token = parser.nextToken();
                    if (token == null) break;
                    if (token == JsonToken.FIELD_NAME) {
                        String key = parser.getCurrentName();
                        parser.nextToken();
                        if (key.equalsIgnoreCase("statut") || key.equalsIgnoreCase("etat")) {
                            statut = parser.getText();
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {}

            epsHistory.computeIfAbsent(eps, k -> new ArrayList<>()).add(statut != null ? statut.trim() : "");
        }, category, year, month);

        List<String> blockedEps = new ArrayList<>();

        for (Map.Entry<String, List<String>> entry : epsHistory.entrySet()) {
            List<String> statuses = entry.getValue();
            if (statuses.size() >= 2) {
                String lastStatus = statuses.get(statuses.size() - 1);
                String secondToLastStatus = statuses.get(statuses.size() - 2);

                if (lastStatus.toLowerCase().contains("valide") || lastStatus.toLowerCase().contains("validé") || lastStatus.toLowerCase().contains("ok")) {
                    continue;
                }

                if (lastStatus.equalsIgnoreCase("EN_ATTENTE_VALIDATION_BYTEL") &&
                        secondToLastStatus.equalsIgnoreCase("EN_ATTENTE_VALIDATION_BYTEL")) {
                    blockedEps.add(entry.getKey());
                }
            }
        }
        return blockedEps;
    }

    private String normalizeText(String text) {
        if (text == null) return "";
        return text.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
    }

    @Transactional(readOnly = true)
    public List<String> getDuplicateCommentAlerts(String category, int year, int month) {
        String sql = "SELECT eps_reference, dynamic_data FROM pilot_records " +
                "WHERE category = ? AND import_year = ? AND import_month = ? " +
                "ORDER BY eps_reference, file_rank ASC, id ASC";

        Map<String, List<Map<String, String>>> epsHistory = new HashMap<>();

        jdbcTemplate.query(sql, rs -> {
            String eps = rs.getString("eps_reference");
            String dataJson = rs.getString("dynamic_data");

            String commentaire = "";
            String etat = "";
            try (JsonParser parser = jsonFactory.createParser(dataJson)) {
                while (!parser.isClosed()) {
                    JsonToken token = parser.nextToken();
                    if (token == null) break;
                    if (token == JsonToken.FIELD_NAME) {
                        String key = parser.getCurrentName();
                        parser.nextToken();
                        if (key.equalsIgnoreCase("commentaire") || key.equalsIgnoreCase("comment")) {
                            commentaire = parser.getText();
                        } else if (key.equalsIgnoreCase("etat") || key.equalsIgnoreCase("statut")) {
                            etat = parser.getText();
                        }
                    }
                }
            } catch (Exception ignored) {}

            Map<String, String> recordData = new HashMap<>();
            recordData.put("etat", etat != null ? etat.trim() : "");
            recordData.put("commentaire", commentaire != null ? commentaire.trim() : "");

            epsHistory.computeIfAbsent(eps, k -> new ArrayList<>()).add(recordData);
        }, category, year, month);

        List<String> duplicateEps = new ArrayList<>();

        for (Map.Entry<String, List<Map<String, String>>> entry : epsHistory.entrySet()) {
            List<Map<String, String>> history = entry.getValue();

            if (history.size() >= 2) {
                Map<String, String> latestRecord = history.get(history.size() - 1);
                String latestEtat = latestRecord.get("etat");
                String latestCommentRaw = latestRecord.get("commentaire");

                if (latestEtat != null && latestEtat.equalsIgnoreCase("EN_ATTENTE_VALIDATION_BYTEL")) {
                    String latestCommentNorm = normalizeText(latestCommentRaw);

                    if (latestCommentNorm.isEmpty() || latestCommentNorm.equals("null")) {
                        continue;
                    }

                    boolean foundDuplicate = false;
                    for (int i = 0; i < history.size() - 1; i++) {
                        String prevCommentNorm = normalizeText(history.get(i).get("commentaire"));
                        if (latestCommentNorm.equals(prevCommentNorm)) {
                            foundDuplicate = true;
                            break;
                        }
                    }

                    if (foundDuplicate) {
                        duplicateEps.add(entry.getKey());
                    }
                }
            }
        }
        return duplicateEps;
    }

    @Transactional(readOnly = true)
    public byte[] exportAnomaliesToExcel(String category, int year, int month) throws Exception {
        return executeAnomalyExport(category, year, month, getValidationAlerts(category, year, month), "Anomalies_Statut");
    }

    @Transactional(readOnly = true)
    public byte[] exportDuplicateCommentsToExcel(String category, int year, int month) throws Exception {
        return executeAnomalyExport(category, year, month, getDuplicateCommentAlerts(category, year, month), "Anomalies_Commentaires");
    }

    private byte[] executeAnomalyExport(String category, int year, int month, List<String> anomalousEpsList, String sheetName) throws Exception {
        if (anomalousEpsList.isEmpty()) {
            throw new RuntimeException("Aucune anomalie trouvée pour l'export.");
        }
        Set<String> anomalousSet = new HashSet<>(anomalousEpsList);

        String keysSql = "SELECT DISTINCT jsonb_object_keys(dynamic_data) FROM pilot_records WHERE import_year = ? AND import_month = ? AND category = ?";
        List<String> dbKeys = jdbcTemplate.queryForList(keysSql, String.class, year, month, category);

        Set<String> dynamicHeaders = new LinkedHashSet<>(dbKeys);
        dynamicHeaders.removeIf(h -> h.equalsIgnoreCase("idIntervention") || h.equalsIgnoreCase("EPS")
                || h.equalsIgnoreCase("etat") || h.equalsIgnoreCase("commentaire"));

        List<String> finalDynamicHeaders = new ArrayList<>(dynamicHeaders);
        Map<String, Integer> headerIndexMap = new HashMap<>();
        for (int i = 0; i < finalDynamicHeaders.size(); i++) headerIndexMap.put(finalDynamicHeaders.get(i), i + 4);

        String finalSql = "SELECT DISTINCT ON (eps_reference) eps_reference, version, dynamic_data, imported_at " +
                "FROM pilot_records " +
                "WHERE import_year = ? AND import_month = ? AND category = ? " +
                "ORDER BY eps_reference, file_rank DESC, id DESC";

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(finalSql)) {

            conn.setAutoCommit(false);
            ps.setFetchSize(10000);
            ps.setInt(1, year); ps.setInt(2, month); ps.setString(3, category);

            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet(sheetName);
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            int hIdx = 0;
            headerRow.createCell(hIdx++).setCellValue("idIntervention");
            headerRow.createCell(hIdx++).setCellValue("VER");
            headerRow.createCell(hIdx++).setCellValue("ETAT");
            headerRow.createCell(hIdx++).setCellValue("COMMENTAIRE");
            for (String h : finalDynamicHeaders) headerRow.createCell(hIdx++).setCellValue(h);
            headerRow.createCell(hIdx).setCellValue("IMPORT_DATE");

            try (ResultSet rs = ps.executeQuery()) {
                int rowNum = 1;
                while (rs.next()) {
                    String eps = rs.getString(1);
                    if (!anomalousSet.contains(eps)) continue;

                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(eps != null ? eps : "");
                    row.createCell(1).setCellValue(rs.getString(2) != null ? rs.getString(2) : "");
                    java.sql.Timestamp importedAt = rs.getTimestamp(4);
                    String dataJson = rs.getString(3);

                    try (JsonParser parser = jsonFactory.createParser(dataJson)) {
                        while (!parser.isClosed()) {
                            JsonToken token = parser.nextToken();
                            if (token == null) break;
                            if (token == JsonToken.FIELD_NAME) {
                                String key = parser.getCurrentName();
                                parser.nextToken();
                                String value = parser.getText();

                                if (key.equalsIgnoreCase("etat")) row.createCell(2).setCellValue(value);
                                else if (key.equalsIgnoreCase("commentaire")) row.createCell(3).setCellValue(value);
                                else {
                                    Integer colIdx = headerIndexMap.get(key);
                                    if (colIdx != null) row.createCell(colIdx).setCellValue(value != null ? value : "");
                                }
                            }
                        }
                    } catch (Exception ignored) {}
                    row.createCell(finalDynamicHeaders.size() + 4).setCellValue(importedAt != null ? importedAt.toString() : "");
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }
    // 🚀 LE NETTOYEUR QUANTIQUE : Supprime les versions dupliquées et garde la plus récente 🚀
    @Transactional
    public int removeDuplicates() {
        // Cette requête magique groupe par EPS et Version, et supprime tout sauf le dernier inséré (MAX id)
        String sql = "DELETE FROM pilot_records " +
                "WHERE id NOT IN (" +
                "  SELECT MAX(id) " +
                "  FROM pilot_records " +
                "  GROUP BY eps_reference, version, category, import_year, import_month" +
                ")";
        return jdbcTemplate.update(sql);
    }
}