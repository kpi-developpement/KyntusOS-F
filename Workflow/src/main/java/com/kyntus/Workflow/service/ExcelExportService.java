package com.kyntus.Workflow.service;

import com.kyntus.Workflow.model.Task;
import com.kyntus.Workflow.repository.TaskRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

@Service
public class ExcelExportService {

    private final TaskRepository taskRepository;

    public ExcelExportService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public ByteArrayInputStream exportTasksToExcel(Long templateId) {
        // 1. Récupérer SEULEMENT les tâches VALIDÉES ("VALIDE")
        List<Task> tasks = taskRepository.findByTemplateIdAndStatus(templateId, "VALIDE");

        if (tasks.isEmpty()) {
            throw new RuntimeException("Aucune tâche VALIDÉE à exporter pour ce template !");
        }

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Export Final");

            // 2. Scan des colonnes dynamiques
            Set<String> dynamicHeaders = new LinkedHashSet<>();
            for (Task task : tasks) {
                if (task.getDynamicData() != null) {
                    dynamicHeaders.addAll(task.getDynamicData().keySet());
                }
            }

            // 3. Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            // 4. Création Header (EPS + Dynamiques SEULEMENT)
            Row headerRow = sheet.createRow(0);
            int colIdx = 0;

            // Colonne 1 : EPS (La clé)
            Cell cellEps = headerRow.createCell(colIdx++);
            cellEps.setCellValue("Référence EPS");
            cellEps.setCellStyle(headerStyle);

            // Colonnes Suivantes : Les données du fichier original
            List<String> dynamicColList = new ArrayList<>(dynamicHeaders);
            for (String col : dynamicColList) {
                Cell cell = headerRow.createCell(colIdx++);
                cell.setCellValue(col);
                cell.setCellStyle(headerStyle);
            }

            // 5. Remplissage des Données
            int rowIdx = 1;
            for (Task task : tasks) {
                Row row = sheet.createRow(rowIdx++);
                colIdx = 0;

                // EPS
                row.createCell(colIdx++).setCellValue(task.getEpsReference());

                // Data Dynamique
                Map<String, Object> data = task.getDynamicData();
                for (String key : dynamicColList) {
                    Cell cell = row.createCell(colIdx++);
                    if (data != null && data.containsKey(key)) {
                        cell.setCellValue(String.valueOf(data.get(key)));
                    } else {
                        cell.setCellValue("");
                    }
                }
            }

            // Auto-size
            for (int i = 0; i < colIdx; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());

        } catch (IOException e) {
            throw new RuntimeException("Erreur export : " + e.getMessage());
        }
    }
}