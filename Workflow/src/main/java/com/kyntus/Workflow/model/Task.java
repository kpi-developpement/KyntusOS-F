package com.kyntus.Workflow.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Data
@Table(name = "tasks", indexes = @Index(name = "idx_eps", columnList = "epsReference"))
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String epsReference;

    private String status = "A_FAIRE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "tasks"})
    private Batch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password", "errorCount", "active", "manualPoints"})
    private User assignee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "fields"})
    private WorkflowTemplate template;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> dynamicData;

    private LocalDateTime deadline;

    @Column(name = "imported_at")
    private LocalDateTime importedAt = LocalDateTime.now();

    @Column(name = "flagged_error")
    private boolean flaggedError = false;

    // --- 🔥 GAMIFICATION : TIME ATTACK ---

    // Le temps total accumulé (en secondes) passé en "EN_COURS"
    @Column(name = "cumulative_time_seconds")
    private Long cumulativeTimeSeconds = 0L;

    // Quand est-ce qu'il a commencé la dernière session ? (Null si pas en cours)
    @Column(name = "last_started_at")
    private LocalDateTime lastStartedAt;
}