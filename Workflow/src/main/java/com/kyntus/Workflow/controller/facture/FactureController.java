package com.kyntus.Workflow.controller.facture;

import com.kyntus.Workflow.service.facture.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/facture")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class FactureController {

    private final TvcProcessorService tvcService;
    private final DiagWifiProcessorService diagWifiService;
    private final RepeteurProcessorService repeteurService;
    private final QaProcessorService qaService;
    private final InterventionProcessorService interventionService;
    private final MesProcessorService mesService;
    private final FactureMasterService masterService;

    public FactureController(
            TvcProcessorService tvcService, DiagWifiProcessorService diagWifiService,
            RepeteurProcessorService repeteurService, QaProcessorService qaService,
            InterventionProcessorService interventionService,
            MesProcessorService mesService, FactureMasterService masterService) {
        this.tvcService = tvcService;
        this.diagWifiService = diagWifiService;
        this.repeteurService = repeteurService;
        this.qaService = qaService;
        this.interventionService = interventionService;
        this.mesService = mesService;
        this.masterService = masterService;
    }

    @PostMapping("/generate")
    public ResponseEntity<byte[]> generateFacture(
            @RequestParam("fichierAVide") MultipartFile fichierAVide,
            @RequestParam("fichierTVC") MultipartFile fichierTVC,
            @RequestParam("fichierRepeteur") MultipartFile fichierRepeteur,
            @RequestParam("fichierDiagWifi") MultipartFile fichierDiagWifi,
            @RequestParam("fichierQA") MultipartFile fichierQA,
            @RequestParam(value = "fichierIntervention", required = false) MultipartFile fichierIntervention,
            @RequestParam(value = "devisData", required = false) String devisDataJson // 🔥 L-Qaleb dyal Devis hna!
    ) {
        try {
            System.out.println("🚀 [FACTURE ENGINE] Début du traitement...");

            // 🧠 Traduction dyal l-JSON d-Devis l-Map Java 🧠
            Map<String, Double> devisMap = new HashMap<>();
            if (devisDataJson != null && !devisDataJson.trim().isEmpty()) {
                ObjectMapper mapper = new ObjectMapper();
                devisMap = mapper.readValue(devisDataJson, new TypeReference<Map<String, Double>>() {});
                System.out.println("✅ Devis Manuel reçu pour " + devisMap.size() + " interventions.");
            }

            Map<String, String> tvcMap = tvcService.processTvcFile(fichierTVC);
            Map<String, String> diagWifiMap = diagWifiService.processDiagWifiFile(fichierDiagWifi);
            Map<String, String> repeteurMap = repeteurService.processRepeteurFile(fichierRepeteur);
            Map<String, QaProcessorService.QaData> qaMap = qaService.processQaFile(fichierQA);

            Map<String, String> offreMap = interventionService.processInterventionFile(fichierIntervention);
            Map<String, MesProcessorService.MesResult> mesMap = mesService.processMesData(fichierAVide, diagWifiMap, qaMap, offreMap);

            // 🔥 Sifetna devisMap l-Master bash y-tbe9ha f' SUPPORT 🔥
            byte[] finalExcelBytes = masterService.generateFinalFacture(
                    fichierAVide, repeteurMap, tvcMap, diagWifiMap, qaMap, mesMap, offreMap, devisMap);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "Facture_Kyntus_2080.xlsx");
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            return new ResponseEntity<>(finalExcelBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            System.err.println("❌ ERREUR LORS DU TRAITEMENT : " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
}