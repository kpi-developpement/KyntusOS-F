package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.model.WorkflowTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkflowTemplateRepository extends JpaRepository<WorkflowTemplate, Long> {
}