package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.service.ExcelExportService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;

@RestController
@RequestMapping("/api/export")
@CrossOrigin(origins = "http://localhost:3000")
public class ExportController {

    private final ExcelExportService exportService;

    public ExportController(ExcelExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/{templateId}")
    public ResponseEntity<InputStreamResource> exportTemplate(@PathVariable Long templateId) {
        ByteArrayInputStream in = exportService.exportTasksToExcel(templateId);

        String filename = "Kyntus_Export_" + System.currentTimeMillis() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(in));
    }
}