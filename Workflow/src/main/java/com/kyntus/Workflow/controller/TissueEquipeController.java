package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.service.TissueEquipeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/tissue-equipe-export")
public class TissueEquipeController {

    private final TissueEquipeService tissueEquipeService;

    public TissueEquipeController(TissueEquipeService tissueEquipeService) {
        this.tissueEquipeService = tissueEquipeService;
    }

    @PostMapping("/track")
    public ResponseEntity<byte[]> exportEquipeTrack(
            @RequestBody List<String> epsList,
            @RequestParam("category") String category,
            @RequestParam(value = "year", required = false) String year,
            @RequestParam(value = "month", required = false) String month) {
        try {
            byte[] excelData = tissueEquipeService.exportEquipeTrackHistory(epsList, category, year, month);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Tissue_Export_Equipe_" + category + ".xlsx");
            return new ResponseEntity<>(excelData, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
