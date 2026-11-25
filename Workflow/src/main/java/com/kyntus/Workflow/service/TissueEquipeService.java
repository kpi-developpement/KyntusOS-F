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
public class TissueEquipeService {

    private final JdbcTemplate jdbcTemplate;
    private final JsonFactory jsonFactory;

    public TissueEquipeService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.jsonFactory = objectMapper.getFactory();
    }

    private String detectTeamAction(String comment) {
        if (comment == null || comment.trim().isEmpty()) return null;

        String normalized = comment.trim().toLowerCase().replaceAll("^[^a-z0-9]+", "");

        if (normalized.startsWith("valid") || normalized.startsWith("valïd") || normalized.startsWith("valied")) {
            return "VALIDE";
        }

        if (normalized.startsWith("contest") || normalized.startsWith("contaist") || normalized.startsWith("contast")) {
            return "CONTESTER";
        }

        return null;
    }

    @Transactional(readOnly = true)
    public byte[] exportEquipeTrackHistory(List<String> epsList, String category, String yearStr, String monthStr) throws Exception {

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

        if (cleanEpsSet.isEmpty()) {
            throw new RuntimeException("Aucun EPS valide trouvé pour l'export équipe Tissue.");
        }

        Integer targetYear = (yearStr == null || yearStr.equalsIgnoreCase("ALL")) ? null : Integer.parseInt(yearStr);
        Integer targetMonth = (monthStr == null || monthStr.equalsIgnoreCase("ALL")) ? null : Integer.parseInt(monthStr);

        Map<String, List<String>> equipeHistoryMap = new HashMap<>(cleanEpsSet.size(), 1.0f);
        for (String eps : cleanEpsSet) {
            equipeHistoryMap.put(eps, new ArrayList<>());
        }

        List<String> epsArrayList = new ArrayList<>(cleanEpsSet);
        int batchSize = 30000;

        try (Connection conn = Objects.requireNonNull(jdbcTemplate.getDataSource()).getConnection()) {
            conn.setAutoCommit(false);

            for (int i = 0; i < epsArrayList.size(); i += batchSize) {
                List<String> subList = epsArrayList.subList(i, Math.min(i + batchSize, epsArrayList.size()));

                StringBuilder sql = new StringBuilder("SELECT eps_reference, dynamic_data FROM tissue_records WHERE eps_reference = ANY(?) AND category = ?");
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
                            String dataJson = rs.getString(2);
                            String rawComment = "";

                            if (dataJson != null) {
                                try (JsonParser parser = jsonFactory.createParser(dataJson)) {
                                    while (!parser.isClosed()) {
                                        JsonToken token = parser.nextToken();
                                        if (token == null) break;
                                        if (token == JsonToken.FIELD_NAME) {
                                            String key = parser.getCurrentName();
                                            parser.nextToken();
                                            if (key.equalsIgnoreCase("commentaire") || key.equalsIgnoreCase("comment")) {
                                                rawComment = parser.getText();
                                                break;
                                            }
                                        }
                                    }
                                } catch (Exception ignored) {}
                            }

                            String actionEquipe = detectTeamAction(rawComment);

                            if (actionEquipe != null && equipeHistoryMap.containsKey(eps)) {
                                List<String> timeline = equipeHistoryMap.get(eps);
                                if (timeline.isEmpty() || !timeline.get(timeline.size() - 1).equals(rawComment)) {
                                    timeline.add(rawComment);
                                }
                            }
                        }
                    }
                }
            }
            conn.commit();
        }

        int maxVr = 1;
        for (List<String> timeline : equipeHistoryMap.values()) {
            if (timeline.size() > maxVr) {
                maxVr = timeline.size();
            }
        }

        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            workbook.setCompressTempFiles(true);
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Tissue_Export_Equipe");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            headerRow.createCell(0).setCellValue("VR");
            headerRow.createCell(1).setCellValue("EPS");

            for (int i = 0; i < maxVr; i++) {
                headerRow.createCell(i + 2).setCellValue(String.valueOf(i + 1));
            }

            headerRow.createCell(maxVr + 2).setCellValue("Commentaire de la dernier version \"valide ou contester\"");

            int rIdx = 1;
            for (String originalEps : cleanEpsSet) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                List<String> timeline = equipeHistoryMap.get(originalEps);

                if (timeline.isEmpty()) {
                    row.createCell(0).setCellValue("");
                } else {
                    row.createCell(0).setCellValue(String.valueOf(timeline.size()));
                }

                row.createCell(1).setCellValue(originalEps);

                for (int i = 0; i < maxVr; i++) {
                    String commValue = i < timeline.size() ? timeline.get(i) : "";
                    row.createCell(i + 2).setCellValue(commValue);
                }

                String lastWord = "";
                if (!timeline.isEmpty()) {
                    String lastRawComment = timeline.get(timeline.size() - 1);
                    lastWord = detectTeamAction(lastRawComment);
                }
                row.createCell(maxVr + 2).setCellValue(lastWord != null ? lastWord : "");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.dispose();
            return out.toByteArray();
        }
    }
}
