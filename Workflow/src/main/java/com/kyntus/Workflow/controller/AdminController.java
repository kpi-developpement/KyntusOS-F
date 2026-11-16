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
        // 🔥 THE FIX: Utilisation de la nouvelle méthode sécurisée 🔥
        Optional<Task> taskOpt = taskRepository.findFirstByEpsReferenceOrderByIdDesc(eps);
        if (taskOpt.isPresent()) {
            return ResponseEntity.ok(taskOpt.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // 1-bis. 🔎 EPS TRACER : bulk search (EPS / LOR) f ga3 les templates + chkoun khdemhoum
    @PostMapping("/eps-tracer")
    public ResponseEntity<?> traceEps(@RequestBody Map<String, Object> payload) {
        Object raw = payload.get("refs");
        if (!(raw instanceof List<?> rawList)) {
            return ResponseEntity.badRequest().body(Map.of("message", "refs (liste) obligatoire"));
        }

        LinkedHashSet<String> refs = new LinkedHashSet<>();
        for (Object o : rawList) {
            if (o == null) continue;
            String r = o.toString().trim().toUpperCase();
            if (!r.isEmpty()) refs.add(r);
        }
        if (refs.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucune référence valide"));
        }
        if (refs.size() > 20000) {
            return ResponseEntity.badRequest().body(Map.of("message", "Maximum 20 000 références par recherche"));
        }

        // Chunks de 1000 bach PostgreSQL may-t9elch
        List<String> refList = new ArrayList<>(refs);
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        for (int i = 0; i < refList.size(); i += 1000) {
            ids.addAll(taskRepository.findIdsMatchingRefs(refList.subList(i, Math.min(i + 1000, refList.size()))));
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        Set<String> found = new HashSet<>();
        List<Long> idList = new ArrayList<>(ids);
        for (int i = 0; i < idList.size(); i += 1000) {
            for (Task t : taskRepository.findAllWithTemplateAndAssignee(idList.subList(i, Math.min(i + 1000, idList.size())))) {
                String matchedRef = null;
                String matchedColumn = null;
                String eps = t.getEpsReference() == null ? "" : t.getEpsReference().trim().toUpperCase();
                if (refs.contains(eps)) {
                    matchedRef = eps;
                    matchedColumn = "epsReference";
                } else if (t.getDynamicData() != null) {
                    for (Map.Entry<String, Object> e : t.getDynamicData().entrySet()) {
                        if (e.getValue() == null) continue;
                        String v = e.getValue().toString().trim().toUpperCase();
                        if (refs.contains(v)) {
                            matchedRef = v;
                            matchedColumn = e.getKey();
                            break;
                        }
                    }
                }
                if (matchedRef == null) continue;
                found.add(matchedRef);

                Map<String, Object> row = new LinkedHashMap<>();
                row.put("taskId", t.getId());
                row.put("ref", matchedRef);
                row.put("matchedColumn", matchedColumn);
                row.put("epsReference", t.getEpsReference());
                row.put("status", t.getStatus());
                row.put("templateId", t.getTemplate() != null ? t.getTemplate().getId() : null);
                row.put("templateName", t.getTemplate() != null ? t.getTemplate().getName() : null);
                row.put("assigneeId", t.getAssignee() != null ? t.getAssignee().getId() : null);
                row.put("assignee", t.getAssignee() != null ? t.getAssignee().getUsername() : null);
                row.put("importedAt", t.getImportedAt());
                row.put("deadline", t.getDeadline());
                row.put("timeSeconds", t.getCumulativeTimeSeconds());
                row.put("flaggedError", t.isFlaggedError());
                row.put("dynamicData", t.getDynamicData() != null ? t.getDynamicData() : Map.of());
                rows.add(row);
            }
        }

        List<String> notFound = refList.stream().filter(r -> !found.contains(r)).toList();

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("requested", refList.size());
        res.put("foundRefs", found.size());
        res.put("rows", rows);
        res.put("notFound", notFound);
        return ResponseEntity.ok(res);
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