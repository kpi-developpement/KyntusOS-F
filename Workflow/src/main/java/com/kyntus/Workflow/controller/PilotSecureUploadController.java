package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.RecordImportLog;
import com.kyntus.Workflow.service.PilotSecureImportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/secure-upload")
public class PilotSecureUploadController {

    private final PilotSecureImportService pilotSecureImportService;

    public PilotSecureUploadController(PilotSecureImportService pilotSecureImportService) {
        this.pilotSecureImportService = pilotSecureImportService;
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
            Map<String, Object> result = pilotSecureImportService.importPilotExcelSecure(file, pilotId, year, month, category, fileRank);
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
            return ResponseEntity.ok(pilotSecureImportService.getImportLogs(category, year, month));
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
            pilotSecureImportService.reorderImportedFiles(category, year, month, orderedFilenames);
            return ResponseEntity.ok().body("{\"message\": \"Ordre des fichiers mis à jour avec succès dans la base de données !\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}
