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

    // 🚀 L'IMPORTATION SECURISEE ET AUTONOME 🚀
    public void importPilotExcelSecure(MultipartFile file, Long pilotId, int year, int month, String category, int ignoredFrontendRank) throws Exception {
        User pilot = userRepository.findAll().stream()
                .filter(u -> u.getRole().toString().equals("PILOT"))
                .findFirst().orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));
        Long resolvedPilotId = pilot.getId();

        String rawFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "UNKNOWN";
        String filename = new java.io.File(rawFilename).getName();

        // 🔥 L-QALEB JDID HNA : L-Backend kay-7seb l-Rank rasso bash l-fichier dima ykoun f' sder 🔥
        String rankSql = "SELECT MAX(file_rank) FROM pilot_records WHERE category = ? AND import_year = ? AND import_month = ?";
        Integer maxRank = jdbcTemplate.queryForObject(rankSql, Integer.class, category, year, month);
        int finalFileRank = (maxRank != null ? maxRank : 0) + 1;

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

                List<PilotImportService.EpsRecord> batch = new ArrayList<>();
                int rowNumber = 1;
                boolean categoryFoundInFile = false;

                try (Connection conn = dataSource.getConnection()) {
                    conn.setAutoCommit(false);

                    try {
                        while (rowIterator.hasNext()) {
                            rowNumber++;
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

                            securityService.validatePeriodGuard(rowPeriode, year, month, rowNumber);

                            if (!categoryFoundInFile) {
                                if (securityService.isExpectedCategory(rowTypeIntervention, category)) {
                                    categoryFoundInFile = true;
                                }
                            }

                            if (eps.isEmpty()) eps = "AUTO-" + Long.toHexString(System.nanoTime());

                            int dataHash = computeDataHash(dynamicData);
                            String dataJson = mapWriter.writeValueAsString(dynamicData);

                            // 🔥 Kan-mrrirou l-Rank jdid l-Autonome 🔥
                            batch.add(new PilotImportService.EpsRecord(eps, finalFileRank, dataJson, dataHash, filename));

                            if (batch.size() >= 5000) {
                                processAndInsertBatch(conn, batch, resolvedPilotId, year, month, category);
                                batch.clear();
                            }
                        }
                        if (!batch.isEmpty()) {
                            processAndInsertBatch(conn, batch, resolvedPilotId, year, month, category);
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

    // 🚀 L'ALGO DE REORDERING POST-IMPORT 🚀
    @Transactional
    public void reorderImportedFiles(String category, int year, int month, List<String> orderedFilenames) {
        String sql = "UPDATE pilot_records SET file_rank = ? WHERE category = ? AND import_year = ? AND import_month = ? AND source_file = ?";

        int newRank = 1;
        for (String filename : orderedFilenames) {
            jdbcTemplate.update(sql, newRank, category, year, month, filename);
            newRank++;
        }
    }

    private void processAndInsertBatch(Connection conn, List<PilotImportService.EpsRecord> batch, Long pilotId, int year, int month, String category) throws Exception {
        Set<String> epsSet = batch.stream().map(r -> r.eps).collect(Collectors.toSet());
        String inSql = String.join(",", Collections.nCopies(epsSet.size(), "?"));

        // 🔥 Requête qui cherche la VRAIE dernière version grâce au nouveau file_rank correct 🔥
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
            for (PilotImportService.EpsRecord rec : batch) {
                Integer lastHash = dbLatestHashes.get(rec.eps);
                int lastVNum = dbLatestVersions.getOrDefault(rec.eps, 0);

                // 🔥 Hna l-Filtre d'Intelligence li kay-mne3 Duplication! 🔥
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
}