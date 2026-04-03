package com.kyntus.Workflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.UserRepository;

import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import javax.sql.DataSource;
import java.io.InputStream;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
public class PilotSecureImportService {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ObjectWriter mapWriter;
    private final PilotSecurityService securityService;

    public PilotSecureImportService(JdbcTemplate jdbcTemplate, DataSource dataSource, UserRepository userRepository, ObjectMapper objectMapper, PilotSecurityService securityService) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.mapWriter = objectMapper.writerFor(Map.class);
        this.securityService = securityService;
    }

    @PostConstruct
    public void initIndexes() {
        try {
            jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_pilot_records_perf ON pilot_records(category, import_year, import_month, eps_reference)");
            System.out.println("✅ [KYNTUS NEXUS] Index Composite Optimisé (Vitesse Constante) !");
        } catch (Exception e) {
            System.out.println("⚠️ [KYNTUS NEXUS] Index déjà existant.");
        }
    }

    @Transactional
    public int fixRetroactiveDuplicates() {
        String sql = "DELETE FROM pilot_records " +
                "WHERE id NOT IN (" +
                "  SELECT MAX(id) " +
                "  FROM pilot_records " +
                "  GROUP BY eps_reference, category, import_year, import_month, dynamic_data::text" +
                ")";
        int deletedRows = jdbcTemplate.update(sql);
        return deletedRows;
    }

    private static class RawRow {
        String eps, typeIntervention, periode;
        Map<String, String> data;
        public RawRow(String eps, String typeIntervention, String periode, Map<String, String> data) {
            this.eps = eps; this.typeIntervention = typeIntervention; this.periode = periode; this.data = data;
        }
    }

    public static class SecureEpsRecord {
        public String eps;
        public Map<String, String> cleanDataMap;
        public String dataFingerprint;
        public String sourceFile;
        public int fileRank, targetYear, targetMonth;

        public SecureEpsRecord(String eps, Map<String, String> cleanDataMap, String dataFingerprint, int targetYear, int targetMonth) {
            this.eps = eps; this.cleanDataMap = cleanDataMap; this.dataFingerprint = dataFingerprint;
            this.targetYear = targetYear; this.targetMonth = targetMonth;
        }
    }

    private String generateDataFingerprint(Map<String, String> data) {
        return data.entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().trim().isEmpty())
                .map(e -> e.getKey().trim().toLowerCase() + "=" + e.getValue().trim().toLowerCase())
                .sorted()
                .collect(Collectors.joining("|"));
    }

    @SuppressWarnings("unchecked")
    private String extractFingerprintFromJson(String dataJson) {
        try {
            Map<String, Object> rawMap = objectMapper.readValue(dataJson, Map.class);
            Map<String, String> strMap = new HashMap<>();
            rawMap.forEach((k, v) -> {
                String val = (v != null) ? String.valueOf(v).trim() : "";
                if (!val.isEmpty()) strMap.put(k, val);
            });
            return generateDataFingerprint(strMap);
        } catch(Exception e) { return ""; }
    }

    private String adaptFilename(String originalFilename, int newMonth) {
        Matcher m = Pattern.compile("(\\d{2})(\\d{2})(\\d{4})").matcher(originalFilename);
        if (m.find()) {
            return originalFilename.substring(0, m.start()) + String.format("%s%02d%s", m.group(1), newMonth, m.group(3)) + originalFilename.substring(m.end());
        }
        return originalFilename;
    }

    // 🚀 L-IMPORTATION SECURISEE 🚀
    public void importPilotExcelSecure(MultipartFile file, Long pilotId, int year, int month, String category, int ignoredFrontendRank) throws Exception {
        // 🔥 FIX 1: N-Neqiyou l-Category mn ay espace zayed
        String safeCategory = category != null ? category.trim() : "";

        User pilot = userRepository.findAll().stream()
                .filter(u -> u.getRole().toString().equals("PILOT"))
                .findFirst().orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));
        Long resolvedPilotId = pilot.getId();

        String filename = new java.io.File(file.getOriginalFilename() != null ? file.getOriginalFilename() : "UNKNOWN").getName();

        Map<Integer, Integer> sessionRankCache = new HashMap<>();
        Map<Integer, String> sessionFilenameCache = new HashMap<>();
        String rankSql = "SELECT MAX(file_rank) FROM pilot_records WHERE category = ? AND import_year = ? AND import_month = ?";

        Integer maxRank = jdbcTemplate.queryForObject(rankSql, Integer.class, safeCategory, year, month);
        sessionRankCache.put(month, (maxRank != null ? maxRank : 0) + 1);
        sessionFilenameCache.put(month, filename);

        AtomicBoolean categoryFoundInFile = new AtomicBoolean(false);

        // 🚨 OVERRIDE ABSOLU W BULLETPROOF (RZO / PRESTA) 🚨
        String upperFilename = filename.toUpperCase().replaceAll("[\\s_\\-]", "");
        if (safeCategory.equalsIgnoreCase("PRESTA") || safeCategory.equalsIgnoreCase("RZO")) {
            // Kima bghiti, n-qeeblou ay fichier dyal PRESTA / RZO
            categoryFoundInFile.set(true);
        } else if (upperFilename.contains(safeCategory.toUpperCase().replaceAll("[\\s_\\-]", ""))) {
            categoryFoundInFile.set(true);
        }

        List<RawRow> buffer = new ArrayList<>(10000);

        try (InputStream inputStream = file.getInputStream();
             ReadableWorkbook wb = new ReadableWorkbook(inputStream)) {

            org.dhatim.fastexcel.reader.Sheet sheet = wb.getFirstSheet();

            try (Connection conn = dataSource.getConnection()) {
                conn.setAutoCommit(false);

                try (Stream<org.dhatim.fastexcel.reader.Row> rowStream = sheet.openStream()) {
                    Iterator<org.dhatim.fastexcel.reader.Row> rowIterator = rowStream.iterator();
                    if (!rowIterator.hasNext()) return;

                    org.dhatim.fastexcel.reader.Row headerRow = rowIterator.next();
                    Map<Integer, String> colMap = new HashMap<>();
                    int epsColIndex = -1, typeInterventionColIndex = -1, periodeColIndex = -1;

                    for (int i = 0; i < headerRow.getCellCount(); i++) {
                        String colName = headerRow.getCellText(i);
                        if (colName != null && !colName.trim().isEmpty()) {
                            colName = colName.trim();
                            String checkName = colName.toLowerCase().replaceAll("[\\s'’_\\-]", "");

                            if (checkName.equals("idintervention") || checkName.equals("eps")) {
                                if (epsColIndex == -1) epsColIndex = i;
                            }
                            else if (checkName.equals("typeintervention") || checkName.equals("typedintervention")) {
                                if (typeInterventionColIndex == -1) {
                                    typeInterventionColIndex = i;
                                    colMap.put(i, colName);
                                }
                            }
                            else if (checkName.equals("periode") || checkName.equals("période") || checkName.equals("priode")) {
                                if (periodeColIndex == -1) {
                                    periodeColIndex = i;
                                    colMap.put(i, colName);
                                }
                            }
                            else if (!checkName.equals("importdate") && !checkName.equals("ver") && !checkName.equals("version")) {
                                colMap.put(i, colName);
                            }
                        }
                    }

                    while (rowIterator.hasNext()) {
                        org.dhatim.fastexcel.reader.Row row = rowIterator.next();
                        String eps = "", rowTypeIntervention = "", rowPeriode = "";
                        Map<String, String> data = new HashMap<>(colMap.size());
                        boolean rowIsEmpty = true;

                        for (int i = 0; i < row.getCellCount(); i++) {
                            String val = row.getCellText(i);
                            String cleanVal = (val != null) ? val.trim() : "";

                            if (i == epsColIndex) { eps = cleanVal.toUpperCase(); if (!eps.isEmpty()) rowIsEmpty = false; continue; }
                            if (i == typeInterventionColIndex) rowTypeIntervention = cleanVal;
                            if (i == periodeColIndex) rowPeriode = cleanVal;

                            String colName = colMap.get(i);
                            if (colName == null) continue;
                            if (!cleanVal.isEmpty()) rowIsEmpty = false;
                            data.put(colName, cleanVal);
                        }

                        if (rowIsEmpty) continue;

                        buffer.add(new RawRow(eps, rowTypeIntervention, rowPeriode, data));

                        if (buffer.size() >= 10000) {
                            processBufferChunk(conn, buffer, resolvedPilotId, year, month, safeCategory, filename, sessionRankCache, sessionFilenameCache, categoryFoundInFile);
                            buffer.clear();
                        }
                    }

                    if (!buffer.isEmpty()) {
                        processBufferChunk(conn, buffer, resolvedPilotId, year, month, safeCategory, filename, sessionRankCache, sessionFilenameCache, categoryFoundInFile);
                        buffer.clear();
                    }

                    if (!categoryFoundInFile.get()) {
                        throw new RuntimeException("🚨 SECURITY BREACH [V20]: Le fichier ["+filename+"] ne contient aucune intervention de type [" + safeCategory + "]. Fichier rejeté.");
                    }

                    conn.commit();

                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                }
            }
        }
    }

    private void processBufferChunk(Connection conn, List<RawRow> buffer, Long pilotId, int defaultYear, int defaultMonth, String category, String originalFilename, Map<Integer, Integer> sessionRankCache, Map<Integer, String> sessionFilenameCache, AtomicBoolean categoryFoundInFile) throws Exception {

        List<SecureEpsRecord> processed = buffer.parallelStream().map(r -> {
            if (!categoryFoundInFile.get() && securityService.isExpectedCategory(r.typeIntervention, category)) {
                categoryFoundInFile.set(true);
            }
            int targetMonth = securityService.extractTargetMonth(r.periode, defaultMonth);
            String finalEps = r.eps.isEmpty() ? "AUTO-" + UUID.randomUUID().toString().substring(0,8) : r.eps;

            TreeMap<String, String> cleanData = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            r.data.forEach((k, v) -> {
                if (v != null && !v.isEmpty()) {
                    if (v.endsWith(".0") && v.matches("-?\\\\d+\\\\.0")) v = v.substring(0, v.length() - 2);
                    cleanData.put(k.trim(), v);
                }
            });

            return new SecureEpsRecord(finalEps, cleanData, generateDataFingerprint(cleanData), defaultYear, targetMonth);
        }).collect(Collectors.toList());

        Map<String, List<SecureEpsRecord>> groupedBatch = processed.stream()
                .collect(Collectors.groupingBy(r -> r.targetYear + "-" + r.targetMonth));

        String rankSql = "SELECT MAX(file_rank) FROM pilot_records WHERE category = ? AND import_year = ? AND import_month = ?";
        for (List<SecureEpsRecord> group : groupedBatch.values()) {
            int gYear = group.get(0).targetYear;
            int gMonth = group.get(0).targetMonth;

            if (!sessionRankCache.containsKey(gMonth)) {
                Integer mRank = jdbcTemplate.queryForObject(rankSql, Integer.class, category, gYear, gMonth);
                sessionRankCache.put(gMonth, (mRank != null ? mRank : 0) + 1);
                sessionFilenameCache.put(gMonth, adaptFilename(originalFilename, gMonth));
            }
            int rowFileRank = sessionRankCache.get(gMonth);
            String rowFilename = sessionFilenameCache.get(gMonth);

            group.forEach(r -> { r.fileRank = rowFileRank; r.sourceFile = rowFilename; });

            processAndInsertSubBatch(conn, group, pilotId, gYear, gMonth, category);
        }
    }

    private void processAndInsertSubBatch(Connection conn, List<SecureEpsRecord> batch, Long pilotId, int year, int month, String category) throws Exception {
        Set<String> epsSet = batch.stream().map(r -> r.eps).collect(Collectors.toSet());

        String inSql = String.join(",", Collections.nCopies(epsSet.size(), "?"));
        String fetchAllSql = "SELECT eps_reference, dynamic_data, version FROM pilot_records " +
                "WHERE category = ? AND import_year = ? AND import_month = ? AND eps_reference IN (" + inSql + ")";

        Map<String, Set<String>> dbAllFingerprints = new ConcurrentHashMap<>();
        Map<String, Integer> dbLatestVersions = new ConcurrentHashMap<>();

        List<String[]> rawDbRecords = new ArrayList<>();
        try (PreparedStatement psFetch = conn.prepareStatement(fetchAllSql)) {
            psFetch.setString(1, category);
            psFetch.setInt(2, year);
            psFetch.setInt(3, month);

            int pIdx = 4;
            for (String eps : epsSet) psFetch.setString(pIdx++, eps);

            try (ResultSet rs = psFetch.executeQuery()) {
                while (rs.next()) {
                    rawDbRecords.add(new String[]{ rs.getString(1).toUpperCase(), rs.getString(2), rs.getString(3) });
                }
            }
        }

        rawDbRecords.parallelStream().forEach(record -> {
            String eps = record[0];
            String dbJson = record[1];
            String verStr = record[2];

            String fingerprint = extractFingerprintFromJson(dbJson);
            dbAllFingerprints.computeIfAbsent(eps, k -> Collections.synchronizedSet(new HashSet<>())).add(fingerprint);

            int vNum = 0;
            if (verStr != null && verStr.toUpperCase().startsWith("V")) {
                try { vNum = Integer.parseInt(verStr.substring(1)); } catch (Exception ignored) {}
            }
            final int finalVNum = vNum;
            dbLatestVersions.compute(eps, (k, currentMax) -> (currentMax == null || finalVNum > currentMax) ? finalVNum : currentMax);
        });

        String insertSql = "INSERT INTO pilot_records (eps_reference, dynamic_data, version, imported_at, pilot_id, import_year, import_month, category, source_file, file_rank) VALUES (?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?)";
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());
        int insertCount = 0;

        try (PreparedStatement psInsert = conn.prepareStatement(insertSql)) {
            for (SecureEpsRecord rec : batch) {
                String normalizedEps = rec.eps.toUpperCase();
                Set<String> existingFingerprints = dbAllFingerprints.getOrDefault(normalizedEps, new HashSet<>());
                int lastVNum = dbLatestVersions.getOrDefault(normalizedEps, 0);

                if (!existingFingerprints.contains(rec.dataFingerprint)) {
                    String dataJson = mapWriter.writeValueAsString(rec.cleanDataMap);
                    String newVersion = "V" + (lastVNum + 1);

                    psInsert.setString(1, normalizedEps);
                    psInsert.setString(2, dataJson);
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

                    existingFingerprints.add(rec.dataFingerprint);
                    dbAllFingerprints.put(normalizedEps, existingFingerprints);
                    dbLatestVersions.put(normalizedEps, lastVNum + 1);
                }
            }
            if (insertCount > 0) psInsert.executeBatch();
        }
    }

    @Transactional
    public void reorderImportedFiles(String category, int year, int month, List<String> orderedFilenames) {
        String sql = "UPDATE pilot_records SET file_rank = ? WHERE category = ? AND import_year = ? AND import_month = ? AND source_file = ?";
        int newRank = 1;
        for (String filename : orderedFilenames) {
            jdbcTemplate.update(sql, newRank, category, year, month, filename);
            newRank++;
        }
    }
}