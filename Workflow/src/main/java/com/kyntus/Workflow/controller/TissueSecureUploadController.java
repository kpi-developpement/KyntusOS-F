package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.RecordImportLog;
import com.kyntus.Workflow.service.TissueSecureImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tissue-secure-upload")
public class TissueSecureUploadController {

    private final TissueSecureImportService tissueSecureImportService;

    public TissueSecureUploadController(TissueSecureImportService tissueSecureImportService) {
        this.tissueSecureImportService = tissueSecureImportService;
    }

    @PostMapping("/import/{pilotId}")
    public ResponseEntity<Map<String, Object>> importSecureData(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam("category") String category,
            @RequestParam("fileRank") int fileRank,
            @PathVariable Long pilotId) {
        try {
            Map<String, Object> result = tissueSecureImportService.importTissueExcelSecure(file, pilotId, year, month, category, fileRank);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> err = new HashMap<>();
            err.put("status", "ERROR");
            err.put("error", e.getMessage() != null ? e.getMessage() : "Erreur serveur inconnue");
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping("/logs")
    public ResponseEntity<List<RecordImportLog>> getImportLogs(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            return ResponseEntity.ok(tissueSecureImportService.getImportLogs(category, year, month));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    @PutMapping("/reorder")
    public ResponseEntity<?> reorderFiles(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestBody List<String> orderedFilenames) {
        try {
            tissueSecureImportService.reorderImportedFiles(category, year, month, orderedFilenames);
            return ResponseEntity.ok().body("{\"message\": \"Ordre des fichiers Tissue mis à jour avec succès !\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}
