package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.model.Batch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BatchRepository extends JpaRepository<Batch, Long> {
}