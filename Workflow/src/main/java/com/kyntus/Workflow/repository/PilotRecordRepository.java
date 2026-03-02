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

    @Query("SELECT p FROM PilotRecord p WHERE " +
            "(:version IS NULL OR :version = '' OR p.version = :version) " +
            "AND (:eps IS NULL OR :eps = '' OR LOWER(p.epsReference) LIKE LOWER(CONCAT('%', :eps, '%')))")
    Page<PilotRecord> findAdvancedFilters(@Param("version") String version,
                                          @Param("eps") String eps,
                                          Pageable pageable);

    // 🔥 JADID: Njbdou les versions dynamiques (V1, V2, V3, V4...) bla tikrar
    @Query("SELECT DISTINCT p.version FROM PilotRecord p ORDER BY p.version")
    List<String> findDistinctVersions();

    // 🔥 JADID: Njbdou l'Historique dyal wa7ed l'EPS b dbt mrteb mn V1 l V'MAX'
    @Query("SELECT p FROM PilotRecord p WHERE LOWER(p.epsReference) = LOWER(:eps) ORDER BY p.id ASC")
    List<PilotRecord> findHistoryByEps(@Param("eps") String eps);
}