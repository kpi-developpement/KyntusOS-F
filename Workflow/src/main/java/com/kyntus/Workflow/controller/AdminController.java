package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.PointLog;
import com.kyntus.Workflow.model.Role;
import com.kyntus.Workflow.model.Task;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.PointLogRepository;
import com.kyntus.Workflow.repository.TaskRepository;
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:3000")
public class AdminController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final PointLogRepository pointLogRepository; // Nouveau Repository

    public AdminController(TaskRepository taskRepository, UserRepository userRepository, PointLogRepository pointLogRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.pointLogRepository = pointLogRepository;
    }

    // 1. SEARCH GLOBAL
    @GetMapping("/search")
    public ResponseEntity<?> searchByEps(@RequestParam String eps) {
        Optional<Task> taskOpt = taskRepository.findByEpsReference(eps);
        if (taskOpt.isPresent()) {
            return ResponseEntity.ok(taskOpt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 2. FLAG ERROR (Blâme - Ancienne méthode, toujours utile pour l'audit)
    @PostMapping("/flag-error/{taskId}")
    public ResponseEntity<?> flagError(@PathVariable Long taskId) {
        return taskRepository.findById(taskId).map(task -> {
            if (task.isFlaggedError()) {
                return ResponseEntity.badRequest().body("Tâche déjà signalée comme erreur");
            }
            task.setFlaggedError(true);
            taskRepository.save(task);

            User pilot = task.getAssignee();
            if (pilot != null) {
                pilot.setErrorCount(pilot.getErrorCount() + 1);
                userRepository.save(pilot);
            }
            return ResponseEntity.ok("Erreur signalée. Compteur du pilote incrémenté.");
        }).orElse(ResponseEntity.notFound().build());
    }

    // 3. --- 🔥 NOUVEAU : AJOUTER/RETIRER DES POINTS (VAR) ---
    @PostMapping("/points")
    public ResponseEntity<?> manualPointsAdjustment(@RequestBody Map<String, Object> payload) {
        // Validation des inputs
        if (!payload.containsKey("pilotId") || !payload.containsKey("points") || !payload.containsKey("reason")) {
            return ResponseEntity.badRequest().body("Données manquantes (pilotId, points, reason)");
        }

        Long pilotId = Long.valueOf(payload.get("pilotId").toString());
        int points = Integer.parseInt(payload.get("points").toString());
        String reason = (String) payload.get("reason");
        // On suppose que l'admin est connecté (pour l'instant on hardcode ou on récupère du contexte de sécu)
        // Dans un vrai cas, on récupère l'admin via le token. Ici on prend le premier admin trouvé pour l'exemple.
        User admin = userRepository.findByUsername("elabdi").orElse(null);

        User pilot = userRepository.findById(pilotId)
                .orElseThrow(() -> new RuntimeException("Pilote introuvable"));

        // 1. Mettre à jour le solde du pilote
        pilot.setManualPoints(pilot.getManualPoints() + points);
        userRepository.save(pilot);

        // 2. Enregistrer dans l'historique (Log)
        PointLog log = new PointLog();
        log.setPilot(pilot);
        log.setAdmin(admin);
        log.setPoints(points);
        log.setReason(reason);
        log.setCreatedAt(java.time.LocalDateTime.now());
        pointLogRepository.save(log);

        return ResponseEntity.ok("Points mis à jour avec succès. Nouveau solde: " + pilot.getManualPoints());
    }

    // 4. HISTORIQUE DES POINTS D'UN PILOTE
    @GetMapping("/points/history/{pilotId}")
    public List<PointLog> getPointsHistory(@PathVariable Long pilotId) {
        return pointLogRepository.findByPilotIdOrderByCreatedAtDesc(pilotId);
    }
}