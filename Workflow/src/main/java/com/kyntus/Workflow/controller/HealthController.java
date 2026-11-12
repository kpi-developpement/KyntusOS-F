package com.kyntus.Workflow.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Map;

/**
 * Endpoint khfif 7da bzzaf, kay-khdem 3la 2 7ajat :
 *
 *  1. /api/health          -> LIVENESS. Ma-kay-mess-ch l-DB. Ila l'JVM m-blokiya
 *                             (OOM / GC thrashing) had l-endpoint ma-kay-jawb-ch,
 *                             w l-healthcheck dyal Docker kay-redemmer l-conteneur.
 *  2. /api/health/db       -> READINESS. Kay-7awel y-jib connexion mn l-pool
 *                             (Hikari). Hada li kay-gollek wach l-mouchkil
 *                             f l-backend wla f Postgres (10.10.10.50).
 *
 * Kay-rje3 TOUJOURS JSON, 7ta f l'erreur, bach l-frontend ma-y-tle3-ch
 * "SyntaxError: Unexpected token 'I'".
 */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> liveness() {
        Runtime rt = Runtime.getRuntime();
        long usedMb = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
        long maxMb = rt.maxMemory() / (1024 * 1024);
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "heapUsedMb", usedMb,
                "heapMaxMb", maxMb,
                "heapUsedPercent", maxMb == 0 ? 0 : (usedMb * 100 / maxMb)
        ));
    }

    @GetMapping("/db")
    public ResponseEntity<Map<String, Object>> database() {
        long start = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection()) {
            boolean valid = conn.isValid(3);
            long ms = System.currentTimeMillis() - start;
            if (!valid) {
                return ResponseEntity.status(503).body(Map.of(
                        "status", "DOWN", "reason", "connection invalide", "latencyMs", ms));
            }
            return ResponseEntity.ok(Map.of("status", "UP", "latencyMs", ms));
        } catch (Exception e) {
            // Hada l-cas dyal "pool exhausted" wla Postgres m-9tou3
            return ResponseEntity.status(503).body(Map.of(
                    "status", "DOWN",
                    "error", e.getClass().getSimpleName(),
                    "message", String.valueOf(e.getMessage()),
                    "latencyMs", System.currentTimeMillis() - start));
        }
    }
}
