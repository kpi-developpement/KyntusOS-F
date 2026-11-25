package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.TissueRecord;
import com.kyntus.Workflow.repository.TissueRecordRepository;
import com.kyntus.Workflow.service.TissueImportService;
import com.kyntus.Workflow.service.TissueSecureImportService;
import com.kyntus.Workflow.service.TissueTrackService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import jakarta.servlet.http.HttpServletResponse;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tissue-records")
public class TissueRecordController {

    private final TissueImportService tissueImportService;
    private final TissueSecureImportService tissueSecureImportService;
    private final TissueTrackService tissueTrackService;
    private final TissueRecordRepository tissueRecordRepository;

    public TissueRecordController(TissueImportService tissueImportService, TissueSecureImportService tissueSecureImportService, TissueTrackService tissueTrackService, TissueRecordRepository tissueRecordRepository) {
        this.tissueImportService = tissueImportService;
        this.tissueSecureImportService = tissueSecureImportService;
        this.tissueTrackService = tissueTrackService;
        this.tissueRecordRepository = tissueRecordRepository;
    }

    @PostMapping("/import/{pilotId}")
    public ResponseEntity<?> importTissueData(
            @RequestParam("file") MultipartFile file,
            @RequestParam("year") int year,
            @RequestParam("month") int month,
            @RequestParam("category") String category,
            @PathVariable Long pilotId) {
        try {
            tissueSecureImportService.importTissueExcelSecure(file, pilotId, year, month, category, 0);
            return ResponseEntity.ok().body("{\"message\": \"Importation Tissue réussie avec succès\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/{pilotId}")
    public ResponseEntity<Map<String, Object>> getTissueRecords(
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
            Page<TissueRecord> recordsPage = tissueRecordRepository.findAdvancedFilters(category, year, month, version, eps, pageable);

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
            tissueImportService.clearRecordsByCategoryAndDate(category, year, month);
            return ResponseEntity.ok().body("{\"message\": \"Base de données Tissue nettoyée avec succès\"}");
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
            tissueImportService.deleteSpecificFile(category, year, month, filename);
            return ResponseEntity.ok().body("{\"message\": \"Fichier Tissue supprimé avec succès\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/export/{pilotId}")
    public ResponseEntity<byte[]> exportTissueRecords(
            @PathVariable Long pilotId,
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            byte[] excelData = tissueImportService.exportToExcel(pilotId, year, month, category);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Tissue_Export.xlsx");
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
            List<String> versions = tissueRecordRepository.findDistinctVersionsByDate(category, year, month);
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

    @GetMapping("/etats")
    public ResponseEntity<List<String>> getAvailableEtats(
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month) {
        try {
            return ResponseEntity.ok(tissueTrackService.getAvailableEtats(category, year, month));
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/history/{eps}")
    public ResponseEntity<List<Map<String, Object>>> getEpsHistory(
            @PathVariable String eps,
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            List<TissueRecord> records = tissueRecordRepository.findHistoryByEps(eps, category, year, month);
            List<Map<String, Object>> historyList = new ArrayList<>();
            for (TissueRecord r : records) {
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

    @PostMapping("/export-track-global")
    public ResponseEntity<byte[]> exportGlobalTrackHistory(
            @RequestBody List<String> epsList,
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month,
            @RequestParam(value = "etat", required = false) String etat) {
        try {
            byte[] excelData = tissueTrackService.exportGlobalTrackHistory(epsList, category, year, month, etat);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Tissue_Global_Timeline_" + category + ".xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/export-global-search")
    public void exportGlobalSearch(@RequestBody List<String> epsList, HttpServletResponse response) {
        System.out.println("🌐 [TISSUE CONTROLLER] OMNI SEARCH TRIGGERED ! EPS Count: " + (epsList != null ? epsList.size() : "NULL"));
        try {
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=\"Tissue_Global_Omni_Search.xlsx\"");

            tissueImportService.exportGlobalOmniSearchToExcel(epsList, response.getOutputStream());

        } catch (Throwable t) {
            System.err.println("❌ [CRITICAL BUG] TISSUE OMNI SEARCH CRASHED:");
            t.printStackTrace();
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/imported-files")
    public ResponseEntity<List<String>> getImportedFiles(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            List<String> files = tissueImportService.getImportedFiles(category, year, month);
            return ResponseEntity.ok(files != null ? files : new ArrayList<>());
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<String>> getValidationAlerts(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            List<String> alerts = tissueImportService.getValidationAlerts(category, year, month);
            return ResponseEntity.ok(alerts != null ? alerts : new ArrayList<>());
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/alerts-comments")
    public ResponseEntity<List<String>> getDuplicateCommentAlerts(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            List<String> alerts = tissueImportService.getDuplicateCommentAlerts(category, year, month);
            return ResponseEntity.ok(alerts != null ? alerts : new ArrayList<>());
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/export-alerts")
    public ResponseEntity<byte[]> exportAlertsToExcel(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            byte[] excelData = tissueImportService.exportAnomaliesToExcel(category, year, month);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Tissue_Anomalies_Statut.xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @GetMapping("/export-alerts-comments")
    public ResponseEntity<byte[]> exportCommentAlertsToExcel(
            @RequestParam("category") String category,
            @RequestParam("year") int year,
            @RequestParam("month") int month) {
        try {
            byte[] excelData = tissueImportService.exportDuplicateCommentsToExcel(category, year, month);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Tissue_Anomalies_Commentaires.xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) { return ResponseEntity.internalServerError().build(); }
    }

    @DeleteMapping("/deduplicate")
    public ResponseEntity<?> removeDuplicates() {
        try {
            int deletedRows = tissueImportService.removeDuplicates();
            return ResponseEntity.ok().body("{\"message\": \"Nettoyage Tissue réussi ! " + deletedRows + " doublons éliminés.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

    @DeleteMapping("/fix-69-files")
    public ResponseEntity<?> fixRetroactiveDuplicates() {
        try {
            int deletedRows = tissueSecureImportService.fixRetroactiveDuplicates();
            return ResponseEntity.ok().body("{\"message\": \"Nettoyage quantique Tissue réussi ! " + deletedRows + " doublons éliminés.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }
}
