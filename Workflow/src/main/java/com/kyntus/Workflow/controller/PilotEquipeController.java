package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.service.PilotEquipeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipe-export")
public class PilotEquipeController {

    private final PilotEquipeService pilotEquipeService;

    public PilotEquipeController(PilotEquipeService pilotEquipeService) {
        this.pilotEquipeService = pilotEquipeService;
    }

    // 🚀 ENDPOINT INTELLIGENT POUR L'ÉQUIPE 🚀
    @PostMapping("/track")
    public ResponseEntity<byte[]> exportEquipeTrack(
            @RequestBody List<String> epsList,
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month) {
        try {
            byte[] excelData = pilotEquipeService.exportEquipeTrackHistory(epsList, category, year, month);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            // Nom du fichier personnalisé
            headers.setContentDispositionFormData("attachment", "Export_Equipe_" + category + ".xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}