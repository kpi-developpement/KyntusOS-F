package com.kyntus.Workflow.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.kyntus.Workflow.service.PilotSecureImportService;
import java.util.List;

@RestController
@RequestMapping("/api/secure-upload")
public class PilotSecureUploadController {

    private final PilotSecureImportService pilotSecureImportService;

    public PilotSecureUploadController(PilotSecureImportService pilotSecureImportService) {
        this.pilotSecureImportService = pilotSecureImportService;
    }

    // 1. ENDPOINT D'IMPORTATION (Qui renvoie les erreurs de la Période / Catégorie)
    @PostMapping("/import/{pilotId}")
    public ResponseEntity<?> importSecureData(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam("category") String category,
            @RequestParam("fileRank") int fileRank,
            @PathVariable Long pilotId) {
        try {
            pilotSecureImportService.importPilotExcelSecure(file, pilotId, year, month, category, fileRank);
            return ResponseEntity.ok().body("{\"message\": \"Fichier scanné et intégré avec succès !\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    // 🚀 2. LE NOUVEL ENDPOINT POUR RE-ORDONNER LES FICHIERS APRÈS IMPORT 🚀
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