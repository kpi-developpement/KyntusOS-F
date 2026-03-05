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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pilot-records")
@CrossOrigin(originPatterns = "*")
public class PilotRecordController {

    private final PilotImportService pilotImportService;
    private final PilotRecordRepository pilotRecordRepository;

    public PilotRecordController(PilotImportService pilotImportService, PilotRecordRepository pilotRecordRepository) {
        this.pilotImportService = pilotImportService;
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

    // 🚀🔥 L'ENDPOINT DE SUPPRESSION CIBLÉ (SNIPER)
    @DeleteMapping("/clear")
    public ResponseEntity<?> clearDatabase(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            pilotImportService.clearRecordsByCategoryAndDate(category, year, month);
            return ResponseEntity.ok().body("{\"message\": \"Base de données nettoyée pour " + category + " (" + month + "/" + year + ")\"}");
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
            headers.setContentDispositionFormData("attachment", "Kyntus_" + category + "_" + year + "_" + month + ".xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/versions")
    public ResponseEntity<List<String>> getAvailableVersions(@RequestParam("category") String category) {
        try {
            List<String> versions = pilotRecordRepository.findDistinctVersions(category);
            return ResponseEntity.ok(versions != null ? versions : new ArrayList<>());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
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
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/export-history/{pilotId}")
    public ResponseEntity<byte[]> exportHistoryByEpsList(
            @RequestParam("file") MultipartFile file,
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @PathVariable Long pilotId) {
        try {
            byte[] excelData = pilotImportService.exportHistoryByEpsList(file, pilotId, year, month, category);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Historique_" + category + "_" + year + "_" + month + ".xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}