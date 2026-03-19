package com.kyntus.Workflow.service;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;

@Service
public class PilotTrackService {

    private final JdbcTemplate jdbcTemplate;
    private final JsonFactory jsonFactory;

    public PilotTrackService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.jsonFactory = objectMapper.getFactory();
    }

    // 🚀 1. EXTRACTION DES ETATS (POUR LE DROPDOWN FRONTEND)
    @Transactional(readOnly = true)
    public List<String> getAvailableEtats(String category, String yearStr, String monthStr) {
        Integer targetYear = (yearStr == null || yearStr.equalsIgnoreCase("ALL")) ? null : Integer.parseInt(yearStr);
        Integer targetMonth = (monthStr == null || monthStr.equalsIgnoreCase("ALL")) ? null : Integer.parseInt(monthStr);

        StringBuilder sql = new StringBuilder(
                "SELECT DISTINCT COALESCE(dynamic_data->>'etat', dynamic_data->>'statut') AS etat_val " +
                        "FROM pilot_records WHERE category = ? AND COALESCE(dynamic_data->>'etat', dynamic_data->>'statut') IS NOT NULL"
        );
        List<Object> params = new ArrayList<>();
        params.add(category);
        if (targetYear != null) { sql.append(" AND import_year = ?"); params.add(targetYear); }
        if (targetMonth != null) { sql.append(" AND import_month = ?"); params.add(targetMonth); }

        List<String> etats = jdbcTemplate.query(sql.toString(), (rs, rowNum) -> rs.getString("etat_val"), params.toArray());
        etats.removeIf(e -> e == null || e.trim().isEmpty());
        Collections.sort(etats);
        return etats;
    }

    // 🚀 2. EXPORT GLOBAL (AVEC FILTRE D'ETAT ET COLONNE LATEST VERSION) 🚀
    @Transactional(readOnly = true)
    public byte[] exportGlobalTrackHistory(List<String> epsList, String category, String yearStr, String monthStr, String etatFilter) throws Exception {

        Set<String> cleanEpsSet = new LinkedHashSet<>();
        if (epsList != null) {
            for (String eps : epsList) {
                if (eps == null) continue;
                String clean = eps.replace("\uFEFF", "").replace("\"", "").trim().toUpperCase();
                if (!clean.isEmpty() && !clean.equalsIgnoreCase("EPS") && !clean.equalsIgnoreCase("IDINTERVENTION")) {
                    cleanEpsSet.add(clean);
                }
            }
        }

        Integer targetYear = (yearStr == null || yearStr.equalsIgnoreCase("ALL")) ? null : Integer.parseInt(yearStr);
        Integer targetMonth = (monthStr == null || monthStr.equalsIgnoreCase("ALL")) ? null : Integer.parseInt(monthStr);

        boolean hasEtatFilter = etatFilter != null && !etatFilter.equalsIgnoreCase("ALL") && !etatFilter.trim().isEmpty();

        // Si Textarea est vide ET qu'on a choisi un Etat, on ramène tous les EPS avec cet état
        if (cleanEpsSet.isEmpty() && hasEtatFilter) {
            StringBuilder findSql = new StringBuilder("SELECT DISTINCT eps_reference FROM pilot_records WHERE category = ? AND (dynamic_data->>'etat' = ? OR dynamic_data->>'statut' = ?)");
            List<Object> params = new ArrayList<>();
            params.add(category); params.add(etatFilter); params.add(etatFilter);

            if (targetYear != null) { findSql.append(" AND import_year = ?"); params.add(targetYear); }
            if (targetMonth != null) { findSql.append(" AND import_month = ?"); params.add(targetMonth); }

            jdbcTemplate.query(findSql.toString(), rs -> {
                cleanEpsSet.add(rs.getString(1).toUpperCase());
            }, params.toArray());

        } else if (!cleanEpsSet.isEmpty() && hasEtatFilter) {
            Set<String> matchingEps = new HashSet<>();
            StringBuilder findSql = new StringBuilder("SELECT DISTINCT eps_reference FROM pilot_records WHERE eps_reference = ANY(?) AND category = ? AND (dynamic_data->>'etat' = ? OR dynamic_data->>'statut' = ?)");

            try (Connection conn = Objects.requireNonNull(jdbcTemplate.getDataSource()).getConnection();
                 PreparedStatement ps = conn.prepareStatement(findSql.toString())) {
                Array sqlArray = conn.createArrayOf("text", cleanEpsSet.toArray(new String[0]));
                ps.setArray(1, sqlArray); ps.setString(2, category); ps.setString(3, etatFilter); ps.setString(4, etatFilter);
                try (ResultSet rs = ps.executeQuery()) { while (rs.next()) matchingEps.add(rs.getString(1).toUpperCase()); }
            }
            cleanEpsSet.retainAll(matchingEps);
        }

        if (cleanEpsSet.isEmpty()) {
            throw new RuntimeException("Aucun EPS correspondant aux critères n'a été trouvé.");
        }

        Map<String, Map<String, String>> historyMap = new HashMap<>(cleanEpsSet.size(), 1.0f);
        // 🔥 NOUVELLE MAP POUR STOCKER LA DERNIERE VERSION DE CHAQUE EPS 🔥
        Map<String, String> latestVersionMap = new HashMap<>(cleanEpsSet.size(), 1.0f);

        for (String eps : cleanEpsSet) {
            historyMap.put(eps, new HashMap<>());
            latestVersionMap.put(eps, "V1"); // Valeur par défaut
        }
        Set<String> allDiscoveredVersions = new HashSet<>();

        List<String> epsArrayList = new ArrayList<>(cleanEpsSet);
        int batchSize = 30000;

        try (Connection conn = Objects.requireNonNull(jdbcTemplate.getDataSource()).getConnection()) {
            conn.setAutoCommit(false);

            for (int i = 0; i < epsArrayList.size(); i += batchSize) {
                List<String> subList = epsArrayList.subList(i, Math.min(i + batchSize, epsArrayList.size()));

                StringBuilder sql = new StringBuilder("SELECT eps_reference, version, dynamic_data FROM pilot_records WHERE eps_reference = ANY(?) AND category = ?");
                if (targetYear != null) sql.append(" AND import_year = ?");
                if (targetMonth != null) sql.append(" AND import_month = ?");
                sql.append(" ORDER BY import_year ASC, import_month ASC, file_rank ASC, id ASC");

                try (PreparedStatement ps = conn.prepareStatement(sql.toString())) {
                    ps.setFetchSize(10000);

                    Array sqlArray = conn.createArrayOf("text", subList.toArray(new String[0]));
                    int pIdx = 1;
                    ps.setArray(pIdx++, sqlArray); ps.setString(pIdx++, category);
                    if (targetYear != null) ps.setInt(pIdx++, targetYear);
                    if (targetMonth != null) ps.setInt(pIdx++, targetMonth);

                    try (ResultSet rs = ps.executeQuery()) {
                        while (rs.next()) {
                            String eps = rs.getString(1);
                            if (eps != null) eps = eps.toUpperCase();
                            String ver = rs.getString(2) != null ? rs.getString(2).trim().toUpperCase() : "V1";
                            String dataJson = rs.getString(3);

                            String comm = "-";
                            String etat = "";

                            if (dataJson != null) {
                                try (JsonParser parser = jsonFactory.createParser(dataJson)) {
                                    while (!parser.isClosed()) {
                                        JsonToken token = parser.nextToken();
                                        if (token == null) break;
                                        if (token == JsonToken.FIELD_NAME) {
                                            String key = parser.getCurrentName();
                                            parser.nextToken();
                                            if (key.equalsIgnoreCase("commentaire") || key.equalsIgnoreCase("comment")) {
                                                comm = parser.getText();
                                                if (comm == null || comm.trim().isEmpty()) comm = "-";
                                            } else if (key.equalsIgnoreCase("etat") || key.equalsIgnoreCase("statut")) {
                                                etat = parser.getText();
                                                if (etat == null) etat = "";
                                            }
                                        }
                                    }
                                } catch (Exception ignored) {}
                            }

                            // 🎯 Toujours mettre à jour la dernière version, peu importe l'état
                            latestVersionMap.put(eps, ver);

                            if (hasEtatFilter) {
                                if (!etat.equalsIgnoreCase(etatFilter)) {
                                    comm = "-";
                                }
                            }

                            allDiscoveredVersions.add(ver);
                            if (historyMap.containsKey(eps)) {
                                String existingComm = historyMap.get(eps).get(ver);
                                if (existingComm == null || existingComm.equals("-") || !comm.equals("-")) {
                                    historyMap.get(eps).put(ver, comm);
                                }
                            }
                        }
                    }
                }
            }
            conn.commit();
        }

        List<String> sortedVersions = new ArrayList<>(allDiscoveredVersions);
        sortedVersions.sort((v1, v2) -> {
            try { return Integer.compare(Integer.parseInt(v1.replaceAll("\\D+", "")), Integer.parseInt(v2.replaceAll("\\D+", ""))); } catch (Exception e) { return v1.compareTo(v2); }
        });
        if (sortedVersions.isEmpty()) sortedVersions.add("V1");

        // 4. GENERATION DE L'EXCEL
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            workbook.setCompressTempFiles(true);
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Global_Track_History");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("EPS");

            int colIndex = 1;
            for (String version : sortedVersions) {
                headerRow.createCell(colIndex++).setCellValue("COMMENTAIRE " + version);
            }

            // 🔥 NOUVELLE COLONNE A LA FIN 🔥
            headerRow.createCell(colIndex).setCellValue("LATEST VERSION");

            int rIdx = 1;
            for (String originalEps : cleanEpsSet) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                row.createCell(0).setCellValue(originalEps);
                Map<String, String> epsData = historyMap.get(originalEps);

                int cellIndex = 1;
                for (String version : sortedVersions) {
                    String commValue = (epsData != null && epsData.containsKey(version)) ? epsData.get(version) : "-";
                    row.createCell(cellIndex++).setCellValue(commValue);
                }

                // 🔥 ECRITURE DE LA DERNIERE VERSION POUR CET EPS 🔥
                String maxVersion = latestVersionMap.getOrDefault(originalEps, "V1");
                row.createCell(cellIndex).setCellValue(maxVersion);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }
}