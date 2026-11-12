package com.kyntus.Workflow.controller.facture;

import com.kyntus.Workflow.service.facture.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.apache.poi.util.IOUtils; // POI IMPORT FIX
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/facture")
public class FactureController {

    private final TvcProcessorService tvcService;
    private final DiagWifiProcessorService diagWifiService;
    private final RepeteurProcessorService repeteurService;
    private final QaProcessorService qaService;
    private final InterventionProcessorService interventionService;
    private final MesProcessorService mesService;
    private final FactureMasterService masterService;

    /**
     * 🛡️ VANNE DYAL R-RAM.
     *
     * Generation dyal facture hiya l-3amaliya l-aktar li kat-kol RAM f l-app
     * kamla (6 fichiers Excel + l-output). Ila 2 wla 3 users 3afsou f nefs
     * l-weqt, l-heap kay-3mer -> OutOfMemoryError -> l'JVM kat-bloka ->
     * KOLCHI kay-wlli 500 (7ta /api/auth/login) 7ta t-redeployi b l-yedd.
     *
     * Had s-semaphore kay-khelli ghir N facture f nefs l-weqt (default 1).
     * L-b9iya kay-tsennaw f l-file, w ila l-intizar twel bzzaf kay-akhdou
     * 429 b message wa7ed m-fhoum (machi 500 b body khawi).
     *
     * Kat-tbeddel b l-variable d'environnement FACTURE_MAX_CONCURRENT.
     */
    private final Semaphore slots;
    private final int maxConcurrent;

    /** Chhal kay-tsenna f l-file qbel ma n-rje3 429 (dqaiq). */
    private static final long QUEUE_WAIT_MINUTES = 10;

    public FactureController(
            TvcProcessorService tvcService, DiagWifiProcessorService diagWifiService,
            RepeteurProcessorService repeteurService, QaProcessorService qaService,
            InterventionProcessorService interventionService,
            MesProcessorService mesService, FactureMasterService masterService,
            @Value("${facture.max-concurrent:1}") int maxConcurrent) {
        this.tvcService = tvcService;
        this.diagWifiService = diagWifiService;
        this.repeteurService = repeteurService;
        this.qaService = qaService;
        this.interventionService = interventionService;
        this.mesService = mesService;
        this.masterService = masterService;
        this.maxConcurrent = Math.max(1, maxConcurrent);
        this.slots = new Semaphore(this.maxConcurrent, true);
    }

    private static ResponseEntity<byte[]> jsonError(HttpStatus status, String message) {
        String body = "{\"error\":" + quote(message) + ",\"status\":" + status.value() + "}";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new ResponseEntity<>(body.getBytes(StandardCharsets.UTF_8), headers, status);
    }

