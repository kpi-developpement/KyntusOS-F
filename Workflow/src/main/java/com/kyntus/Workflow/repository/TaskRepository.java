package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    // --- STANDARD QUERIES ---
    List<Task> findByTemplateId(Long templateId);
    List<Task> findByAssigneeId(Long assigneeId);
    Optional<Task> findByEpsReference(String epsReference);

    // --- ADVANCED QUERIES (STATS) ---
    List<Task> findByAssigneeIdAndTemplateId(Long assigneeId, Long templateId);
    List<Task> findByTemplateIdAndStatus(Long templateId, String status);

    // Pour Global Health Check
    long countByStatus(String status);
    int countByAssigneeId(Long assigneeId);

    // --- DISPATCHING ---
    List<Task> findByAssigneeIsNull();
    List<Task> findByTemplateIdAndAssigneeIsNull(Long templateId);
    List<Task> findByBatchIdAndAssigneeIsNull(Long batchId);

    // --- SMART FILTER (JSONB) ---
    @Query(value = "SELECT * FROM tasks t " +
            "WHERE t.template_id = :templateId " +
            "AND t.assigned_to IS NULL " +
            "AND t.dynamic_data ->> :key = :value",
            nativeQuery = true)
    List<Task> findByTemplateAndFilter(
            @Param("templateId") Long templateId,
            @Param("key") String key,
            @Param("value") String value
    );

    @Query(value = "SELECT DISTINCT t.dynamic_data ->> :key FROM tasks t " +
            "WHERE t.template_id = :templateId " +
            "AND t.assigned_to IS NULL " +
            "AND t.dynamic_data ->> :key IS NOT NULL",
            nativeQuery = true)
    List<String> findDistinctValuesByColumn(
            @Param("templateId") Long templateId,
            @Param("key") String key
    );
}