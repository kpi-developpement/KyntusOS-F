package com.kyntus.Workflow.controller;

// ✅ HADA HOWA L IMPORT LI KAN NAQESS AWLA FIH MOCHKIL
import com.kyntus.Workflow.service.ExcelImportService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/import")
@CrossOrigin(origins = "http://localhost:3000")
public class ImportController {

    private final ExcelImportService importService;

    public ImportController(ExcelImportService importService) {
        this.importService = importService;
    }

    @PostMapping("/{templateId}")
    public ResponseEntity<String> uploadExcel(@RequestParam("file") MultipartFile file,
                                              @PathVariable Long templateId) {
        try {
            importService.importExcel(file, templateId);
            return ResponseEntity.ok("Import réussi avec succès !");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Erreur: " + e.getMessage());
        }
    }
}