    private static String quote(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder(s.length() + 2).append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    @PostMapping("/generate")
    public ResponseEntity<byte[]> generateFacture(
            @RequestParam("fichierAVide") MultipartFile fichierAVide,
            @RequestParam("fichierTVC") MultipartFile fichierTVC,
            @RequestParam("fichierRepeteur") MultipartFile fichierRepeteur,
            @RequestParam("fichierDiagWifi") MultipartFile fichierDiagWifi,
            @RequestParam("fichierQA") MultipartFile fichierQA,
            @RequestParam(value = "fichierIntervention", required = false) MultipartFile fichierIntervention,
            @RequestParam(value = "devisData", required = false) String devisDataJson,
            @RequestParam(value = "typeFacture", required = false, defaultValue = "KYNTUS") String typeFacture
    ) {
        boolean acquired;
        try {
            acquired = slots.tryAcquire(QUEUE_WAIT_MINUTES, TimeUnit.MINUTES);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return jsonError(HttpStatus.SERVICE_UNAVAILABLE, "Traitement interrompu, merci de réessayer.");
        }

        if (!acquired) {
            return jsonError(HttpStatus.TOO_MANY_REQUESTS,
                    "Le serveur traite déjà " + maxConcurrent
                            + " facture(s). Merci d'attendre la fin du traitement en cours puis de réessayer.");
        }

        try {
            boolean isTisseo = FactureMasterService.TYPE_TISSEO.equalsIgnoreCase(typeFacture);
            String type = isTisseo ? FactureMasterService.TYPE_TISSEO : FactureMasterService.TYPE_KYNTUS;
            long t0 = System.currentTimeMillis();
            System.out.println("🚀 [FACTURE ENGINE] Début du traitement... (Grille : " + type + ")");

            // POI MASTER FIX : limite memoire dyal les byte arrays dyal POI
            IOUtils.setByteArrayMaxOverride(300_000_000);

            // Traduction dyal l-JSON d-Devis l-Map Java
            Map<String, Double> devisMap = new HashMap<>();
            if (devisDataJson != null && !devisDataJson.trim().isEmpty()) {
                ObjectMapper mapper = new ObjectMapper();
                devisMap = mapper.readValue(devisDataJson, new TypeReference<Map<String, Double>>() {});
                System.out.println("✅ Devis Manuel reçu pour " + devisMap.size() + " interventions.");
            }

            // ⚡ Kol processor daba kay-qra f STREAMING w kay-sed l-fichier
            //    qbel ma y-fte7 li mn be3do -> peak RAM baqi haaka 9liil.
            Map<String, String> tvcMap = tvcService.processTvcFile(fichierTVC);
            logStep("TVC", tvcMap.size(), t0);

            Map<String, String> diagWifiMap = diagWifiService.processDiagWifiFile(fichierDiagWifi);
            logStep("DIAG WIFI", diagWifiMap.size(), t0);

            Map<String, String> repeteurMap = repeteurService.processRepeteurFile(fichierRepeteur);
            logStep("REPETEUR", repeteurMap.size(), t0);

            Map<String, QaProcessorService.QaData> qaMap = qaService.processQaFile(fichierQA);
            logStep("QA", qaMap.size(), t0);

            Map<String, String> offreMap = interventionService.processInterventionFile(fichierIntervention);
            logStep("INTERVENTION", offreMap.size(), t0);

            Map<String, MesProcessorService.MesResult> mesMap =
                    mesService.processMesData(fichierAVide, diagWifiMap, qaMap, offreMap);

            byte[] finalExcelBytes = masterService.generateFinalFacture(
                    fichierAVide, repeteurMap, tvcMap, diagWifiMap, qaMap, mesMap, offreMap, devisMap, type);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", isTisseo ? "Facture_Tisseo_2080.xlsx" : "Facture_Kyntus_2080.xlsx");
            headers.add("X-Facture-Type", type);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

            System.out.println("✅ [FACTURE ENGINE] Terminé en "
                    + ((System.currentTimeMillis() - t0) / 1000) + "s — "
                    + (finalExcelBytes.length / (1024 * 1024)) + " Mo");
            return new ResponseEntity<>(finalExcelBytes, headers, HttpStatus.OK);

        } catch (OutOfMemoryError oom) {
            // Kan-loggiw qbel ma t-mout l'JVM (-XX:+ExitOnOutOfMemoryError),
            // bach y-b9a athar f `docker logs`.
            System.err.println("💥 [FACTURE ENGINE] OutOfMemoryError ! Fichiers kbar bzzaf "
                    + "wla mem_limit dyal l-conteneur sghir. Zid mem_limit f docker-compose.yml.");
            throw oom;
        } catch (Exception e) {
            System.err.println("❌ ERREUR LORS DU TRAITEMENT : " + e.getMessage());
            e.printStackTrace();
            // JSON, machi body khawi : hakka l-frontend kay-wrri 3lach tkhessr
            return jsonError(HttpStatus.INTERNAL_SERVER_ERROR,
                    e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        } finally {
            slots.release();
        }
    }

    private void logStep(String label, int size, long t0) {
        Runtime rt = Runtime.getRuntime();
        long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
        long maxMb = rt.maxMemory() / (1024 * 1024);
        System.out.println("   ↳ " + label + " : " + size + " lignes | heap "
                + usedMb + "/" + maxMb + " Mo | +"
                + ((System.currentTimeMillis() - t0) / 1000) + "s");
    }
}
