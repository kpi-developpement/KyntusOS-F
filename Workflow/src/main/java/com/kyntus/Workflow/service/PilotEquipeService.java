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
public class PilotEquipeService {

    private final JdbcTemplate jdbcTemplate;
    private final JsonFactory jsonFactory;

    public PilotEquipeService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.jsonFactory = objectMapper.getFactory();
    }

    // 🤖 L'INTELLIGENCE ARTIFICIELLE POUR COMPRENDRE LES FAUTES D'ORTHOGRAPHE
    private String detectTeamAction(String comment) {
        if (comment == null || comment.trim().isEmpty()) return null;

        // 1. On met tout en minuscule et on enlève la ponctuation au début (ex: "- valide" devient "valide")
        String normalized = comment.trim().toLowerCase().replaceAll("^[^a-z0-9]+", "");

        // 2. Détection de "VALIDE" (Accepte: valide, validé, validéé, valider, valid, valied...)
        if (normalized.startsWith("valid") || normalized.startsWith("valïd") || normalized.startsWith("valied")) {
            return "VALIDE";
        }

        // 3. Détection de "CONTESTER" (Accepte: contester, contaistair, contestaire, conteste, contast...)
        if (normalized.startsWith("contest") || normalized.startsWith("contaist") || normalized.startsWith("contast")) {
            return "CONTESTER";
        }

        // Si ça ne commence ni par l'un ni par l'autre, ce n'est pas un commentaire de l'équipe
        return null;
    }

    // 🚀 L'ALGORITHME D'EXPORT EQUIPE 🚀
    @Transactional(readOnly = true)
    public byte[] exportEquipeTrackHistory(List<String> epsList, String category, String yearStr, String monthStr) throws Exception {

        // 1. Nettoyage des EPS envoyés
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
            throw new RuntimeException("Aucun EPS valide trouvé pour l'export équipe.");
        }

        Integer targetYear = (yearStr == null || yearStr.equalsIgnoreCase("ALL")) ? null : Integer.parseInt(yearStr);
        Integer targetMonth = (monthStr == null || monthStr.equalsIgnoreCase("ALL")) ? null : Integer.parseInt(monthStr);

        // Map qui stocke : EPS -> Liste ordonnée des commentaires d'équipe (VR)
        Map<String, List<String>> equipeHistoryMap = new HashMap<>(cleanEpsSet.size(), 1.0f);
        for (String eps : cleanEpsSet) {
            equipeHistoryMap.put(eps, new ArrayList<>());
        }

        List<String> epsArrayList = new ArrayList<>(cleanEpsSet);
        int batchSize = 30000;

        // 2. FETCH HAUTE VITESSE DE LA BDD (CHRONOLOGIQUE)
        try (Connection conn = Objects.requireNonNull(jdbcTemplate.getDataSource()).getConnection()) {
            conn.setAutoCommit(false);

            for (int i = 0; i < epsArrayList.size(); i += batchSize) {
                List<String> subList = epsArrayList.subList(i, Math.min(i + batchSize, epsArrayList.size()));

                StringBuilder sql = new StringBuilder("SELECT eps_reference, dynamic_data FROM pilot_records WHERE eps_reference = ANY(?) AND category = ?");
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

                            // 🔥 L'INTELLIGENCE OPÈRE ICI 🔥
                            String actionEquipe = detectTeamAction(rawComment);

                            // Si c'est bien un commentaire de l'équipe (Valide ou Contester)
                            if (actionEquipe != null && equipeHistoryMap.containsKey(eps)) {
                                List<String> timeline = equipeHistoryMap.get(eps);
                                // Anti-Spam: On n'ajoute pas si c'est exactement le même texte que la ligne précédente
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

        // 3. TROUVER LE NOMBRE MAXIMUM DE VR POUR CREER LES COLONNES DYNAMIQUES
        int maxVr = 1; // Au moins 1 pour l'entête
        for (List<String> timeline : equipeHistoryMap.values()) {
            if (timeline.size() > maxVr) {
                maxVr = timeline.size();
            }
        }

        // 4. GENERATION DE L'EXCEL "TEAM FORMAT"
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100)) {
            workbook.setCompressTempFiles(true);
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Export_Equipe");
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);

            // Colonnes fixes du début
            headerRow.createCell(0).setCellValue("VR");
            headerRow.createCell(1).setCellValue("EPS");

            // Colonnes dynamiques (1, 2, 3...)
            for (int i = 0; i < maxVr; i++) {
                headerRow.createCell(i + 2).setCellValue(String.valueOf(i + 1));
            }

            // Colonne Finale de Synthèse
            headerRow.createCell(maxVr + 2).setCellValue("Commentaire de la dernier version \"valide ou contester\"");

            int rIdx = 1;
            for (String originalEps : cleanEpsSet) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rIdx++);
                List<String> timeline = equipeHistoryMap.get(originalEps);

                // Col 0: Total VR (Vide si 0, sinon le nombre)
                if (timeline.isEmpty()) {
                    row.createCell(0).setCellValue("");
                } else {
                    row.createCell(0).setCellValue(String.valueOf(timeline.size()));
                }

                // Col 1: EPS
                row.createCell(1).setCellValue(originalEps);

                // Col 2 à maxVr: Les commentaires bruts
                for (int i = 0; i < maxVr; i++) {
                    String commValue = i < timeline.size() ? timeline.get(i) : "";
                    row.createCell(i + 2).setCellValue(commValue);
                }

                // Dernière Colonne: Le résumé intelligent (VALIDE ou CONTESTER)
                String lastWord = "";
                if (!timeline.isEmpty()) {
                    String lastRawComment = timeline.get(timeline.size() - 1);
                    // On utilise notre IA pour extraire le mot clé propre
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