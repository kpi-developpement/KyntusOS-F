package com.kyntus.Workflow.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Date;
import java.util.Map;

@Entity
@Table(name = "pilot_records")
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

    // 🔥 LA NOUVELLE COLONNE CATEGORY (EX: RACC)
    @Column(name = "category", nullable = false)
    private String category;

    @ManyToOne
    @JoinColumn(name = "pilot_id")
    private User pilot;
}