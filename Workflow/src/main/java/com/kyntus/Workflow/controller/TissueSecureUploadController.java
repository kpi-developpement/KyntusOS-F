package com.kyntus.Workflow.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.kyntus.Workflow.service.TissueSecureImportService;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tissue-secure-upload")
public class TissueSecureUploadController {

    private final TissueSecureImportService tissueSecureImportService;

    public TissueSecureUploadController(TissueSecureImportService tissueSecureImportService) {
        this.tissueSecureImportService = tissueSecureImportService;
    }

    @PostMapping("/import/{pilotId}")
    public ResponseEntity<?> importSecureData(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam("category") String category,
            @RequestParam("fileRank") int fileRank,
            @PathVariable Long pilotId) {
        try {
            tissueSecureImportService.importTissueExcelSecure(file, pilotId, year, month, category, fileRank);
            return ResponseEntity.ok().body("{\"message\": \"Fichier Tissue scanné et intégré avec succès !\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
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
