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

    // 🔥 FILTRE TOTAL: CATEGORY + YEAR + MONTH
    @Query("SELECT p FROM PilotRecord p WHERE " +
            "p.category = :category AND p.importYear = :year AND p.importMonth = :month " +
            "AND (:version IS NULL OR :version = '' OR p.version = :version) " +
            "AND (:eps IS NULL OR :eps = '' OR LOWER(p.epsReference) LIKE LOWER(CONCAT('%', :eps, '%')))")
    Page<PilotRecord> findAdvancedFilters(@Param("category") String category,
                                          @Param("year") int year,
                                          @Param("month") int month,
                                          @Param("version") String version,
                                          @Param("eps") String eps,
                                          Pageable pageable);

    // 🔥 VERSIONS PAR CATEGORIE (Pour ne pas mélanger les versions du RACC avec un autre type)
    @Query("SELECT DISTINCT p.version FROM PilotRecord p WHERE p.category = :category ORDER BY p.version")
    List<String> findDistinctVersions(@Param("category") String category);

    // 🔥 HISTORIQUE POUR UN EPS DANS UNE CATEGORIE + MOIS + ANNEE
    @Query("SELECT p FROM PilotRecord p WHERE LOWER(p.epsReference) = LOWER(:eps) " +
            "AND p.category = :category AND p.importYear = :year AND p.importMonth = :month " +
            "ORDER BY p.id ASC")
    List<PilotRecord> findHistoryByEps(@Param("eps") String eps,
                                       @Param("category") String category,
                                       @Param("year") int year,
                                       @Param("month") int month);
}