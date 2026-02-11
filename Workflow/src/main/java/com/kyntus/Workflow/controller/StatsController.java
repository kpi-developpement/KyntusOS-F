package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.dto.DashboardSummaryDto;
import com.kyntus.Workflow.dto.PilotStatsDto;
import com.kyntus.Workflow.dto.TemplatePilotStatsDto;
import com.kyntus.Workflow.dto.TerrainStatsDto;
import com.kyntus.Workflow.model.Role;
import com.kyntus.Workflow.model.Task;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.model.WorkflowTemplate;
import com.kyntus.Workflow.repository.TaskRepository;
import com.kyntus.Workflow.repository.UserRepository;
import com.kyntus.Workflow.repository.WorkflowTemplateRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stats")
@CrossOrigin(origins = "http://localhost:3000")
public class StatsController {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final WorkflowTemplateRepository templateRepository;

    public StatsController(UserRepository userRepository, TaskRepository taskRepository, WorkflowTemplateRepository templateRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.templateRepository = templateRepository;
    }

    // --- LEADERBOARD LOGIC (UPDATED WITH TIME PENALTY) ---
    @GetMapping("/leaderboard")
    public List<PilotStatsDto> getLeaderboard() {
        List<User> pilots = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.PILOT)
                .collect(Collectors.toList());

        List<PilotStatsDto> statsList = new ArrayList<>();

        for (User pilot : pilots) {
            List<Task> myTasks = taskRepository.findByAssigneeId(pilot.getId());
            int total = myTasks.size();

            List<Task> validatedTasks = myTasks.stream().filter(t -> "VALIDE".equals(t.getStatus())).toList();
            List<Task> rejectedTasks = myTasks.stream().filter(t -> "REJETE".equals(t.getStatus())).toList();

            int validCount = validatedTasks.size();
            int rejectCount = rejectedTasks.size();

            // 🧠 LOGIQUE DE SCORE AVANCÉE (Time Penalty) 🧠
            double totalScore = 0;

            for (Task t : validatedTasks) {
                // 1. Base score
                double taskScore = 100.0;

                // 2. Calcul du temps (en minutes)
                long seconds = t.getCumulativeTimeSeconds() == null ? 0 : t.getCumulativeTimeSeconds();
                double minutes = seconds / 60.0;

                // 3. Pénalité: 0.5 point par minute
                double penalty = minutes * 0.5;

                // 4. Appliquer pénalité (Score min = 10 points, pour ne pas être cruel)
                taskScore = Math.max(10, taskScore - penalty);

                totalScore += taskScore;
            }

            // Ratio Qualité (Reste inchangé)
            double qualityRatio = (validCount + rejectCount > 0) ? (double) validCount / (validCount + rejectCount) : 0.0;

            // Score Final: (Score basé sur temps + Bonus Admin) * Qualité
            double finalLeaguePoints = (totalScore + pilot.getManualPoints()) * qualityRatio;

            statsList.add(new PilotStatsDto(
                    pilot.getId(),
                    pilot.getUsername(),
                    total, validCount, rejectCount,
                    Math.round(qualityRatio * 100.0),
                    pilot.getManualPoints(),
                    0,
                    Math.round(finalLeaguePoints),
                    finalLeaguePoints > 1000 ? "GOLD" : "SILVER"
            ));
        }

