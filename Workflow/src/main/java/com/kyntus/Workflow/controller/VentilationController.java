package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.service.ventilation.VentilationMasterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ventilation")
@CrossOrigin(originPatterns = "*")
public class VentilationController {

    private final VentilationMasterService ventilationMasterService;

    public VentilationController(VentilationMasterService ventilationMasterService) {
        this.ventilationMasterService = ventilationMasterService;
    }

    // 🚀 UPLOAD ET SAUVEGARDE EN BD
    @PostMapping("/import")
    public ResponseEntity<?> importVentilation(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            Map<String, List<Map<String, String>>> processedData = ventilationMasterService.processAndSaveVentilation(file, year, month);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Fichier sauvegardé en base de données avec succès !");
            response.put("data", processedData);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    // 📥 RECUPERATION DEPUIS LA BD (Mlli kat-dir F5 ola t-beddel ch-8er)
    @GetMapping("/data")
    public ResponseEntity<?> getVentilationData(@RequestParam("year") int year, @RequestParam("month") int month) {
        try {
            Map<String, List<Map<String, String>>> data = ventilationMasterService.getVentilationData(year, month);
            if (data != null) {
                return ResponseEntity.ok(Map.of("data", data));
            } else {
                return ResponseEntity.ok(Map.of("data", "NO_DATA"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"Erreur lors de la récupération\"}");
        }
    }

    // 🗑️ PURGE DEPUIS LA BD
    @DeleteMapping("/purge")
    public ResponseEntity<?> purgeVentilationData(@RequestParam("year") int year, @RequestParam("month") int month) {
        try {
            ventilationMasterService.deleteVentilationData(year, month);
            return ResponseEntity.ok(Map.of("message", "Données purgées avec succès !"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("{\"error\": \"Erreur lors de la purge\"}");
        }
    }
}