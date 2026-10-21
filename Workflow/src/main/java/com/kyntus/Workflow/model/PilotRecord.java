package com.kyntus.Workflow.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Date;
import java.util.Map;

@Entity
// 🔥 THE FIX: Zidna les Indexes hna bach Hibernate y-creyihom bla ma y-dir Deadlock f' demarrage
@Table(name = "pilot_records", indexes = {
        @Index(name = "idx_pilot_records_main", columnList = "category, import_year, import_month"),
        @Index(name = "idx_pilot_records_eps", columnList = "eps_reference"),
        @Index(name = "idx_pilot_records_perf", columnList = "category, import_year, import_month, eps_reference")
})
@Data
public class PilotRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "eps_reference", nullable = false)
    private String epsReference;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "dynamic_data", columnDefinition = "jsonb")
    private Map<String, Object> dynamicData;

    @Column(name = "version")
    private String version;

    @Column(name = "imported_at")
    private Date importedAt;

    @Column(name = "import_year", nullable = false)
    private Integer importYear;

    @Column(name = "import_month", nullable = false)
    private Integer importMonth;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "source_file")
    private String sourceFile;

    // 🔥 THE TIME-MACHINE COLUMN (Ex: 1, 2, 4...)
    @Column(name = "file_rank")
    private Integer fileRank;

    // 🔥 THE FIX: Zidna data_hash hna blast ma n-dirou ALTER TABLE f' PostConstruct
    @Column(name = "data_hash")
    private Integer dataHash;

    @ManyToOne
    @JoinColumn(name = "pilot_id")
    private User pilot;
}