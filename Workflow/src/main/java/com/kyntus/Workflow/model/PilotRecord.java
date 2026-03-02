package com.kyntus.Workflow.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Data
@Table(name = "pilot_records", indexes = @Index(name = "idx_pilot_eps", columnList = "epsReference"))
public class PilotRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String epsReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pilot_id", nullable = false)
    // 🔥 L'FIX HOWA HADA: Kan-goulou l'Jackson y-fot had l'objet melli ysawb JSON
    @JsonIgnore
    private User pilot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> dynamicData;

    private String version = "V1";

    private LocalDateTime importedAt = LocalDateTime.now();
}