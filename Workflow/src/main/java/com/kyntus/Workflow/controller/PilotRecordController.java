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

import java.util.HashMap;
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

    @GetMapping("/{pilotId}")
    public ResponseEntity<Map<String, Object>> getPilotRecords(
            @PathVariable Long pilotId, // Kan-khlliwha f l'URL bach may-tkhsserch l'Frontend
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String version,
            @RequestParam(required = false) String eps) {

        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());

            // 🔥 FIX: Nadiyna l'fonction bla pilotId
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
}