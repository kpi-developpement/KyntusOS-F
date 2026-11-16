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

    // 🔥 THE FIX: Dima njibou l'kher (le plus récent) bach n-évitiw NonUniqueResultException 🔥
    Optional<Task> findFirstByEpsReferenceOrderByIdDesc(String epsReference);

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

    // --- 🔎 EPS TRACER : IDs dyal ga3 les tasks li fihom wahed mn les refs (epsReference wla ay cellule Excel) ---
    @Query(value = "SELECT t.id FROM tasks t " +
            "WHERE UPPER(TRIM(t.eps_reference)) IN (:refs) " +
            "OR (jsonb_typeof(t.dynamic_data) = 'object' AND EXISTS (" +
            "  SELECT 1 FROM jsonb_each_text(t.dynamic_data) kv WHERE UPPER(TRIM(kv.value)) IN (:refs)))",
            nativeQuery = true)
    List<Long> findIdsMatchingRefs(@Param("refs") List<String> refs);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.template LEFT JOIN FETCH t.assignee WHERE t.id IN :ids ORDER BY t.id ASC")
    List<Task> findAllWithTemplateAndAssignee(@Param("ids") List<Long> ids);

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