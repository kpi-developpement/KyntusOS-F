package com.kyntus.Workflow.service;

import com.kyntus.Workflow.dto.DispatchRequestDto;
import com.kyntus.Workflow.model.Task;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.TaskRepository;
import com.kyntus.Workflow.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DispatchService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public DispatchService(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void executeDispatch(DispatchRequestDto request) {

        // =================================================================
        // 1. MODE MANUEL (Selectionner tache b tache)
        // =================================================================
        if ("MANUAL".equalsIgnoreCase(request.getMode())) {
            if (request.getTargetPilotId() == null || request.getTaskIds() == null || request.getTaskIds().isEmpty()) {
                throw new RuntimeException("Paramètres manquants pour le mode MANUEL");
            }

            User pilot = userRepository.findById(request.getTargetPilotId())
                    .orElseThrow(() -> new RuntimeException("Pilote introuvable"));

            List<Task> tasks = taskRepository.findAllById(request.getTaskIds());
            for (Task t : tasks) {
                t.setAssignee(pilot);
                t.setStatus("A_FAIRE");
            }
            taskRepository.saveAll(tasks);
            return;
        }

        // =================================================================
        // PREPARATION COMMUN (AUTO & FILTER)
        // =================================================================
        if (request.getPilotIds() == null || request.getPilotIds().isEmpty()) {
            throw new RuntimeException("Aucun pilote sélectionné !");
        }
        // On récupère les pilotes
        List<User> pilots = userRepository.findAllById(request.getPilotIds());


        // =================================================================
        // 2. MODE SMART FILTER (Stratified Distribution)
        // =================================================================
        if ("FILTER".equalsIgnoreCase(request.getMode())) {
            if (request.getTemplateId() == null || request.getFilterKey() == null ||
                    request.getFilterValues() == null || request.getFilterValues().isEmpty()) {
                throw new RuntimeException("Critères de filtrage manquants (Template, Colonne, Valeurs)");
            }

            // 🔥 ALGORITHME "GROUPE PAR GROUPE" (Le secret de l'équité)
            for (String value : request.getFilterValues()) {
                // 1. Récupérer les tâches de CE groupe spécifique (ex: "Oujda")
                List<Task> groupTasks = taskRepository.findByTemplateAndFilter(
                        request.getTemplateId(),
                        request.getFilterKey(),
                        value
                );

                // 2. Distribuer ce groupe équitablement
                if (!groupTasks.isEmpty()) {
                    distributeEqually(groupTasks, pilots);
                }
            }
            // Pas besoin de saveAll ici car distributeEqually le fait pour chaque groupe
        }

        // =================================================================
        // 3. MODE AUTO BATCH (Template complet)
        // =================================================================
        else if ("BATCH".equalsIgnoreCase(request.getMode())) {
            if (request.getTemplateId() == null) {
                throw new RuntimeException("Template ID manquant pour l'Auto Batch");
            }

            // On prend TOUT ce qui reste dans le Template
            List<Task> allTasks = taskRepository.findByTemplateIdAndAssigneeIsNull(request.getTemplateId());

            if (allTasks.isEmpty()) {
                throw new RuntimeException("Aucune tâche disponible dans ce Template.");
            }

            // On distribue le tout d'un coup
            distributeEqually(allTasks, pilots);
        }
        else {
            throw new RuntimeException("Mode de dispatch inconnu");
        }
    }

    /**
     * Algorithme de Distribution Équitable (Round Robin simplifié)
     */
    private void distributeEqually(List<Task> tasks, List<User> pilots) {
        int totalTasks = tasks.size();
        int pilotCount = pilots.size();

        // Taille de base par pilote
        int chunkSize = totalTasks / pilotCount;
        // Le reste à distribuer 1 par 1 (ex: 10 taches / 3 pilotes = 3 chacun + 1 reste)
        int remainder = totalTasks % pilotCount;

        int taskIndex = 0;

        for (int i = 0; i < pilotCount; i++) {
            User pilot = pilots.get(i);

            // Combien ce pilote va prendre ? (Base + 1 si il fait partie des chanceux du reste)
            int myShare = chunkSize + (i < remainder ? 1 : 0);

            for (int j = 0; j < myShare; j++) {
                if (taskIndex < totalTasks) {
                    Task t = tasks.get(taskIndex++);
                    t.setAssignee(pilot);
                    t.setStatus("A_FAIRE");
                }
            }
        }
        // Commit en base
        taskRepository.saveAll(tasks);
    }
}