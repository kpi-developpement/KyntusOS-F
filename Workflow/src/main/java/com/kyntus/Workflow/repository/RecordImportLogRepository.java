package com.kyntus.Workflow.repository;

import com.kyntus.Workflow.model.RecordImportLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecordImportLogRepository extends JpaRepository<RecordImportLog, Long> {

    List<RecordImportLog> findTop100ByDomainAndCategoryAndImportYearAndImportMonthOrderByImportedAtDesc(
            String domain, String category, Integer importYear, Integer importMonth);
}
