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
import java.util.Iterator;
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
            Iterator<Row> rowIterator = sheet.iterator();

            // 3. Lire le Header
            if (!rowIterator.hasNext()) {
                throw new RuntimeException("Fichier Excel vide !");
            }

            Row headerRow = rowIterator.next();
            Map<Integer, String> columnMapping = new HashMap<>();

            for (Cell cell : headerRow) {
                columnMapping.put(cell.getColumnIndex(), cell.getStringCellValue().trim());
            }

            // 4. Parcourir les lignes
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                if (row.getCell(0) == null || getCellValueAsString(row.getCell(0)).isEmpty()) continue;

                Task task = new Task();
                task.setTemplate(template);
                task.setStatus("A_FAIRE");

                Map<String, Object> dynamicData = new HashMap<>();

                // A. Remplir depuis Excel
                for (Cell cell : row) {
                    String columnName = columnMapping.get(cell.getColumnIndex());
                    if (columnName == null) continue;

                    if (columnName.equalsIgnoreCase("EPS") || columnName.equalsIgnoreCase("Reference")) {
                        task.setEpsReference(getCellValueAsString(cell));
                    } else {
                        dynamicData.put(columnName, getCellValueAsString(cell));
                    }
                }

                // B. Remplir les champs manquants (Ceux définis dans le Template mais absents de l'Excel)
                // Hada howa l fix li bghiti bach dak l collone li zedti yban
                if (template.getFields() != null) {
                    for (FieldDefinition field : template.getFields()) {
                        if (!dynamicData.containsKey(field.getName())) {
                            dynamicData.put(field.getName(), ""); // On met une valeur vide par défaut
                        }
                    }
                }

                task.setDynamicData(dynamicData);
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