package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.model.WorkflowTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowTemplateRepository extends JpaRepository<WorkflowTemplate, Long> {

    // 🔥 THE FIX: Kay-jib l-Missions dyal l-Pilote (userId) + L-Missions Global (NULL) 🔥
    @Query("SELECT w FROM WorkflowTemplate w WHERE w.userId = :userId OR w.userId IS NULL")
    List<WorkflowTemplate> findByUserIdOrGlobal(@Param("userId") Long userId);
}