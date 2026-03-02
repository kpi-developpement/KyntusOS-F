package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.model.PilotRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PilotRecordRepository extends JpaRepository<PilotRecord, Long> {

    List<PilotRecord> findByPilotIdAndEpsReferenceOrderByIdDesc(Long pilotId, String epsReference);

    // 🔥 FIX: 7iydna l'condition dyal pilotId bach y-fetchi kolchi (Global Admin View)
    @Query("SELECT p FROM PilotRecord p WHERE " +
            "(:version IS NULL OR :version = '' OR p.version = :version) " +
            "AND (:eps IS NULL OR :eps = '' OR LOWER(p.epsReference) LIKE LOWER(CONCAT('%', :eps, '%')))")
    Page<PilotRecord> findAdvancedFilters(@Param("version") String version,
                                          @Param("eps") String eps,
                                          Pageable pageable);
}