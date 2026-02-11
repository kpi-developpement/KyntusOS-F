package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.Task;
import com.kyntus.Workflow.repository.TaskRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:3000")
public class TaskController {

    private final TaskRepository taskRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public TaskController(TaskRepository taskRepository, SimpMessagingTemplate messagingTemplate) {
        this.taskRepository = taskRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping
    public List<Task> getTasks(
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) Long templateId,
            @RequestParam(required = false) String status
    ) {
        if (assigneeId != null && templateId != null) {
            return taskRepository.findByAssigneeIdAndTemplateId(assigneeId, templateId);
        }
        if (assigneeId != null) {
            if (status != null) {
                return taskRepository.findAll().stream()
                        .filter(t -> t.getAssignee() != null && t.getAssignee().getId().equals(assigneeId))
                        .filter(t -> t.getStatus().equals(status))
                        .toList();
            }
            return taskRepository.findByAssigneeId(assigneeId);
        }
        if (templateId != null) {
            return taskRepository.findByTemplateId(templateId);
        }
        return taskRepository.findAll();
    }

    @PatchMapping("/{id}/status")
    public Task updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        Task task = taskRepository.findById(id).orElseThrow();
        String newStatus = payload.get("status");
        String oldStatus = task.getStatus();

        // 🛑 LOGIC DU CHRONO : NE PAS TOUCHER SANS GANTS 🛑

        // Cas 1: Le Pilote ARRÊTE de travailler (Pause ou Fini)
        // On doit calculer le temps écoulé depuis le dernier démarrage et l'ajouter au total
        if ("EN_COURS".equals(oldStatus) && !"EN_COURS".equals(newStatus)) {
            if (task.getLastStartedAt() != null) {
                long secondsElapsed = ChronoUnit.SECONDS.between(task.getLastStartedAt(), LocalDateTime.now());
                long currentTotal = task.getCumulativeTimeSeconds() == null ? 0 : task.getCumulativeTimeSeconds();

                // Sauvegarde le temps total
                task.setCumulativeTimeSeconds(currentTotal + secondsElapsed);

                // Réinitialise le start time (car il a arrêté)
                task.setLastStartedAt(null);
            }
        }

        // Cas 2: Le Pilote COMMENCE à travailler
        // On marque juste l'heure de départ
        if ("EN_COURS".equals(newStatus) && !"EN_COURS".equals(oldStatus)) {
            task.setLastStartedAt(LocalDateTime.now());
        }

        // Mise à jour du statut
        task.setStatus(newStatus);

        // Si c'est fini, on peut aussi enregistrer la date de fin (Optionnel mais utile pour l'Audit)
        if ("DONE".equals(newStatus)) {
            // task.setCompletedAt(LocalDateTime.now()); // Si tu as ce champ
        }

        Task saved = taskRepository.save(task);

        // Real-time notification
        messagingTemplate.convertAndSend("/topic/workflow-events", "TASK_UPDATE");

        return saved;
    }

    // --- (Reste du fichier inchangé) ---
    @PatchMapping("/{id}/data")
    public Task updateData(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        Task task = taskRepository.findById(id).orElseThrow();
        String key = (String) payload.get("key");
        Object value = payload.get("value");

        if (task.getDynamicData() != null) {
            task.getDynamicData().put(key, value);
        }
        return taskRepository.save(task);
    }

    @GetMapping("/unassigned")
    public List<Task> getUnassignedTasks() {
        return taskRepository.findByAssigneeIsNull();
    }

    @GetMapping("/unassigned/{templateId}")
    public List<Task> getUnassignedTasksByTemplate(@PathVariable Long templateId) {
        return taskRepository.findByTemplateIdAndAssigneeIsNull(templateId);
    }

    @GetMapping("/columns/{templateId}")
    public List<String> getTemplateColumns(@PathVariable Long templateId) {
        List<Task> tasks = taskRepository.findByTemplateId(templateId);
        for (Task t : tasks) {
            if (t.getDynamicData() != null && !t.getDynamicData().isEmpty()) {
                return new ArrayList<>(t.getDynamicData().keySet());
            }
        }
        return new ArrayList<>();
    }

    @GetMapping("/values/{templateId}/{columnKey}")
    public List<String> getColumnValues(@PathVariable Long templateId, @PathVariable String columnKey) {
        return taskRepository.findDistinctValuesByColumn(templateId, columnKey);
    }
}