package com.kyntus.Workflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.PilotRecordRepository;
import com.kyntus.Workflow.repository.UserRepository;

import org.dhatim.fastexcel.reader.ReadableWorkbook;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

@Service
public class PilotImportService {

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final PilotRecordRepository pilotRecordRepository;

    public PilotImportService(JdbcTemplate jdbcTemplate, UserRepository userRepository, ObjectMapper objectMapper, PilotRecordRepository pilotRecordRepository) {
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.pilotRecordRepository = pilotRecordRepository;
    }

    @Transactional
    public void importPilotExcel(MultipartFile file, Long pilotId) throws Exception {
        User pilot = userRepository.findAll().stream()
                .filter(u -> u.getRole().toString().equals("PILOT"))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));

        String checkSql = "SELECT eps_reference, dynamic_data FROM pilot_records WHERE pilot_id = ?";
        List<Map<String, Object>> existingData = jdbcTemplate.queryForList(checkSql, pilot.getId());

        Map<String, Set<Integer>> existingMap = new ConcurrentHashMap<>();

        existingData.parallelStream().forEach(dbRow -> {
            String eps = (String) dbRow.get("eps_reference");
            String dataJson = dbRow.get("dynamic_data").toString();
            try {
                Map<String, Object> rawMap = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
                Map<String, String> normalizedMap = new HashMap<>();
                for(Map.Entry<String, Object> e : rawMap.entrySet()) {
                    normalizedMap.put(e.getKey(), e.getValue() != null ? String.valueOf(e.getValue()) : "");
                }
                existingMap.computeIfAbsent(eps, k -> ConcurrentHashMap.newKeySet()).add(normalizedMap.hashCode());
            } catch (Exception e) {}
        });

        String insertSql = "INSERT INTO pilot_records (eps_reference, dynamic_data, version, imported_at, pilot_id) VALUES (?, ?::jsonb, ?, ?, ?)";
        List<Object[]> batchArgs = new ArrayList<>();

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
                        colMap.put(i, colName);
                        if (colName.equalsIgnoreCase("idIntervention") || colName.equalsIgnoreCase("EPS")) {
                            epsColIndex = i;
                        }
                    }
                }

                while (rowIterator.hasNext()) {
                    org.dhatim.fastexcel.reader.Row row = rowIterator.next();
                    String eps = "";
                    Map<String, String> dynamicData = new HashMap<>();
                    boolean isEmpty = true;

                    for (int i = 0; i < row.getCellCount(); i++) {
                        String colName = colMap.get(i);
                        if (colName == null) continue;

                        String val = row.getCellText(i);
                        val = (val != null) ? val.trim() : "";

                        if (!val.isEmpty()) isEmpty = false;
                        dynamicData.put(colName, val);

                        if (i == epsColIndex) {
                            eps = val;
                        }
                    }

                    if (isEmpty) continue;
                    if (eps.isEmpty()) eps = "AUTO-" + UUID.randomUUID().toString().substring(0, 8);

                    int currentHash = dynamicData.hashCode();
                    Set<Integer> versions = existingMap.computeIfAbsent(eps, k -> ConcurrentHashMap.newKeySet());

                    if (versions.contains(currentHash)) continue;

                    String version = "V" + (versions.size() + 1);
                    String currentDataJson = objectMapper.writeValueAsString(dynamicData);

                    batchArgs.add(new Object[]{eps, currentDataJson, version, Timestamp.valueOf(LocalDateTime.now()), pilot.getId()});

                    versions.add(currentHash);

                    if (batchArgs.size() >= 2000) {
                        jdbcTemplate.batchUpdate(insertSql, batchArgs);
                        batchArgs.clear();
                    }
                }
            }
        }

        if (!batchArgs.isEmpty()) {
            jdbcTemplate.batchUpdate(insertSql, batchArgs);
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportToExcel(Long pilotId) throws Exception {
        String keysSql = "SELECT DISTINCT jsonb_object_keys(dynamic_data) FROM pilot_records";
        List<String> dbKeys = jdbcTemplate.queryForList(keysSql, String.class);

        Set<String> dynamicHeaders = new LinkedHashSet<>(dbKeys);
        dynamicHeaders.removeIf(h -> h.equalsIgnoreCase("idIntervention") || h.equalsIgnoreCase("EPS")
                || h.equalsIgnoreCase("etat") || h.equalsIgnoreCase("commentaire"));

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(1000)) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Kyntus Records");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            int colIdx = 0;
            headerRow.createCell(colIdx++).setCellValue("idIntervention");
            headerRow.createCell(colIdx++).setCellValue("VER");
            headerRow.createCell(colIdx++).setCellValue("ETAT");
            headerRow.createCell(colIdx++).setCellValue("COMMENTAIRE");

            List<String> finalDynamicHeaders = new ArrayList<>(dynamicHeaders);
            for (String h : finalDynamicHeaders) {
                headerRow.createCell(colIdx++).setCellValue(h);
            }
            headerRow.createCell(colIdx++).setCellValue("IMPORT_DATE");

            String sql = "SELECT eps_reference, version, dynamic_data, imported_at FROM pilot_records";
            final int[] rowIdx = {1};
            jdbcTemplate.setFetchSize(5000);

            jdbcTemplate.query(sql, rs -> {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx[0]++);
                int cIdx = 0;

                String eps = rs.getString("eps_reference");
                String version = rs.getString("version");
                String dataJson = rs.getString("dynamic_data");
                java.sql.Timestamp importedAt = rs.getTimestamp("imported_at");

                row.createCell(cIdx++).setCellValue(eps != null ? eps : "");
                row.createCell(cIdx++).setCellValue(version != null ? version : "");

                try {
                    Map<String, Object> data = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
                    row.createCell(cIdx++).setCellValue(getMapValueIgnoreCase(data, "etat"));
                    row.createCell(cIdx++).setCellValue(getMapValueIgnoreCase(data, "commentaire"));
                    for (String h : finalDynamicHeaders) {
                        Object val = data.get(h);
                        row.createCell(cIdx++).setCellValue(val != null ? val.toString() : "");
                    }
                } catch (Exception e) {
                    cIdx += 2 + finalDynamicHeaders.size();
                }
                row.createCell(cIdx++).setCellValue(importedAt != null ? importedAt.toString() : "");
            });

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }

    @Transactional
    public void clearAllRecords() {
        jdbcTemplate.execute("TRUNCATE TABLE pilot_records RESTART IDENTITY CASCADE");
    }

    // 🚀🔥 LE MOTEUR HYBRIDE : LIT TXT ET EXCEL SANS RATER UN SEUL EPS
    @Transactional(readOnly = true)
    public byte[] exportHistoryByEpsList(MultipartFile file, Long pilotId) throws Exception {

        Set<String> inputEpsList = new LinkedHashSet<>();
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        // 1. LECTURE HYBRIDE (.TXT OU .XLSX)
        if (filename.endsWith(".txt") || filename.endsWith(".csv")) {
            try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) {
                    String eps = line.replace("\uFEFF", "").replace("\"", "").trim(); // Nettoyage Extrême
                    if (!eps.isEmpty() && !eps.equalsIgnoreCase("EPS") && !eps.equalsIgnoreCase("idIntervention")) {
                        inputEpsList.add(eps);
                    }
                }
            }
        } else {
            // Si jamais tu lui donnes un Excel par erreur, il le lit quand même !
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
                                if (val != null && !val.trim().isEmpty()) {
                                    inputEpsList.add(val.trim());
                                }
                            }
                        }
                    }
                }
            }
        }

        if (inputEpsList.isEmpty()) throw new RuntimeException("Aucun EPS trouvé dans le fichier.");

        Map<String, Map<String, String>> historyMap = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (String eps : inputEpsList) {
            historyMap.put(eps, new HashMap<>());
        }

        Set<String> allDiscoveredVersions = new HashSet<>();
        List<String> epsArrayList = new ArrayList<>(inputEpsList);
        int batchSize = 1000;

        // 2. RECHERCHE DANS LA BDD (SANS pilot_id pour être sûr de tout attraper)
        for (int i = 0; i < epsArrayList.size(); i += batchSize) {
            List<String> subList = epsArrayList.subList(i, Math.min(i + batchSize, epsArrayList.size()));

            String inSql = String.join(",", Collections.nCopies(subList.size(), "?"));
            // 🔥 Fix: Retrait de pilot_id = ? pour ne pas rater d'EPS
            String sql = "SELECT eps_reference, version, dynamic_data FROM pilot_records WHERE LOWER(TRIM(eps_reference)) IN (" + inSql + ") ORDER BY id ASC";

            List<Object> args = new ArrayList<>();
            for(String s : subList) args.add(s.toLowerCase().trim());

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, args.toArray());

            for (Map<String, Object> row : rows) {
                String eps = (String) row.get("eps_reference");
                String version = (String) row.get("version");

                if (version != null && !version.trim().isEmpty()) {
                    version = version.trim().toUpperCase();
                    allDiscoveredVersions.add(version);
                } else {
                    version = "V1";
                }

                Object dynDataObj = row.get("dynamic_data");
                String dataJson = dynDataObj != null ? dynDataObj.toString() : "{}";
                String commentaire = "-";

                try {
                    Map<String, Object> parsed = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
                    for (Map.Entry<String, Object> e : parsed.entrySet()) {
                        if (e.getKey() != null && e.getKey().trim().equalsIgnoreCase("commentaire")) {
                            commentaire = e.getValue() != null ? e.getValue().toString().trim() : "-";
                            if(commentaire.isEmpty()) commentaire = "-";
                            break;
                        }
                    }
                } catch (Exception ignored) {}

                if (historyMap.containsKey(eps)) {
                    historyMap.get(eps).put(version, commentaire);
                } else {
                    Map<String, String> vMap = new HashMap<>();
                    vMap.put(version, commentaire);
                    historyMap.put(eps, vMap);
                }
            }
        }

        // 3. TRI DES VERSIONS (V1, V2, V3...)
        List<String> sortedVersions = new ArrayList<>(allDiscoveredVersions);
        sortedVersions.sort((v1, v2) -> {
            try {
                int n1 = Integer.parseInt(v1.replaceAll("\\D+", ""));
                int n2 = Integer.parseInt(v2.replaceAll("\\D+", ""));
                return Integer.compare(n1, n2);
            } catch (Exception e) {
                return v1.compareTo(v2);
            }
        });

        // Sécurité si BDD vide
        if (sortedVersions.isEmpty()) {
            sortedVersions.add("V1");
        }

        // 4. GÉNÉRATION DE L'EXCEL FINAL
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(1000)) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Historique EPS");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            headerRow.createCell(0).setCellValue("EPS");
            int colIdx = 1;
            for (String v : sortedVersions) {
                headerRow.createCell(colIdx++).setCellValue("COMMENTAIRE " + v);
            }

            int rowIdx = 1;
            for (String originalEps : inputEpsList) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(originalEps);

                Map<String, String> epsData = historyMap.get(originalEps);
                int cellIdx = 1;
                for (String v : sortedVersions) {
                    // 🔥 SI L'EPS N'EXISTE PAS DANS LA BDD, IL L'ECRIT CLAIREMENT
                    String comm = (epsData != null && epsData.containsKey(v)) ? epsData.get(v) : "Introuvable dans BDD";
                    row.createCell(cellIdx++).setCellValue(comm);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }

    private String getMapValueIgnoreCase(Map<String, Object> map, String targetKey) {
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(targetKey)) {
                return entry.getValue() != null ? entry.getValue().toString() : "";
            }
        }
        return "";
    }
}