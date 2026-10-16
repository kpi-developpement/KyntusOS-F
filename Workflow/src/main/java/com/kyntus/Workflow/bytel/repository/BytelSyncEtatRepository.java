package com.kyntus.Workflow.bytel.repository;

import com.kyntus.Workflow.bytel.model.BytelSyncEtat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BytelSyncEtatRepository extends JpaRepository<BytelSyncEtat, String> {

    List<BytelSyncEtat> findAllByOrderByPeriodeDesc();
}
