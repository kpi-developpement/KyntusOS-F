package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.service.contestation.ContestationService;
import org.apache.poi.util.IOUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * ⚖️ CONTESTATION : GLOBAL + FACTURE + CA -> fichier "Contestation_dd-MM-yyyy.xlsx".
 */
@RestController
@RequestMapping("/api/contestation")
public class ContestationController {

    private final ContestationService service;
    /** Une génération à la fois (3 fichiers Excel en mémoire). */
    private final Semaphore slot = new Semaphore(1, true);

    public ContestationController(ContestationService service) {
        this.service = service;
    }

    @PostMapping("/generate")
    public ResponseEntity<byte[]> generate(
            @RequestParam("fichierGlobal") MultipartFile fichierGlobal,
            @RequestParam("fichierFacture") MultipartFile fichierFacture,
            @RequestParam(value = "fichierCa", required = false) MultipartFile fichierCa) {

        boolean acquired;
        try {
            acquired = slot.tryAcquire(5, TimeUnit.MINUTES);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return error(HttpStatus.SERVICE_UNAVAILABLE, "Traitement interrompu, merci de réessayer.");
        }
        if (!acquired) {
            return error(HttpStatus.TOO_MANY_REQUESTS, "Une contestation est déjà en cours de génération. Réessayez dans un instant.");
        }

        try {
            long t0 = System.currentTimeMillis();
            System.out.println("⚖️ [CONTESTATION] Début du traitement...");
            IOUtils.setByteArrayMaxOverride(300_000_000);

            ContestationService.Result r = service.generate(fichierGlobal, fichierFacture, fichierCa);

            String name = "Contestation_" + LocalDate.now().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) + ".xlsx";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", name);
            headers.add("X-Contestation-Stats", "lignes=" + r.lignes() + ";ras=" + r.ras()
                    + ";anomalies=" + r.anomalies() + ";aCompleter=" + r.aCompleter()
                    + ";sansFacture=" + r.sansFacture() + ";sansCa=" + r.sansCa()
                    + ";multiVersions=" + r.multiVersions());
            headers.add(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "X-Contestation-Stats, Content-Disposition");

            System.out.println("✅ [CONTESTATION] " + r.lignes() + " EPS en "
                    + (System.currentTimeMillis() - t0) + " ms");
            return new ResponseEntity<>(r.bytes(), headers, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return error(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return error(HttpStatus.INTERNAL_SERVER_ERROR,
                    e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
        } finally {
            slot.release();
        }
    }

    private static ResponseEntity<byte[]> error(HttpStatus status, String msg) {
        String safe = msg == null ? "" : msg.replace("\\", "\\\\").replace("\"", "\\\"").replaceAll("[\\r\\n\\t]", " ");
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return new ResponseEntity<>(("{\"error\":\"" + safe + "\",\"status\":" + status.value() + "}")
                .getBytes(StandardCharsets.UTF_8), h, status);
    }
}
