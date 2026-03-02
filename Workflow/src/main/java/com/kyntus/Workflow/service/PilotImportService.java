package com.kyntus.Workflow.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.PilotRecordRepository;
import com.kyntus.Workflow.repository.UserRepository;

// 🔥 FastExcel Imports (Sans Sheet ni Row pour éviter le conflit)
import org.dhatim.fastexcel.reader.ReadableWorkbook;

// 🔥 Apache POI Imports (Utilisé pour l'Export)
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.concurrent.ConcurrentHashMap;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;
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

    // 📥 1. IMPORTATION MASSIVE (God Mode + FAST-EXCEL PARSER)
    // 📥 1. IMPORTATION MASSIVE (God Mode + FAST-EXCEL + MULTI-THREADING)
    @Transactional
    public void importPilotExcel(MultipartFile file, Long pilotId) throws Exception {
        long startTime = System.currentTimeMillis();
        System.out.println("🚀 [SYSTEM] Lancement de l'Importation God Mode (FastExcel + Hashing Multi-Core)...");

        User pilot = userRepository.findAll().stream()
                .filter(u -> u.getRole().toString().equals("PILOT"))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));

        // 1. Récupération du Cache depuis la DB
        String checkSql = "SELECT eps_reference, dynamic_data FROM pilot_records WHERE pilot_id = ?";
        List<Map<String, Object>> existingData = jdbcTemplate.queryForList(checkSql, pilot.getId());

        // 🔥 OPTIMIZATION 1 : ConcurrentHashMap + HashSet (Recherche instantanée O(1))
        Map<String, Set<Integer>> existingMap = new ConcurrentHashMap<>();

        // 🔥 OPTIMIZATION 2 : Parallel Stream (Utilise tous les cœurs du CPU pour créer le cache)
        existingData.parallelStream().forEach(dbRow -> {
            String eps = (String) dbRow.get("eps_reference");
            String dataJson = dbRow.get("dynamic_data").toString();
            try {
                Map<String, Object> rawMap = objectMapper.readValue(dataJson, new TypeReference<Map<String, Object>>() {});
                Map<String, String> normalizedMap = new HashMap<>();
                for(Map.Entry<String, Object> e : rawMap.entrySet()) {
                    normalizedMap.put(e.getKey(), e.getValue() != null ? String.valueOf(e.getValue()) : "");
                }
                int hash = normalizedMap.hashCode();

                // Insertion Thread-Safe ultra rapide
                existingMap.computeIfAbsent(eps, k -> ConcurrentHashMap.newKeySet()).add(hash);
            } catch (Exception e) {}
        });

        System.out.println("✅ [SYSTEM] Cache Hash généré en MULTI-THREAD. (" + existingData.size() + " records en RAM)");

        String insertSql = "INSERT INTO pilot_records (eps_reference, dynamic_data, version, imported_at, pilot_id) VALUES (?, ?::jsonb, ?, ?, ?)";
        List<Object[]> batchArgs = new ArrayList<>();
        int totalProcessed = 0;

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

                    // 🔥 OPTIMIZATION 1.5 : HashSet = 0 milliseconde de temps de recherche!
                    Set<Integer> versions = existingMap.computeIfAbsent(eps, k -> ConcurrentHashMap.newKeySet());

                    if (versions.contains(currentHash)) {
                        continue; // Doublon instantanément ignoré
                    }

                    String version = "V" + (versions.size() + 1);
                    String currentDataJson = objectMapper.writeValueAsString(dynamicData);

                    batchArgs.add(new Object[]{eps, currentDataJson, version, Timestamp.valueOf(LocalDateTime.now()), pilot.getId()});

                    versions.add(currentHash);
                    totalProcessed++;

                    if (batchArgs.size() >= 2000) {
                        jdbcTemplate.batchUpdate(insertSql, batchArgs);
                        batchArgs.clear();
                        System.out.println("🚀 [TURBO] " + totalProcessed + " NOUVELLES lignes insérées...");
                    }
                }
            }
        }

        if (!batchArgs.isEmpty()) {
            jdbcTemplate.batchUpdate(insertSql, batchArgs);
            System.out.println("🚀 [TURBO] Reste des " + totalProcessed + " lignes insérées...");
        } else if (totalProcessed == 0) {
            System.out.println("⚠️ [SYSTEM] Aucune nouvelle ligne à insérer (Toutes ignorées/doublons).");
        }

        long endTime = System.currentTimeMillis();
        System.out.println("✅ [IMPORT FINISHED] Temps total: " + (endTime - startTime) / 1000 + " secondes!");
    }


    // 📤 2. EXPORTATION MASSIVE (God Mode - Streaming DB to Excel - Zero RAM)
    @Transactional(readOnly = true)
    public byte[] exportToExcel(Long pilotId) throws Exception {
        System.out.println("📦 [SYSTEM] Génération EXTRÊME du fichier Excel en cours (Streaming DB -> Excel)...");
        long startTime = System.currentTimeMillis();

        // 🔥 OPTIMIZATION 1 : On jbed les en-têtes dynamiques b'zerba mn PostgreSQL direct (jsonb_object_keys)
        String keysSql = "SELECT DISTINCT jsonb_object_keys(dynamic_data) FROM pilot_records";
        List<String> dbKeys = jdbcTemplate.queryForList(keysSql, String.class);

        Set<String> dynamicHeaders = new LinkedHashSet<>(dbKeys);
        dynamicHeaders.removeIf(h -> h.equalsIgnoreCase("idIntervention") || h.equalsIgnoreCase("EPS")
                || h.equalsIgnoreCase("etat") || h.equalsIgnoreCase("commentaire"));

        // L'FIX DYAL L'ERREUR : On utilise explicitement le package POI (org.apache.poi...)
        try (org.apache.poi.xssf.streaming.SXSSFWorkbook workbook = new org.apache.poi.xssf.streaming.SXSSFWorkbook(1000)) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Kyntus Records");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            // Création de l'en-tête
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

            // 🔥 OPTIMIZATION 2 : Streaming JDBC (On ne charge pas les 200k lignes en RAM !)
            String sql = "SELECT eps_reference, version, dynamic_data, imported_at FROM pilot_records";

            final int[] rowIdx = {1}; // Tableau 7it hna wast Callback

            // On demande à PostgreSQL de nous envoyer les lignes 5000 par 5000 (Fetch Size)
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
                    Map<String, Object> data = objectMapper.readValue(dataJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});

                    row.createCell(cIdx++).setCellValue(getMapValueIgnoreCase(data, "etat"));
                    row.createCell(cIdx++).setCellValue(getMapValueIgnoreCase(data, "commentaire"));

                    for (String h : finalDynamicHeaders) {
                        Object val = data.get(h);
                        row.createCell(cIdx++).setCellValue(val != null ? val.toString() : "");
                    }
                } catch (Exception e) {
                    // En cas de pépin, on skip les colonnes dynamiques de cette ligne
                    cIdx += 2 + finalDynamicHeaders.size();
                }

                row.createCell(cIdx++).setCellValue(importedAt != null ? importedAt.toString() : "");
            });

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose(); // Kaymsse7 l'cache temporel dyal SXSSF mn l'disque dur

            long endTime = System.currentTimeMillis();
            System.out.println("✅ [EXPORT FINISHED] Temps total: " + (endTime - startTime) / 1000 + " secondes pour " + (rowIdx[0] - 1) + " lignes!");
            return out.toByteArray();
        }
    }

    // 🗑️ 3. CLEAN DB
    @Transactional
    public void clearAllRecords() {
        jdbcTemplate.execute("TRUNCATE TABLE pilot_records RESTART IDENTITY CASCADE");
        System.out.println("🗑️ [SYSTEM] Base de données nettoyée avec succès.");
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