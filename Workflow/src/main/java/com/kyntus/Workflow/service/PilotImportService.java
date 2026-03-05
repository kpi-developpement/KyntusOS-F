package com.kyntus.Workflow.service;

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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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
import java.util.stream.Stream;

@Service
public class PilotImportService {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ObjectWriter mapWriter;

    public PilotImportService(JdbcTemplate jdbcTemplate, DataSource dataSource, UserRepository userRepository, ObjectMapper objectMapper, PilotRecordRepository pilotRecordRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.mapWriter = objectMapper.writerFor(Map.class);
    }

    // 🚀🔥 IMPORTATION GOD-TIER (Vitesse Max + Logique Originale Anti-Doublon)
    public void importPilotExcel(MultipartFile file, Long pilotId, int year, int month, String category) throws Exception {
        User pilot = userRepository.findAll().stream()
                .filter(u -> u.getRole().toString().equals("PILOT"))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));

        Map<String, Set<Integer>> existingMap = new HashMap<>(250000);

        String checkSql = "SELECT eps_reference, dynamic_data::text FROM pilot_records WHERE pilot_id = ? AND import_year = ? AND import_month = ? AND category = ?";
        jdbcTemplate.setFetchSize(10000);

        jdbcTemplate.query(checkSql, rs -> {
            String eps = rs.getString(1);
            String dataJson = rs.getString(2);
            try {
                Map<String, Object> rawMap = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
                Map<String, String> normalizedMap = new HashMap<>(rawMap.size());
                for(Map.Entry<String, Object> e : rawMap.entrySet()) {
                    normalizedMap.put(e.getKey(), e.getValue() != null ? String.valueOf(e.getValue()).trim() : "");
                }
                existingMap.computeIfAbsent(eps, k -> new HashSet<>(2)).add(normalizedMap.hashCode());
            } catch (Exception ignored) {}
        }, pilot.getId(), year, month, category);

        String insertSql = "INSERT INTO pilot_records (eps_reference, dynamic_data, version, imported_at, pilot_id, import_year, import_month, category) VALUES (?, ?::jsonb, ?, ?, ?, ?, ?, ?)";
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());

        try (InputStream inputStream = file.getInputStream();
             ReadableWorkbook wb = new ReadableWorkbook(inputStream);
             Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(insertSql)) {

            conn.setAutoCommit(false);
            org.dhatim.fastexcel.reader.Sheet sheet = wb.getFirstSheet();

            try (Stream<org.dhatim.fastexcel.reader.Row> rowStream = sheet.openStream()) {
                Iterator<org.dhatim.fastexcel.reader.Row> rowIterator = rowStream.iterator();
                if (!rowIterator.hasNext()) return;

                org.dhatim.fastexcel.reader.Row headerRow = rowIterator.next();
                Map<Integer, String> colMap = new HashMap<>();
                int epsColIndex = -1;
                int versionColIndex = -1;

                for (int i = 0; i < headerRow.getCellCount(); i++) {
                    String colName = headerRow.getCellText(i);
                    if (colName != null && !colName.trim().isEmpty()) {
                        colName = colName.trim();
                        if (colName.equalsIgnoreCase("idIntervention") || colName.equalsIgnoreCase("EPS")) {
                            epsColIndex = i;
                        } else if (colName.equalsIgnoreCase("VER") || colName.equalsIgnoreCase("VERSION")) {
                            versionColIndex = i;
                        } else if (!colName.equalsIgnoreCase("IMPORT_DATE") && !colName.equalsIgnoreCase("IMPORTED_AT")) {
                            colMap.put(i, colName);
                        }
                    }
                }

                int batchCount = 0;
                while (rowIterator.hasNext()) {
                    org.dhatim.fastexcel.reader.Row row = rowIterator.next();
                    String eps = "";
                    String explicitVersion = "";
                    Map<String, String> dynamicData = new HashMap<>(colMap.size());
                    boolean rowIsEmpty = true;

                    for (int i = 0; i < row.getCellCount(); i++) {
                        String val = row.getCellText(i);
                        String cleanVal = (val != null) ? val.trim() : "";

                        if (i == epsColIndex) {
                            eps = cleanVal;
                            if (!eps.isEmpty()) rowIsEmpty = false;
                            continue;
                        }
                        if (i == versionColIndex) {
                            explicitVersion = cleanVal;
                            continue;
                        }

                        String colName = colMap.get(i);
                        if (colName == null) continue;
                        if (!cleanVal.isEmpty()) rowIsEmpty = false;
                        dynamicData.put(colName, cleanVal);
                    }

                    if (rowIsEmpty) continue;
                    if (eps.isEmpty()) eps = "AUTO-" + Long.toHexString(System.nanoTime());

                    int currentHash = dynamicData.hashCode();
                    Set<Integer> versionsSet = existingMap.getOrDefault(eps, Collections.emptySet());

                    if (versionsSet.contains(currentHash)) continue;

                    String finalVersion = (explicitVersion != null && !explicitVersion.isEmpty())
                            ? explicitVersion.toUpperCase()
                            : "V" + (versionsSet.size() + 1);

                    String currentDataJson = mapWriter.writeValueAsString(dynamicData);

                    ps.setString(1, eps);
                    ps.setString(2, currentDataJson);
                    ps.setString(3, finalVersion);
                    ps.setTimestamp(4, now);
                    ps.setLong(5, pilot.getId());
                    ps.setInt(6, year);
                    ps.setInt(7, month);
                    ps.setString(8, category);
                    ps.addBatch();

                    existingMap.computeIfAbsent(eps, k -> new HashSet<>(2)).add(currentHash);

                    batchCount++;
                    if (batchCount % 10000 == 0) {
                        ps.executeBatch();
                        conn.commit();
                        ps.clearBatch();
                    }
                }
                if (batchCount % 10000 != 0) {
                    ps.executeBatch();
                    conn.commit();
                }
            }
        }
    }

    // 🚀🔥 EXPORT GLOBAL (Vitesse Absolue)
    @Transactional(readOnly = true)
    public byte[] exportToExcel(Long pilotId, int year, int month, String category) throws Exception {
        String keysSql = "SELECT DISTINCT jsonb_object_keys(dynamic_data) FROM pilot_records WHERE import_year = ? AND import_month = ? AND category = ?";
        List<String> dbKeys = jdbcTemplate.queryForList(keysSql, String.class, year, month, category);

        Set<String> dynamicHeaders = new LinkedHashSet<>(dbKeys);
        dynamicHeaders.removeIf(h -> h.equalsIgnoreCase("idIntervention") || h.equalsIgnoreCase("EPS")
                || h.equalsIgnoreCase("etat") || h.equalsIgnoreCase("commentaire"));

        List<String> finalDynamicHeaders = new ArrayList<>(dynamicHeaders);
        StringBuilder sqlBuilder = new StringBuilder("SELECT eps_reference, version, dynamic_data->>'etat', dynamic_data->>'commentaire'");
        for (String h : finalDynamicHeaders) {
            sqlBuilder.append(", dynamic_data->>'").append(h.replace("'", "''")).append("'");
        }
        sqlBuilder.append(", imported_at FROM pilot_records WHERE import_year = ? AND import_month = ? AND category = ?");

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sqlBuilder.toString())) {

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
                int rowIdx = 1;
                while (rs.next()) {
                    org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                    for (int i = 1; i <= finalDynamicHeaders.size() + 5; i++) {
                        row.createCell(i - 1).setCellValue(rs.getString(i) != null ? rs.getString(i) : "");
                    }
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }

    // 🚀🔥 EXPORT HISTORIQUE (Fixing the missing method error)
    @Transactional(readOnly = true)
    public byte[] exportHistoryByEpsList(MultipartFile file, Long pilotId, int year, int month, String category) throws Exception {
        Set<String> inputEpsList = new LinkedHashSet<>();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        // 1. Lecture du fichier cible
        if (filename.endsWith(".txt") || filename.endsWith(".csv")) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) {
                    String eps = line.replace("\uFEFF", "").replace("\"", "").trim();
                    if (!eps.isEmpty() && !eps.equalsIgnoreCase("EPS") && !eps.equalsIgnoreCase("idIntervention")) {
                        inputEpsList.add(eps);
                    }
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
                            if (text != null && (text.trim().equalsIgnoreCase("EPS") || text.trim().equalsIgnoreCase("idIntervention"))) {
                                epsCol = i;
                            }
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

        // 2. Scan BDD ultra rapide (Native JSON)
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            for (int i = 0; i < epsArrayList.size(); i += batchSize) {
                List<String> subList = epsArrayList.subList(i, Math.min(i + batchSize, epsArrayList.size()));
                String inSql = String.join(",", Collections.nCopies(subList.size(), "?"));

                String sql = "SELECT eps_reference, version, dynamic_data->>'commentaire' FROM pilot_records " +
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
                            String comm = rs.getString(3);
                            allDiscoveredVersions.add(ver);
                            if (historyMap.containsKey(eps)) historyMap.get(eps).put(ver, comm != null ? comm : "-");
                        }
                    }
                }
            }
            conn.commit();
        }

        // 3. Tri et Génération Excel
        List<String> sortedVersions = new ArrayList<>(allDiscoveredVersions);
        sortedVersions.sort((v1, v2) -> {
            try {
                return Integer.compare(Integer.parseInt(v1.replaceAll("\\D+", "")), Integer.parseInt(v2.replaceAll("\\D+", "")));
            } catch (Exception e) { return v1.compareTo(v2); }
        });

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Historique EPS");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("EPS");
            for (int i = 0; i < sortedVersions.size(); i++) headerRow.createCell(i + 1).setCellValue("COM " + sortedVersions.get(i));

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

    // 🔥 SNIPER DELETE (Anti-Deadlock)
    public void clearRecordsByCategoryAndDate(String category, int year, int month) {
        String sql = "DELETE FROM pilot_records WHERE id IN (SELECT id FROM pilot_records WHERE category = ? AND import_year = ? AND import_month = ? LIMIT 10000)";
        int deleted;
        do {
            deleted = jdbcTemplate.update(sql, category, year, month);
            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        } while (deleted > 0);
    }
}