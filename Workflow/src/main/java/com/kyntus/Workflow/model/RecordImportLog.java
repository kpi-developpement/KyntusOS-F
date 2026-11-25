package com.kyntus.Workflow.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.Date;

@Entity
@Table(name = "record_import_logs", indexes = {
        @Index(name = "idx_import_logs_lookup", columnList = "domain, category, import_year, import_month, imported_at")
})
@Data
public class RecordImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "domain", nullable = false, length = 32)
    private String domain; // "KYNTUS" or "TISSUE"

    @Column(name = "category", nullable = false, length = 64)
    private String category;

    @Column(name = "import_year", nullable = false)
    private Integer importYear;

    @Column(name = "import_month", nullable = false)
    private Integer importMonth;

    @Column(name = "filename", nullable = false, length = 512)
    private String filename;

    @Column(name = "status", nullable = false, length = 32)
    private String status; // "SUCCESS", "DUPLICATE_ONLY", "ERROR"

    @Column(name = "total_rows")
    private Integer totalRows;

    @Column(name = "inserted_rows")
    private Integer insertedRows;

    @Column(name = "duplicate_rows")
    private Integer duplicateRows;

    @Column(name = "routed_months", length = 128)
    private String routedMonths;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "imported_at", nullable = false)
    private Date importedAt;
}
