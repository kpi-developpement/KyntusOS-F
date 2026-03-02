package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.PilotRecord;
import com.kyntus.Workflow.repository.PilotRecordRepository;
import com.kyntus.Workflow.service.PilotImportService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

// 🔥 LES IMPORTS LI KANO NAQSIN HOMA HADO 🔥
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pilot-records")
@CrossOrigin(origins = "http://localhost:3000")
public class PilotRecordController {

    private final PilotImportService pilotImportService;
    private final PilotRecordRepository pilotRecordRepository;

    public PilotRecordController(PilotImportService pilotImportService, PilotRecordRepository pilotRecordRepository) {
        this.pilotImportService = pilotImportService;
        this.pilotRecordRepository = pilotRecordRepository;
    }

    // 📥 ENDPOINT 1 : IMPORTATION MASSIVE EXCEL
    @PostMapping("/import/{pilotId}")
    public ResponseEntity<?> importPilotData(@RequestParam("file") MultipartFile file, @PathVariable Long pilotId) {
        try {
            pilotImportService.importPilotExcel(file, pilotId);
            return ResponseEntity.ok().body("{\"message\": \"Importation réussie avec succès\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    // 📤 ENDPOINT 2 : AFFICHAGE AVEC FILTRES AVANCÉS ET PAGINATION
    @GetMapping("/{pilotId}")
    public ResponseEntity<Map<String, Object>> getPilotRecords(
            @PathVariable Long pilotId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String version,
            @RequestParam(required = false) String eps) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
            Page<PilotRecord> recordsPage = pilotRecordRepository.findAdvancedFilters(version, eps, pageable);

            Map<String, Object> response = new HashMap<>();
            response.put("content", recordsPage.getContent());
            response.put("currentPage", recordsPage.getNumber());
            response.put("totalItems", recordsPage.getTotalElements());
            response.put("totalPages", recordsPage.getTotalPages());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // 🗑️ ENDPOINT 3 : VIDER LA BASE DE DONNÉES (TRUNCATE)
    @DeleteMapping("/clear")
    public ResponseEntity<?> clearDatabase() {
        try {
            pilotImportService.clearAllRecords();
            return ResponseEntity.ok().body("{\"message\": \"Base de données vidée avec succès\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    // 📥 ENDPOINT 4 : EXPORTER TOUTE LA BASE DE DONNÉES EN EXCEL
    @GetMapping("/export/{pilotId}")
    public ResponseEntity<byte[]> exportPilotRecords(@PathVariable Long pilotId) {
        try {
            byte[] excelData = pilotImportService.exportToExcel(pilotId);

            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Kyntus_Data_Records.xlsx");

            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // 📥 ENDPOINT 5 : RÉCUPÉRER LA LISTE DYNAMIQUE DES VERSIONS (V1, V2, V3...)
    @GetMapping("/versions")
    public ResponseEntity<List<String>> getAvailableVersions() {
        try {
            return ResponseEntity.ok(pilotRecordRepository.findDistinctVersions());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // 📥 ENDPOINT 6 : L'HISTORIQUE TEMPOREL (TIMELINE) DES COMMENTAIRES POUR UN EPS
    @GetMapping("/history/{eps}")
    public ResponseEntity<List<Map<String, Object>>> getEpsHistory(@PathVariable String eps) {
        try {
            List<PilotRecord> records = pilotRecordRepository.findHistoryByEps(eps);
            List<Map<String, Object>> historyList = new ArrayList<>();

            for (PilotRecord r : records) {
                Map<String, Object> item = new HashMap<>();
                item.put("version", r.getVersion());
                item.put("importedAt", r.getImportedAt());

                String commentaire = "-";
                if (r.getDynamicData() != null) {
                    for (Map.Entry<String, Object> entry : r.getDynamicData().entrySet()) {
                        if (entry.getKey().equalsIgnoreCase("commentaire")) {
                            commentaire = entry.getValue() != null ? entry.getValue().toString() : "-";
                            break;
                        }
                    }
                }
                item.put("commentaire", commentaire);
                historyList.add(item);
            }
            return ResponseEntity.ok(historyList);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}