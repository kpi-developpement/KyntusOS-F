package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.model.PointLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PointLogRepository extends JpaRepository<PointLog, Long> {
    List<PointLog> findByPilotIdOrderByCreatedAtDesc(Long pilotId);
}