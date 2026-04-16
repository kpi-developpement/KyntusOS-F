package com.kyntus.Workflow.service;

import com.kyntus.Workflow.model.FieldDefinition;
import com.kyntus.Workflow.model.Task;
import com.kyntus.Workflow.model.WorkflowTemplate;
import com.kyntus.Workflow.repository.TaskRepository;
import com.kyntus.Workflow.repository.WorkflowTemplateRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

@Service
public class ExcelImportService {

    private final TaskRepository taskRepository;
    private final WorkflowTemplateRepository templateRepository;

    public ExcelImportService(TaskRepository taskRepository, WorkflowTemplateRepository templateRepository) {
        this.taskRepository = taskRepository;
        this.templateRepository = templateRepository;
    }

    public void importExcel(MultipartFile file, Long templateId) throws IOException {
        // 1. Récupérer le Template
        WorkflowTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new RuntimeException("Template introuvable !"));

        // 2. Ouvrir le fichier Excel
        try (InputStream inputStream = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(inputStream)) {

            Sheet sheet = workbook.getSheetAt(0);

            if (sheet.getPhysicalNumberOfRows() <= 1) {
                throw new RuntimeException("Fichier Excel vide ou sans données !");
            }

            // 3. Lire le Header
            Row headerRow = sheet.getRow(0);
            Map<Integer, String> columnMapping = new HashMap<>();
            int fallbackEpsIndex = -1;

            if (headerRow != null) {
                for (Cell cell : headerRow) {
                    String colName = cell.getStringCellValue().trim();
                    columnMapping.put(cell.getColumnIndex(), colName);

                    // Fallback l-amane: ila l'auto-discovery ma-lqach "EPS-", n-3etmdo 3la s-smiya
                    String colNameUpper = colName.toUpperCase();
                    if (colNameUpper.contains("EPS") || colNameUpper.contains("REFERENCE") || colNameUpper.contains("RDV")) {
                        fallbackEpsIndex = cell.getColumnIndex();
                    }
                }
            }

            // =========================================================================
            // 🧠 L'INTELLIGENCE : AUTO-DISCOVERY DYAL L'PRIMARY KEY (EPS-)
            // =========================================================================
            int epsColumnIndex = -1;
            // N-scanniw les 5 premières lignes de données bash n-l9aw l'EPS
            int maxRowsToScan = Math.min(6, sheet.getLastRowNum() + 1);

            for (int i = 1; i < maxRowsToScan; i++) {
                Row scanRow = sheet.getRow(i);
                if (scanRow == null) continue;
                for (Cell cell : scanRow) {
                    String val = getCellValueAsString(cell).trim().toUpperCase();
                    if (val.startsWith("EPS-")) {
                        epsColumnIndex = cell.getColumnIndex();
                        break;
                    }
                }
                if (epsColumnIndex != -1) break; // Lqaha, n-kherjou men l-boucle !
            }

            // Ila malqahash (matalan les 5 premières lignes fihom l'EPS khawi), n-rejj3ouh l'Fallback
            if (epsColumnIndex == -1) {
                epsColumnIndex = fallbackEpsIndex;
            }

            // =========================================================================
            // ⚙️ PARCOURS ET CREATION DES TASKS
            // =========================================================================
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                // Vérification bash man-creyiwch des tâches b'lignes khawyin f'Excel
                boolean isRowEmpty = true;
                for (Cell cell : row) {
                    if (!getCellValueAsString(cell).trim().isEmpty()) {
                        isRowEmpty = false;
                        break;
                    }
                }
                if (isRowEmpty) continue;

                Task task = new Task();
                task.setTemplate(template);
                task.setStatus("A_FAIRE");

                Map<String, Object> dynamicData = new HashMap<>();
                String extractedEps = "";

                // A. Remplir depuis Excel
                for (Cell cell : row) {
                    int colIndex = cell.getColumnIndex();
                    String columnName = columnMapping.get(colIndex);
                    if (columnName == null) continue;

                    String cellValue = getCellValueAsString(cell).trim();

                    // Hna System kay-khdem b'l'Index li lqa f l'Auto-Discovery
                    if (colIndex == epsColumnIndex) {
                        extractedEps = cellValue;
                    } else {
                        dynamicData.put(columnName, cellValue);
                    }
                }

                task.setEpsReference(extractedEps);

                // B. Remplir les champs manquants (Ceux définis dans le Template mais absents de l'Excel)
                if (template.getFields() != null) {
                    for (FieldDefinition field : template.getFields()) {
                        if (!dynamicData.containsKey(field.getName())) {
                            dynamicData.put(field.getName(), ""); // On met une valeur vide par défaut
                        }
                    }
                }

                task.setDynamicData(dynamicData);

                // C. Protection finale (Risk Management)
                if (task.getEpsReference() == null || task.getEpsReference().isEmpty()) {
                    task.setEpsReference("UNKNOWN-" + System.currentTimeMillis());
                }

                taskRepository.save(task);
            }
        }
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) {
            double val = cell.getNumericCellValue();
            if (val == (long) val) return String.format("%d", (long) val);
            return String.valueOf(val);
        }
        if (cell.getCellType() == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
        if (cell.getCellType() == CellType.FORMULA) {
            try { return cell.getStringCellValue(); }
            catch (Exception e) { return String.valueOf(cell.getNumericCellValue()); }
        }
        return "";
    }
}