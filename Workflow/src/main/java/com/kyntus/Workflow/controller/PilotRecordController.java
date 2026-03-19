package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.PilotRecord;
import com.kyntus.Workflow.repository.PilotRecordRepository;
import com.kyntus.Workflow.service.PilotImportService;
import com.kyntus.Workflow.service.PilotTrackService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pilot-records")
@CrossOrigin(originPatterns = "*")
public class PilotRecordController {

    private final PilotImportService pilotImportService;
    private final PilotTrackService pilotTrackService; // 🔥 HADA SERVICE JDID
    private final PilotRecordRepository pilotRecordRepository;

    public PilotRecordController(PilotImportService pilotImportService, PilotTrackService pilotTrackService, PilotRecordRepository pilotRecordRepository) {
        this.pilotImportService = pilotImportService;
        this.pilotTrackService = pilotTrackService;
        this.pilotRecordRepository = pilotRecordRepository;
    }

    @PostMapping("/import/{pilotId}")
    public ResponseEntity<?> importPilotData(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam("category") String category,
            @PathVariable Long pilotId) {
        try {
            pilotImportService.importPilotExcel(file, pilotId, year, month, category);
            return ResponseEntity.ok().body("{\"message\": \"Importation réussie avec succès\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/{pilotId}")
    public ResponseEntity<Map<String, Object>> getPilotRecords(
            @PathVariable Long pilotId,
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String version,
            @RequestParam(required = false) String eps) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
            Page<PilotRecord> recordsPage = pilotRecordRepository.findAdvancedFilters(category, year, month, version, eps, pageable);

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

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearDatabase(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            pilotImportService.clearRecordsByCategoryAndDate(category, year, month);
            return ResponseEntity.ok().body("{\"message\": \"Base de données nettoyée avec succès\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @DeleteMapping("/delete-file")
    public ResponseEntity<?> deleteSpecificFile(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam("filename") String filename) {
        try {
            pilotImportService.deleteSpecificFile(category, year, month, filename);
            return ResponseEntity.ok().body("{\"message\": \"Fichier supprimé avec succès\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/export/{pilotId}")
    public ResponseEntity<byte[]> exportPilotRecords(
            @PathVariable Long pilotId,
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            byte[] excelData = pilotImportService.exportToExcel(pilotId, year, month, category);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Kyntus_Export.xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/versions")
    public ResponseEntity<List<String>> getAvailableVersions(
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) Integer year,
            @RequestParam(value = "month", required = false) Integer month) {
        try {
            List<String> versions = pilotRecordRepository.findDistinctVersionsByDate(category, year, month);
            if (versions != null) {
                List<String> mutableVersions = new ArrayList<>(versions);
                mutableVersions.sort((v1, v2) -> {
                    try {
                        return Integer.compare(Integer.parseInt(v1.replaceAll("\\D+", "")), Integer.parseInt(v2.replaceAll("\\D+", "")));
                    } catch (Exception e) { return v1.compareTo(v2); }
                });
                return ResponseEntity.ok(mutableVersions);
            }
            return ResponseEntity.ok(new ArrayList<>());
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    // 🚀 L'ENDPOINT JDID DYAL LES ETATS (POUR LE DROPDOWN) 🚀
    @GetMapping("/etats")
    public ResponseEntity<List<String>> getAvailableEtats(
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month) {
        try {
            return ResponseEntity.ok(pilotTrackService.getAvailableEtats(category, year, month));
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/history/{eps}")
    public ResponseEntity<List<Map<String, Object>>> getEpsHistory(
            @PathVariable String eps,
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            List<PilotRecord> records = pilotRecordRepository.findHistoryByEps(eps, category, year, month);
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
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    // 🚀 L'ENDPOINT TRACK GLOBAL (TEXTAREA + ETAT) 🚀
    @PostMapping("/export-track-global")
    public ResponseEntity<byte[]> exportGlobalTrackHistory(
            @RequestBody List<String> epsList,
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month,
            @RequestParam(value = "etat", required = false) String etat) {
        try {
            byte[] excelData = pilotTrackService.exportGlobalTrackHistory(epsList, category, year, month, etat);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Global_Timeline_" + category + ".xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/imported-files")
    public ResponseEntity<List<String>> getImportedFiles(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            List<String> files = pilotImportService.getImportedFiles(category, year, month);
            return ResponseEntity.ok(files != null ? files : new ArrayList<>());
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<String>> getValidationAlerts(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            List<String> alerts = pilotImportService.getValidationAlerts(category, year, month);
            return ResponseEntity.ok(alerts != null ? alerts : new ArrayList<>());
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/alerts-comments")
    public ResponseEntity<List<String>> getDuplicateCommentAlerts(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            List<String> alerts = pilotImportService.getDuplicateCommentAlerts(category, year, month);
            return ResponseEntity.ok(alerts != null ? alerts : new ArrayList<>());
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/export-alerts")
    public ResponseEntity<byte[]> exportAlertsToExcel(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            byte[] excelData = pilotImportService.exportAnomaliesToExcel(category, year, month);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Anomalies_Statut.xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/export-alerts-comments")
    public ResponseEntity<byte[]> exportCommentAlertsToExcel(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            byte[] excelData = pilotImportService.exportDuplicateCommentsToExcel(category, year, month);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Anomalies_Commentaires.xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }
    // 🧹 L'ENDPOINT POUR NETTOYER LA BASE DE DONNEES SANS LA SUPPRIMER 🧹
    @DeleteMapping("/deduplicate")
    public ResponseEntity<?> removeDuplicates() {
        try {
            int deletedRows = pilotImportService.removeDuplicates();
            return ResponseEntity.ok().body("{\"message\": \"Nettoyage réussi ! " + deletedRows + " doublons éliminés.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}