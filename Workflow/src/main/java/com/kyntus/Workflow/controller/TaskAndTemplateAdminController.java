package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.Task;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.TaskRepository;
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TaskAndTemplateAdminController {

    private final JdbcTemplate jdbcTemplate;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskAndTemplateAdminController(
            JdbcTemplate jdbcTemplate,
            TaskRepository taskRepository,
            UserRepository userRepository
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    // =========================================================================
    // 1. 🗑️ SUPPRIMER UN TEMPLATE (ET TOUTES SES TÂCHES ASSOCIÉES)
    // =========================================================================
    @DeleteMapping("/templates/{templateId}")
    @Transactional
    public ResponseEntity<?> deleteTemplate(@PathVariable Long templateId) {
        try {
            // 🔥 THE FIX: Utilisation des VRAIS noms de tables générés par Hibernate (PostgreSQL)
            
            // 1. On supprime d'abord les tâches liées au protocole (évite l'erreur Foreign Key)
            jdbcTemplate.update("DELETE FROM tasks WHERE template_id = ?", templateId);
            
            // 2. On supprime les colonnes dynamiques (La table s'appelle field_definitions)
            jdbcTemplate.update("DELETE FROM field_definitions WHERE template_id = ?", templateId);
            
            // 3. On supprime le protocole lui-même (La table s'appelle workflow_template)
            jdbcTemplate.update("DELETE FROM workflow_template WHERE id = ?", templateId);
            
            return ResponseEntity.ok(Map.of("message", "Protocole et tâches supprimés avec succès", "id", templateId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // 2. 🔄 RÉAFFECTER UNE OU PLUSIEURS TÂCHES D'UN PILOTE À UN AUTRE (KANBAN)
    // =========================================================================
    @PatchMapping("/tasks/reassign")
    @Transactional
    public ResponseEntity<?> reassignTasks(@RequestBody Map<String, Object> payload) {
        try {
            Long newPilotId = Long.valueOf(String.valueOf(payload.get("newPilotId")));
            User newPilot = userRepository.findById(newPilotId)
                    .orElseThrow(() -> new RuntimeException("Nouveau pilote introuvable"));

            List<Long> taskIds = new ArrayList<>();
            if (payload.get("taskIds") instanceof List<?> rawList) {
                for (Object item : rawList) {
                    taskIds.add(Long.valueOf(String.valueOf(item)));
                }
            } else if (payload.get("taskId") != null) {
                taskIds.add(Long.valueOf(String.valueOf(payload.get("taskId"))));
            }

            if (taskIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Aucune tâche sélectionnée"));
            }

            List<Task> tasks = taskRepository.findAllById(taskIds);
            for (Task t : tasks) {
                t.setAssignee(newPilot);
                // Si la tâche était déjà validée définitivement, on la remet en cours ou à faire pour le nouveau pilote
                if ("VALIDATED".equalsIgnoreCase(t.getStatus())) {
                    t.setStatus("EN_COURS");
                }
            }
            taskRepository.saveAll(tasks);

            return ResponseEntity.ok(Map.of(
                    "message", tasks.size() + " tâche(s) transférée(s) à " + newPilot.getUsername(),
                    "newPilot", newPilot.getUsername(),
                    "count", tasks.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // 3. 🔒 VALIDATION FINALE PAR L'ADMIN DANS LE KANBAN (VERROUILLE CHEZ LE PILOTE)
    // =========================================================================
    @PatchMapping("/tasks/{taskId}/validate-final")
    @Transactional
    public ResponseEntity<?> validateFinalByAdmin(@PathVariable Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Tâche introuvable"));
        task.setStatus("VALIDATED");
        taskRepository.save(task);
        return ResponseEntity.ok(Map.of("message", "Tâche validée finalement et verrouillée", "status", "VALIDATED"));
    }

    // =========================================================================
    // 4. 🔍 RECHERCHER QUI A TRAVAILLÉ SUR UN EPS (HISTORIQUE & PILOTE)
    // =========================================================================
    @GetMapping("/tasks/search-eps")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> searchWhoWorkedOnEps(@RequestParam("q") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        String cleanQuery = "%" + query.trim().toLowerCase() + "%";

        String sql = """
            SELECT 
                t.id AS task_id,
                t.status AS status,
                t.dynamic_data::text AS dynamic_data,
                u.id AS pilot_id,
                u.username AS pilot_name,
                t.template_id AS template_id
            FROM tasks t
            LEFT JOIN users u ON t.assignee_id = u.id
            WHERE LOWER(t.dynamic_data::text) LIKE ?
            ORDER BY t.id DESC
            LIMIT 100
        """;

        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, cleanQuery);
        return ResponseEntity.ok(results);
    }
}