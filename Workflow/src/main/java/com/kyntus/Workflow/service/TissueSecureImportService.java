package com.kyntus.Workflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.kyntus.Workflow.model.RecordImportLog;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.RecordImportLogRepository;
import com.kyntus.Workflow.repository.UserRepository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class TissueSecureImportService {

    private static final String DOMAIN = "TISSUE";

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ObjectWriter mapWriter;
    private final PilotSecurityService securityService;
    private final RecordImportLogRepository importLogRepository;

    public TissueSecureImportService(
            JdbcTemplate jdbcTemplate,
            DataSource dataSource,
            UserRepository userRepository,
            ObjectMapper objectMapper,
            PilotSecurityService securityService,
            RecordImportLogRepository importLogRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.mapWriter = objectMapper.writerFor(Map.class);
        this.securityService = securityService;
        this.importLogRepository = importLogRepository;
    }

    public List<RecordImportLog> getImportLogs(String category, int year, int month) {
        return importLogRepository.findTop100ByDomainAndCategoryAndImportYearAndImportMonthOrderByImportedAtDesc(
                DOMAIN, category, year, month);
    }

    private void saveImportLog(String category, int year, int month, String filename, String status,
                               int totalRows, int insertedRows, int duplicateRows, Set<Integer> routedMonths, String errorMessage) {
        try {
            RecordImportLog log = new RecordImportLog();
            log.setDomain(DOMAIN);
            log.setCategory(category);
            log.setImportYear(year);
            log.setImportMonth(month);
            log.setFilename(filename);
            log.setStatus(status);
            log.setTotalRows(totalRows);
            log.setInsertedRows(insertedRows);
            log.setDuplicateRows(duplicateRows);
            if (routedMonths != null && !routedMonths.isEmpty()) {
                List<Integer> sorted = new ArrayList<>(routedMonths);
                Collections.sort(sorted);
                log.setRoutedMonths(sorted.stream().map(m -> String.format("M-%02d", m)).collect(Collectors.joining(", ")));
            }
            log.setErrorMessage(errorMessage);
            log.setImportedAt(new Date());
            importLogRepository.save(log);
        } catch (Exception ignored) {}
    }

    @Transactional
    public int fixRetroactiveDuplicates() {
        String sql = "DELETE FROM tissue_records WHERE id NOT IN (SELECT MAX(id) FROM tissue_records GROUP BY eps_reference, category, import_year, import_month, dynamic_data::text)";
        return jdbcTemplate.update(sql);
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
        public int dataHash;
        public String sourceFile;
        public int fileRank, targetYear, targetMonth;

        public SecureEpsRecord(String eps, Map<String, String> cleanDataMap, int dataHash, int targetYear, int targetMonth) {
            this.eps = eps; this.cleanDataMap = cleanDataMap; this.dataHash = dataHash;
            this.targetYear = targetYear; this.targetMonth = targetMonth;
        }
    }

    private int generateDataHash(Map<String, String> data) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : data.entrySet()) {
            sb.append(entry.getKey().toLowerCase()).append("=").append(entry.getValue().toLowerCase()).append("|");
        }
        return sb.toString().hashCode();
    }

    private String adaptFilename(String originalFilename, int newMonth) {
        Matcher m = Pattern.compile("(\\d{2})(\\d{2})(\\d{4})").matcher(originalFilename);
        if (m.find()) {
            return originalFilename.substring(0, m.start()) + String.format("%s%02d%s", m.group(1), newMonth, m.group(3)) + originalFilename.substring(m.end());
        }
        return originalFilename;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public Map<String, Object> importTissueExcelSecure(MultipartFile file, Long pilotId, int year, int month, String category, int ignoredFrontendRank) throws Exception {
        long globalStartTime = System.currentTimeMillis();

        String safeCategory = category != null ? category.trim() : "";
        String filename = new java.io.File(file.getOriginalFilename() != null ? file.getOriginalFilename() : "UNKNOWN").getName();
        System.out.println("\n🚀 --- [TISSUE] DÉBUT TRAITEMENT: [" + filename + "] ---");

        AtomicInteger totalRowsCounter = new AtomicInteger(0);
        AtomicInteger insertedRowsCounter = new AtomicInteger(0);
        AtomicInteger duplicateRowsCounter = new AtomicInteger(0);
        Set<Integer> routedMonths = Collections.synchronizedSet(new LinkedHashSet<>());

        try {
            User pilot = userRepository.findAll().stream()
                    .filter(u -> u.getRole().toString().equals("PILOT"))
                    .findFirst().orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));
            Long resolvedPilotId = pilot.getId();

            Map<Integer, Integer> sessionRankCache = new HashMap<>();
            Map<Integer, String> sessionFilenameCache = new HashMap<>();
            Set<String> loadedCaches = new HashSet<>();
            Map<String, Set<Integer>> memoryShieldCache = new ConcurrentHashMap<>();

            String rankSql = "SELECT MAX(file_rank) FROM tissue_records WHERE category = ? AND import_year = ? AND import_month = ?";
            Integer maxRank = jdbcTemplate.queryForObject(rankSql, Integer.class, safeCategory, year, month);
            sessionRankCache.put(month, (maxRank != null ? maxRank : 0) + 1);
            sessionFilenameCache.put(month, filename);

            AtomicBoolean categoryFoundInFile = new AtomicBoolean(false);

            String upperFilename = filename.toUpperCase().replaceAll("[\\s_\\-]", "");
            if (safeCategory.equalsIgnoreCase("PRESTA") || safeCategory.equalsIgnoreCase("RZO")) {
                categoryFoundInFile.set(true);
            } else if (upperFilename.contains(safeCategory.toUpperCase().replaceAll("[\\s_\\-]", ""))) {
                categoryFoundInFile.set(true);
            }

            List<RawRow> buffer = new ArrayList<>(10000);

            try (Connection conn = dataSource.getConnection()) {
                conn.setAutoCommit(false);

                try (Statement st = conn.createStatement()) {
                    st.execute("CREATE TEMP TABLE IF NOT EXISTS temp_tissue_records (" +
                            "eps_reference VARCHAR, dynamic_data JSONB, data_hash INTEGER, " +
                            "source_file VARCHAR, file_rank INTEGER) ON COMMIT PRESERVE ROWS");
                }

                Map<Integer, String> colMap = new HashMap<>();
                int[] headerIdx = new int[] { -1, -1, -1 }; // 0=eps, 1=typeIntervention, 2=periode
                AtomicBoolean headerParsed = new AtomicBoolean(false);
                Exception[] streamError = new Exception[1];

                try {
                    TabularFileReader.readRows(file, cells -> {
                        if (streamError[0] != null) return;
                        try {
                            if (!headerParsed.get()) {
                                headerParsed.set(true);
                                for (int i = 0; i < cells.size(); i++) {
                                    String colName = cells.get(i);
                                    if (colName != null && !colName.trim().isEmpty()) {
                                        colName = colName.trim();
                                        String checkName = colName.toLowerCase().replaceAll("[\\s'’_\\-]", "");

                                        if (checkName.equals("idintervention") || checkName.equals("eps")) {
                                            if (headerIdx[0] == -1) headerIdx[0] = i;
                                        } else if (checkName.equals("typeintervention") || checkName.equals("typedintervention")) {
                                            if (headerIdx[1] == -1) {
                                                headerIdx[1] = i;
                                                colMap.put(i, colName);
                                            }
                                        } else if (checkName.equals("periode") || checkName.equals("période") || checkName.equals("priode")) {
                                            if (headerIdx[2] == -1) {
                                                headerIdx[2] = i;
                                                colMap.put(i, colName);
                                            }
                                        } else if (!checkName.equals("importdate") && !checkName.equals("ver") && !checkName.equals("version")) {
                                            colMap.put(i, colName);
                                        }
                                    }
                                }
                                return;
                            }

                            int epsColIndex = headerIdx[0];
                            int typeInterventionColIndex = headerIdx[1];
                            int periodeColIndex = headerIdx[2];

                            String eps = "", rowTypeIntervention = "", rowPeriode = "";
                            Map<String, String> data = new HashMap<>(colMap.size());
                            boolean rowIsEmpty = true;

                            for (int i = 0; i < cells.size(); i++) {
                                String val = cells.get(i);
                                String cleanVal = (val != null) ? val.trim() : "";

                                if (i == epsColIndex) { eps = cleanVal.toUpperCase(); if (!eps.isEmpty()) rowIsEmpty = false; continue; }
                                if (i == typeInterventionColIndex) rowTypeIntervention = cleanVal;
                                if (i == periodeColIndex) rowPeriode = cleanVal;

                                String colName = colMap.get(i);
                                if (colName == null) continue;
                                if (!cleanVal.isEmpty()) rowIsEmpty = false;
                                data.put(colName, cleanVal);
                            }

                            if (rowIsEmpty) return;
                            totalRowsCounter.incrementAndGet();
                            buffer.add(new RawRow(eps, rowTypeIntervention, rowPeriode, data));

                            if (buffer.size() >= 10000) {
                                processBufferChunk(conn, buffer, resolvedPilotId, year, month, safeCategory, filename,
                                        sessionRankCache, sessionFilenameCache, categoryFoundInFile, loadedCaches,
                                        memoryShieldCache, insertedRowsCounter, duplicateRowsCounter, routedMonths);
                                buffer.clear();
                            }
                        } catch (Exception ex) {
                            streamError[0] = ex;
                        }
                    });

                    if (streamError[0] != null) throw streamError[0];

                    if (!buffer.isEmpty()) {
                        processBufferChunk(conn, buffer, resolvedPilotId, year, month, safeCategory, filename,
                                sessionRankCache, sessionFilenameCache, categoryFoundInFile, loadedCaches,
                                memoryShieldCache, insertedRowsCounter, duplicateRowsCounter, routedMonths);
                        buffer.clear();
                    }

                    if (!categoryFoundInFile.get()) {
                        throw new RuntimeException("🚨 SECURITY BREACH: Le fichier [" + filename + "] ne contient aucune intervention valide.");
                    }

                } catch (Exception e) {
                    conn.rollback();
                    throw e;
                } finally {
                    try (Statement st = conn.createStatement()) { st.execute("DROP TABLE IF EXISTS temp_tissue_records"); } catch (Exception ignored) {}
                    System.gc();
                }
            }

            int totalRows = totalRowsCounter.get();
            int insertedRows = insertedRowsCounter.get();
            int duplicateRows = duplicateRowsCounter.get();
            String status = insertedRows > 0 ? "SUCCESS" : "DUPLICATE_ONLY";
            String routedStr = routedMonths.stream().sorted().map(m -> String.format("M-%02d", m)).collect(Collectors.joining(", "));

            saveImportLog(safeCategory, year, month, filename, status, totalRows, insertedRows, duplicateRows, routedMonths, null);

            long globalEndTime = System.currentTimeMillis();
            System.out.println("📊 --- [TISSUE] BILAN [" + filename + "] : " + totalRows + " lues | +" + insertedRows + " insérées | " + duplicateRows + " doublons | " + (globalEndTime - globalStartTime) + " ms ---");

            Map<String, Object> result = new HashMap<>();
            result.put("message", insertedRows > 0
                    ? "Fichier Tissue intégré avec succès (+" + insertedRows + " nouvelles lignes)"
                    : "Fichier Tissue scanné : toutes les lignes (" + duplicateRows + ") existaient déjà.");
            result.put("filename", filename);
            result.put("status", status);
            result.put("totalRows", totalRows);
            result.put("insertedRows", insertedRows);
            result.put("duplicateRows", duplicateRows);
            result.put("routedMonths", routedStr);
            return result;

        } catch (Exception e) {
            saveImportLog(safeCategory, year, month, filename, "ERROR",
                    totalRowsCounter.get(), insertedRowsCounter.get(), duplicateRowsCounter.get(), routedMonths, e.getMessage());
            throw e;
        }
    }

    private void ensureCacheLoaded(Connection conn, String category, int year, int month, Set<String> loadedCaches, Map<String, Set<Integer>> memoryShieldCache) throws Exception {
        String cacheKey = year + "-" + month;
        if (!loadedCaches.contains(cacheKey)) {
            long startTime = System.currentTimeMillis();
            String sql = "SELECT eps_reference, data_hash FROM tissue_records WHERE category = ? AND import_year = ? AND import_month = ? AND data_hash IS NOT NULL";

            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, category);
                ps.setInt(2, year);
                ps.setInt(3, month);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        String fullKey = rs.getString(1).toUpperCase() + "_" + cacheKey;
                        memoryShieldCache.computeIfAbsent(fullKey, k -> new HashSet<>()).add(rs.getInt(2));
                    }
                }
            }
            loadedCaches.add(cacheKey);
            System.out.println("🛡️ [TISSUE SHIELD] L'Historique complet chargé en RAM en " + (System.currentTimeMillis() - startTime) + "ms !");
        }
    }

    private void processBufferChunk(Connection conn, List<RawRow> buffer, Long pilotId, int defaultYear, int defaultMonth,
                                    String category, String originalFilename, Map<Integer, Integer> sessionRankCache,
                                    Map<Integer, String> sessionFilenameCache, AtomicBoolean categoryFoundInFile,
                                    Set<String> loadedCaches, Map<String, Set<Integer>> memoryShieldCache,
                                    AtomicInteger insertedRowsCounter, AtomicInteger duplicateRowsCounter,
                                    Set<Integer> routedMonths) throws Exception {

        List<SecureEpsRecord> processed = buffer.stream().map(r -> {
            if (!categoryFoundInFile.get() && securityService.isExpectedCategory(r.typeIntervention, category)) {
                categoryFoundInFile.set(true);
            }
            int targetMonth = securityService.extractTargetMonth(r.periode, defaultMonth);

            TreeMap<String, String> cleanData = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            r.data.forEach((k, v) -> {
                if (v != null && !v.isEmpty()) {
                    if (v.endsWith(".0") && v.matches("-?\\d+\\.0")) v = v.substring(0, v.length() - 2);
                    cleanData.put(k.trim(), v);
                }
            });

            int calculatedHash = generateDataHash(cleanData);
            String finalEps = r.eps.isEmpty() ? "AUTO-" + Math.abs(calculatedHash) : r.eps.toUpperCase();

            return new SecureEpsRecord(finalEps, cleanData, calculatedHash, defaultYear, targetMonth);
        }).collect(Collectors.toList());

        Map<String, List<SecureEpsRecord>> groupedBatch = processed.stream()
                .collect(Collectors.groupingBy(r -> r.targetYear + "-" + r.targetMonth));

        String rankSql = "SELECT MAX(file_rank) FROM tissue_records WHERE category = ? AND import_year = ? AND import_month = ?";

        for (List<SecureEpsRecord> group : groupedBatch.values()) {
            int gYear = group.get(0).targetYear;
            int gMonth = group.get(0).targetMonth;
            routedMonths.add(gMonth);
            String cacheKeyMap = gYear + "-" + gMonth;

            ensureCacheLoaded(conn, category, gYear, gMonth, loadedCaches, memoryShieldCache);

            if (!sessionRankCache.containsKey(gMonth)) {
                Integer mRank = jdbcTemplate.queryForObject(rankSql, Integer.class, category, gYear, gMonth);
                sessionRankCache.put(gMonth, (mRank != null ? mRank : 0) + 1);
                sessionFilenameCache.put(gMonth, adaptFilename(originalFilename, gMonth));
            }
            int rowFileRank = sessionRankCache.get(gMonth);
            String rowFilename = sessionFilenameCache.get(gMonth);

            List<SecureEpsRecord> pureNewData = group.stream().filter(rec -> {
                String fullKey = rec.eps + "_" + cacheKeyMap;
                Set<Integer> existingHashes = memoryShieldCache.get(fullKey);
                if (existingHashes != null && existingHashes.contains(rec.dataHash)) return false;
                rec.fileRank = rowFileRank;
                rec.sourceFile = rowFilename;
                return true;
            }).collect(Collectors.toList());

            int skippedInMemory = group.size() - pureNewData.size();
            duplicateRowsCounter.addAndGet(skippedInMemory);

            if (pureNewData.isEmpty()) {
                continue;
            }

            int actuallyInserted = executePureSqlMerge(conn, pureNewData, pilotId, gYear, gMonth, category);
            insertedRowsCounter.addAndGet(actuallyInserted);
            duplicateRowsCounter.addAndGet(Math.max(0, pureNewData.size() - actuallyInserted));

            for (SecureEpsRecord rec : pureNewData) {
                memoryShieldCache.computeIfAbsent(rec.eps + "_" + cacheKeyMap, k -> new HashSet<>()).add(rec.dataHash);
            }
        }
    }

    private int executePureSqlMerge(Connection conn, List<SecureEpsRecord> batch, Long pilotId, int year, int month, String category) throws Exception {
        try (Statement st = conn.createStatement()) {
            st.execute("TRUNCATE temp_tissue_records");
        }

        Map<String, SecureEpsRecord> uniqueBatch = new LinkedHashMap<>();
        for (SecureEpsRecord rec : batch) {
            uniqueBatch.put(rec.eps.toUpperCase(), rec);
        }

        String insertTempSql = "INSERT INTO temp_tissue_records (eps_reference, dynamic_data, data_hash, source_file, file_rank) VALUES (?, ?::jsonb, ?, ?, ?)";
        try (PreparedStatement psTemp = conn.prepareStatement(insertTempSql)) {
            for (SecureEpsRecord rec : uniqueBatch.values()) {
                psTemp.setString(1, rec.eps.toUpperCase());
                psTemp.setString(2, mapWriter.writeValueAsString(rec.cleanDataMap));
                psTemp.setInt(3, rec.dataHash);
                psTemp.setString(4, rec.sourceFile);
                psTemp.setInt(5, rec.fileRank);
                psTemp.addBatch();
            }
            psTemp.executeBatch();
        }

        String megaMergeSql =
                "WITH MaxVersions AS (" +
                        "    SELECT eps_reference, MAX(CAST(SUBSTRING(version FROM 2) AS INTEGER)) as max_v " +
                        "    FROM tissue_records WHERE category = ? AND import_year = ? AND import_month = ? " +
                        "    GROUP BY eps_reference " +
                        ") " +
                        "INSERT INTO tissue_records (eps_reference, dynamic_data, version, imported_at, pilot_id, import_year, import_month, category, source_file, file_rank, data_hash) " +
                        "SELECT " +
                        "    t.eps_reference, " +
                        "    t.dynamic_data, " +
                        "    'V' || (COALESCE(m.max_v, 0) + 1), " +
                        "    ?, ?, ?, ?, ?, t.source_file, t.file_rank, t.data_hash " +
                        "FROM temp_tissue_records t " +
                        "LEFT JOIN MaxVersions m ON t.eps_reference = m.eps_reference " +
                        "WHERE NOT EXISTS ( " +
                        "    SELECT 1 FROM tissue_records p2 " +
                        "    WHERE p2.eps_reference = t.eps_reference AND p2.data_hash = t.data_hash " +
                        "      AND p2.category = ? AND p2.import_year = ? AND p2.import_month = ? " +
                        ")";

        int inserted;
        try (PreparedStatement psMerge = conn.prepareStatement(megaMergeSql)) {
            psMerge.setString(1, category);
            psMerge.setInt(2, year);
            psMerge.setInt(3, month);
            psMerge.setTimestamp(4, Timestamp.valueOf(LocalDateTime.now()));
            psMerge.setLong(5, pilotId);
            psMerge.setInt(6, year);
            psMerge.setInt(7, month);
            psMerge.setString(8, category);
            psMerge.setString(9, category);
            psMerge.setInt(10, year);
            psMerge.setInt(11, month);
            inserted = psMerge.executeUpdate();
        }

        conn.commit();
        return inserted;
    }

    @Transactional
    public void reorderImportedFiles(String category, int year, int month, List<String> orderedFilenames) {
        String sql = "UPDATE tissue_records SET file_rank = ? WHERE category = ? AND import_year = ? AND import_month = ? AND source_file = ?";
        int newRank = 1;
        for (String filename : orderedFilenames) {
            jdbcTemplate.update(sql, newRank, category, year, month, filename);
            newRank++;
        }
    }
}
