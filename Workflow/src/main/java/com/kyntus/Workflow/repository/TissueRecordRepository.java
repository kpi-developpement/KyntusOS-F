package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.model.TissueRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TissueRecordRepository extends JpaRepository<TissueRecord, Long> {

    List<TissueRecord> findByPilotIdAndEpsReferenceOrderByIdDesc(Long pilotId, String epsReference);

    @Query("SELECT t FROM TissueRecord t WHERE " +
            "t.category = :category AND t.importYear = :year AND t.importMonth = :month " +
            "AND (:version IS NULL OR :version = '' OR t.version = :version) " +
            "AND (:eps IS NULL OR :eps = '' OR LOWER(t.epsReference) LIKE LOWER(CONCAT('%', :eps, '%')))")
    Page<TissueRecord> findAdvancedFilters(@Param("category") String category,
                                           @Param("year") int year,
                                           @Param("month") int month,
                                           @Param("version") String version,
                                           @Param("eps") String eps,
                                           Pageable pageable);

    @Query("SELECT DISTINCT t.version FROM TissueRecord t WHERE t.category = :category ORDER BY t.version")
    List<String> findDistinctVersions(@Param("category") String category);

    @Query("SELECT DISTINCT t.version FROM TissueRecord t WHERE t.category = :category " +
            "AND (:year IS NULL OR t.importYear = :year) " +
            "AND (:month IS NULL OR t.importMonth = :month) " +
            "ORDER BY t.version")
    List<String> findDistinctVersionsByDate(@Param("category") String category,
                                            @Param("year") Integer year,
                                            @Param("month") Integer month);

    @Query("SELECT t FROM TissueRecord t WHERE LOWER(t.epsReference) = LOWER(:eps) " +
            "AND t.category = :category AND t.importYear = :year AND t.importMonth = :month " +
            "ORDER BY t.id ASC")
    List<TissueRecord> findHistoryByEps(@Param("eps") String eps,
                                        @Param("category") String category,
                                        @Param("year") int year,
                                        @Param("month") int month);

    @Query("SELECT t FROM TissueRecord t WHERE " +
            "(LOWER(TRIM(t.epsReference)) IN :epsList) AND " +
            "(:category IS NULL OR t.category = :category) AND " +
            "(:year IS NULL OR t.importYear = :year) AND " +
            "(:month IS NULL OR t.importMonth = :month) " +
            "ORDER BY t.id ASC")
    List<TissueRecord> findGlobalHistoryByEpsList(
            @Param("epsList") List<String> epsList,
            @Param("category") String category,
            @Param("year") Integer year,
            @Param("month") Integer month);
}
