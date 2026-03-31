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

import javax.sql.DataSource;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream; // 👈 HA L-FIX! (Zidna Stream)

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

    // 📦 RECORD CUSTOM BASH N-SAUVIW SH-HER W L-3AM DYAL KOL EPS
    public static class SecureEpsRecord {
        public String eps;
        public int fileRank;
        public String dataJson;
        public int dataHash;
        public String sourceFile;
        public int targetYear;
        public int targetMonth;

        public SecureEpsRecord(String eps, int fileRank, String dataJson, int dataHash, String sourceFile, int targetYear, int targetMonth) {
            this.eps = eps; this.fileRank = fileRank; this.dataJson = dataJson; this.dataHash = dataHash;
            this.sourceFile = sourceFile; this.targetYear = targetYear; this.targetMonth = targetMonth;
        }
    }

    private int computeDataHash(Map<String, String> data) {
        TreeMap<String, String> sorted = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (Map.Entry<String, String> entry : data.entrySet()) {
            String val = entry.getValue() == null ? "" : entry.getValue().trim();
            if (!val.isEmpty()) sorted.put(entry.getKey().trim(), val);
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

    // 🪄 L-QALEB DYAL L-FILENAME (Kay-7afed 3la n-Nhar w L-3am, w kay-beddel ghir Sh-her!)
    private String adaptFilename(String originalFilename, int newMonth) {
        Matcher m = Pattern.compile("(\\d{2})(\\d{2})(\\d{4})").matcher(originalFilename);
        if (m.find()) {
            String day = m.group(1);
            String year = m.group(3);
            String newDateStr = String.format("%s%02d%s", day, newMonth, year);
            return originalFilename.substring(0, m.start()) + newDateStr + originalFilename.substring(m.end());
        }
        return originalFilename;
    }

    // 🚀 L-IMPORTATION SECURISEE ET AUTONOME (SMART ROUTING) 🚀
    public void importPilotExcelSecure(MultipartFile file, Long pilotId, int year, int month, String category, int ignoredFrontendRank) throws Exception {
        User pilot = userRepository.findAll().stream()
                .filter(u -> u.getRole().toString().equals("PILOT"))
                .findFirst().orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));
        Long resolvedPilotId = pilot.getId();

        String rawFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "UNKNOWN";
        String filename = new java.io.File(rawFilename).getName();

        // 🗂️ CACHE BASH N-QRAW L-RANK W L-SMIYA MRRA WE7DA L-KOL SH-HER
        Map<Integer, Integer> sessionRankCache = new HashMap<>();
        Map<Integer, String> sessionFilenameCache = new HashMap<>();

        String rankSql = "SELECT MAX(file_rank) FROM pilot_records WHERE category = ? AND import_year = ? AND import_month = ?";

        // Initialisation dyal sh-her l-asli
        Integer maxRank = jdbcTemplate.queryForObject(rankSql, Integer.class, category, year, month);
        sessionRankCache.put(month, (maxRank != null ? maxRank : 0) + 1);
        sessionFilenameCache.put(month, filename);

        try (InputStream inputStream = file.getInputStream();
             ReadableWorkbook wb = new ReadableWorkbook(inputStream)) {
            org.dhatim.fastexcel.reader.Sheet sheet = wb.getFirstSheet();
            try (Stream<org.dhatim.fastexcel.reader.Row> rowStream = sheet.openStream()) {
                Iterator<org.dhatim.fastexcel.reader.Row> rowIterator = rowStream.iterator();
                if (!rowIterator.hasNext()) return;

                org.dhatim.fastexcel.reader.Row headerRow = rowIterator.next();
                Map<Integer, String> colMap = new HashMap<>();

                int epsColIndex = -1;
                int typeInterventionColIndex = -1;
                int periodeColIndex = -1;

                for (int i = 0; i < headerRow.getCellCount(); i++) {
                    String colName = headerRow.getCellText(i);
                    if (colName != null && !colName.trim().isEmpty()) {
                        colName = colName.trim();
                        if (colName.equalsIgnoreCase("idIntervention") || colName.equalsIgnoreCase("EPS")) epsColIndex = i;
                        else if (colName.equalsIgnoreCase("typeIntervention")) typeInterventionColIndex = i;
                        else if (colName.equalsIgnoreCase("periode") || colName.equalsIgnoreCase("période")) periodeColIndex = i;
                        else if (!colName.equalsIgnoreCase("IMPORT_DATE") && !colName.equalsIgnoreCase("VER") && !colName.equalsIgnoreCase("VERSION")) colMap.put(i, colName);
                    }
                }

                List<SecureEpsRecord> batch = new ArrayList<>();
                boolean categoryFoundInFile = false;

                try (Connection conn = dataSource.getConnection()) {
                    conn.setAutoCommit(false);

                    try {
                        while (rowIterator.hasNext()) {
                            org.dhatim.fastexcel.reader.Row row = rowIterator.next();
                            String eps = "";
                            Map<String, String> dynamicData = new HashMap<>(colMap.size());
                            boolean rowIsEmpty = true;

                            String rowTypeIntervention = "";
                            String rowPeriode = "";

                            for (int i = 0; i < row.getCellCount(); i++) {
                                String val = row.getCellText(i);
                                String cleanVal = (val != null) ? val.trim() : "";

                                if (i == epsColIndex) { eps = cleanVal; if (!eps.isEmpty()) rowIsEmpty = false; continue; }
                                if (i == typeInterventionColIndex) { rowTypeIntervention = cleanVal; }
                                if (i == periodeColIndex) { rowPeriode = cleanVal; }

                                String colName = colMap.get(i);
                                if (colName == null) continue;
                                if (!cleanVal.isEmpty()) rowIsEmpty = false;
                                dynamicData.put(colName, cleanVal);
                            }

                            if (rowIsEmpty) continue;

                            if (!categoryFoundInFile) {
                                if (securityService.isExpectedCategory(rowTypeIntervention, category)) {
                                    categoryFoundInFile = true;
                                }
                            }

                            // 🔥 THE SMART ROUTING STARTS HERE 🔥
                            int targetMonth = securityService.extractTargetMonth(rowPeriode, month);

                            // Ila lqina sh-her jdid m-tmerred, n-wjdou lih blastou!
                            if (!sessionRankCache.containsKey(targetMonth)) {
                                Integer mRank = jdbcTemplate.queryForObject(rankSql, Integer.class, category, year, targetMonth);
                                sessionRankCache.put(targetMonth, (mRank != null ? mRank : 0) + 1);
                                sessionFilenameCache.put(targetMonth, adaptFilename(filename, targetMonth));
                            }

                            int rowFileRank = sessionRankCache.get(targetMonth);
                            String rowFilename = sessionFilenameCache.get(targetMonth);

                            if (eps.isEmpty()) eps = "AUTO-" + Long.toHexString(System.nanoTime());

                            int dataHash = computeDataHash(dynamicData);
                            String dataJson = mapWriter.writeValueAsString(dynamicData);

                            // Kan-sauviw L-Record b' targetMonth w rowFilename L-M-rigla!
                            batch.add(new SecureEpsRecord(eps, rowFileRank, dataJson, dataHash, rowFilename, year, targetMonth));

                            if (batch.size() >= 5000) {
                                processGroupedBatch(conn, batch, resolvedPilotId, category);
                                batch.clear();
                            }
                        }

                        if (!batch.isEmpty()) {
                            processGroupedBatch(conn, batch, resolvedPilotId, category);
                        }

                        if (!categoryFoundInFile) {
                            throw new RuntimeException("🚨 SECURITY BREACH: Le fichier ["+filename+"] ne contient aucune intervention de type [" + category + "]. Fichier rejeté.");
                        }

                        conn.commit();

                    } catch (Exception e) {
                        conn.rollback();
                        throw e;
                    }
                }
            }
        }
    }

    // 🗂️ GROUPER L-BATCH BASH SPRING Y-INSERER KOL SH-HER B-WE7DOU
    private void processGroupedBatch(Connection conn, List<SecureEpsRecord> batch, Long pilotId, String category) throws Exception {
        Map<String, List<SecureEpsRecord>> groupedBatch = batch.stream()
                .collect(Collectors.groupingBy(r -> r.targetYear + "-" + r.targetMonth));

        for (List<SecureEpsRecord> group : groupedBatch.values()) {
            int gYear = group.get(0).targetYear;
            int gMonth = group.get(0).targetMonth;
            processAndInsertSubBatch(conn, group, pilotId, gYear, gMonth, category);
        }
    }

    // 🏗️ L-INSERTION FINALE (B' Sh-her W L-3am M-gadin)
    private void processAndInsertSubBatch(Connection conn, List<SecureEpsRecord> batch, Long pilotId, int year, int month, String category) throws Exception {
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
            psFetch.setString(1, category); psFetch.setInt(2, year); psFetch.setInt(3, month);
            int pIdx = 4;
            for (String eps : epsSet) psFetch.setString(pIdx++, eps);

            try (ResultSet rs = psFetch.executeQuery()) {
                while (rs.next()) {
                    String eps = rs.getString(1); String dbJson = rs.getString(2); String verStr = rs.getString(3);
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
            for (SecureEpsRecord rec : batch) {
                Integer lastHash = dbLatestHashes.get(rec.eps);
                int lastVNum = dbLatestVersions.getOrDefault(rec.eps, 0);

                if (lastHash == null || lastHash.intValue() != rec.dataHash) {
                    String newVersion = "V" + (lastVNum + 1);
                    psInsert.setString(1, rec.eps); psInsert.setString(2, rec.dataJson); psInsert.setString(3, newVersion);
                    psInsert.setTimestamp(4, now); psInsert.setLong(5, pilotId); psInsert.setInt(6, year);
                    psInsert.setInt(7, month); psInsert.setString(8, category); psInsert.setString(9, rec.sourceFile);
                    psInsert.setInt(10, rec.fileRank);
                    psInsert.addBatch();
                    insertCount++;

                    dbLatestHashes.put(rec.eps, rec.dataHash);
                    dbLatestVersions.put(rec.eps, lastVNum + 1);
                }
            }
            if (insertCount > 0) psInsert.executeBatch();
        }
    }

    // L-REORDERING BQA KIMA KAN (Kay-qssm b' sh-her)
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