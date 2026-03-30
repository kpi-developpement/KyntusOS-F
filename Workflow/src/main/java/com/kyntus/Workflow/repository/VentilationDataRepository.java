package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.entity.VentilationData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface VentilationDataRepository extends JpaRepository<VentilationData, Long> {

    // N-jbdou d-dossier b' l-3am w ch-8er
    Optional<VentilationData> findByYearAndMonth(int year, int month);

    // N-ms7ou d-dossier b' l-3am w ch-8er
    @Transactional
    void deleteByYearAndMonth(int year, int month);
}