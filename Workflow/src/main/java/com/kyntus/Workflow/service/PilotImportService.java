package com.kyntus.Workflow.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.util.IOUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PilotImportService {

    private final JdbcTemplate jdbcTemplate;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public PilotImportService(JdbcTemplate jdbcTemplate, UserRepository userRepository, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void importPilotExcel(MultipartFile file, Long pilotId) throws Exception {
        long startTime = System.currentTimeMillis();
        IOUtils.setByteArrayMaxOverride(500_000_000);

        User pilot = userRepository.findAll().stream()
                .filter(u -> u.getRole().toString().equals("PILOT"))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Pilote non trouvé!"));

        String checkSql = "SELECT eps_reference, version, dynamic_data FROM pilot_records WHERE pilot_id = ?";
        List<Map<String, Object>> existingData = jdbcTemplate.queryForList(checkSql, pilot.getId());

        // 🔥 L'FIX HNA: Kan-khaznou JsonNode (Arbre) machi String (Texte)
        Map<String, List<JsonNode>> existingMap = new HashMap<>();
        for (Map<String, Object> row : existingData) {
            String eps = (String) row.get("eps_reference");
            String dataJson = row.get("dynamic_data").toString();
            try {
                JsonNode jsonNode = objectMapper.readTree(dataJson);
                existingMap.computeIfAbsent(eps, k -> new ArrayList<>()).add(jsonNode);
            } catch (Exception e) {
                System.err.println("Erreur de parsing JSON pour EPS: " + eps);
            }
        }

        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();
            if (!rowIterator.hasNext()) return;

            Row headerRow = rowIterator.next();
            Map<Integer, String> colMap = new HashMap<>();
            for (Cell cell : headerRow) {
                // Kan-7iydou ay espace zayed mn smyat l'colonnes (Trim)
                colMap.put(cell.getColumnIndex(), cell.getStringCellValue().trim());
            }

            String insertSql = "INSERT INTO pilot_records (eps_reference, dynamic_data, version, imported_at, pilot_id) VALUES (?, ?::jsonb, ?, ?, ?)";
            List<Object[]> batchArgs = new ArrayList<>();

            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                String eps = "";
                Map<String, Object> dynamicData = new HashMap<>();
                boolean isEmpty = true;

                for (Cell cell : row) {
                    String colName = colMap.get(cell.getColumnIndex());
                    if (colName == null) continue;
                    String val = getCellValue(cell).trim(); // Trim dyal la valeur
                    if (!val.isEmpty()) isEmpty = false;

                    dynamicData.put(colName, val);

                    if (colName.equalsIgnoreCase("idIntervention") || colName.equalsIgnoreCase("EPS")) {
                        eps = val;
                    }
                }

                if (isEmpty) continue;
                if (eps.isEmpty()) eps = "AUTO-" + UUID.randomUUID().toString().substring(0, 8);

                // 🔥 Kan-7ewlou l'data jdida l'JsonNode bach n-comparer
                JsonNode currentNode = objectMapper.valueToTree(dynamicData);
                String currentDataJson = objectMapper.writeValueAsString(dynamicData);

                List<JsonNode> versions = existingMap.getOrDefault(eps, new ArrayList<>());
                String version = "V1";

                if (!versions.isEmpty()) {
                    // 🔥 DEEP EQUALS COMPARAISON: JSON m3a JSON (kay-ignorer l'ordre dyal l'colonnes)
                    boolean isDuplicate = false;
                    for (JsonNode vNode : versions) {
                        if (vNode.equals(currentNode)) {
                            isDuplicate = true;
                            break;
                        }
                    }

                    if (isDuplicate) continue; // Case 1: Identique (Skip)

                    // Case 2: Changement détecté (V2, V3...)
                    version = "V" + (versions.size() + 1);
                }

                batchArgs.add(new Object[]{
                        eps,
                        currentDataJson,
                        version,
                        Timestamp.valueOf(LocalDateTime.now()),
                        pilot.getId()
                });

                // Update in RAM pour le même batch
                versions.add(currentNode);
                existingMap.put(eps, versions);

                if (batchArgs.size() >= 2000) {
                    jdbcTemplate.batchUpdate(insertSql, batchArgs);
                    batchArgs.clear();
                    System.out.println("🚀 [TURBO] Inserted 2000 rows...");
                }
            }

            if (!batchArgs.isEmpty()) {
                jdbcTemplate.batchUpdate(insertSql, batchArgs);
            }
        }
        long endTime = System.currentTimeMillis();
        System.out.println("✅ [FINISHED] Total time: " + (endTime - startTime) / 1000 + " seconds!");
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double val = cell.getNumericCellValue();
                if (val == Math.floor(val)) {
                    yield String.valueOf((long) val);
                }
                yield String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }
}