        return statsList.stream()
                .sorted(Comparator.comparingDouble(PilotStatsDto::getLeaguePoints).reversed())
                .collect(Collectors.toList());
    }

    // --- (Reste des méthodes: getPilotStatsForTemplate, getDashboardSummary, etc. inchangées) ---
    // Je remets getPilotStatsForTemplate pour que le fichier soit complet et fonctionnel
    @GetMapping("/template/{templateId}/pilots")
    public ResponseEntity<List<TemplatePilotStatsDto>> getPilotStatsForTemplate(@PathVariable Long templateId) {
        List<Task> tasks = taskRepository.findByTemplateId(templateId);
        List<User> pilots = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.PILOT)
                .toList();
        List<TemplatePilotStatsDto> stats = new ArrayList<>();
        for (User pilot : pilots) {
            List<Task> myTasks = tasks.stream()
                    .filter(t -> t.getAssignee() != null && t.getAssignee().getId().equals(pilot.getId()))
                    .toList();
            if (myTasks.isEmpty()) continue;
            int todo = (int) myTasks.stream().filter(t -> "A_FAIRE".equals(t.getStatus())).count();
            int inProgress = (int) myTasks.stream().filter(t -> "EN_COURS".equals(t.getStatus())).count();
            int done = (int) myTasks.stream().filter(t -> "DONE".equals(t.getStatus())).count();
            int valid = (int) myTasks.stream().filter(t -> "VALIDE".equals(t.getStatus())).count();
            int rejected = (int) myTasks.stream().filter(t -> "REJETE".equals(t.getStatus())).count();
            int total = myTasks.size();
            int completed = done + valid;
            int rate = (total > 0) ? (completed * 100 / total) : 0;
            stats.add(new TemplatePilotStatsDto(
                    pilot.getId(),
                    pilot.getUsername(),
                    null, todo, inProgress, done, valid, rejected, rate
            ));
        }
        stats.sort((a, b) -> Integer.compare(b.getCompletionRate(), a.getCompletionRate()));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/dashboard-summary")
    public ResponseEntity<DashboardSummaryDto> getDashboardSummary() {
        DashboardSummaryDto summary = new DashboardSummaryDto();
        DashboardSummaryDto.GlobalStats global = new DashboardSummaryDto.GlobalStats();
        List<Task> allTasks = taskRepository.findAll();
        global.setTotalToDo((int) allTasks.stream().filter(t -> "A_FAIRE".equals(t.getStatus())).count());
        global.setTotalInProgress((int) allTasks.stream().filter(t -> "EN_COURS".equals(t.getStatus())).count());
        global.setTotalDone((int) allTasks.stream().filter(t -> "DONE".equals(t.getStatus())).count());
        global.setTotalValid((int) allTasks.stream().filter(t -> "VALIDE".equals(t.getStatus())).count());
        summary.setGlobal(global);
        List<WorkflowTemplate> templates = templateRepository.findAll();
        List<DashboardSummaryDto.ProjectSummary> projects = new ArrayList<>();
        for (WorkflowTemplate tmpl : templates) {
            List<Task> tmplTasks = taskRepository.findByTemplateId(tmpl.getId());
            if (tmplTasks.isEmpty()) continue;
            DashboardSummaryDto.ProjectSummary p = new DashboardSummaryDto.ProjectSummary();
            p.setTemplateId(tmpl.getId());
            p.setTemplateName(tmpl.getName());
            p.setTotalTasks(tmplTasks.size());
            int done = (int) tmplTasks.stream().filter(t -> "DONE".equals(t.getStatus())).count();
            int valid = (int) tmplTasks.stream().filter(t -> "VALIDE".equals(t.getStatus())).count();
            int completed = done + valid;
            int progress = (int) (((double) completed / tmplTasks.size()) * 100);
            p.setProgress(progress);
            p.setCountToDo((int) tmplTasks.stream().filter(t -> "A_FAIRE".equals(t.getStatus())).count());
            p.setCountActive((int) tmplTasks.stream().filter(t -> "EN_COURS".equals(t.getStatus())).count());
            p.setCountDone(done);
            p.setCountValid(valid);
            p.setCountRejected((int) tmplTasks.stream().filter(t -> "REJETE".equals(t.getStatus())).count());
            Set<String> activePilots = tmplTasks.stream()
                    .filter(t -> ("EN_COURS".equals(t.getStatus()) || "DONE".equals(t.getStatus())) && t.getAssignee() != null)
                    .map(t -> t.getAssignee().getUsername())
                    .collect(Collectors.toSet());
            p.setActivePilots(new ArrayList<>(activePilots));
            projects.add(p);
        }
        summary.setProjects(projects);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/terrain")
    public List<TerrainStatsDto> getTerrainStats() {
        List<TerrainStatsDto> terrainData = new ArrayList<>();
        List<WorkflowTemplate> templates = templateRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        for (WorkflowTemplate tmpl : templates) {
            List<Task> activeTasks = taskRepository.findByTemplateId(tmpl.getId()).stream()
                    .filter(t -> "A_FAIRE".equals(t.getStatus()) || "EN_COURS".equals(t.getStatus()))
                    .toList();
            double totalHoursRemaining = 0;
            int overdueTasks = 0;
            for (Task t : activeTasks) {
                if (t.getDeadline() != null) {
                    long minutesLeft = Duration.between(now, t.getDeadline()).toMinutes();
                    if (minutesLeft > 0) totalHoursRemaining += (minutesLeft / 60.0);
                    else overdueTasks++;
                } else {
                    totalHoursRemaining += 2.0;
                }
            }
            double risk = (activeTasks.isEmpty()) ? 0.0 : (double) overdueTasks / activeTasks.size();
            terrainData.add(new TerrainStatsDto(
                    tmpl.getId(),
                    tmpl.getName(),
                    Math.round(totalHoursRemaining * 100.0) / 100.0,
                    tmpl.getComplexity(),
                    activeTasks.size(),
                    risk
            ));
        }
        return terrainData;
    }
}