package com.kyntus.Workflow.bytel.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Niveau EPS : metadonnees de l'intervention.
 * Les qualifications (une ou plusieurs, chacune actionnable) sont dans BytelQualification.
 */
@Entity
@Table(
        name = "bytel_interventions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_bytel_eps_periode",
                columnNames = {"id_intervention", "periode"}),
        indexes = {
                @Index(name = "idx_bytel_periode", columnList = "periode"),
                @Index(name = "idx_bytel_eps", columnList = "id_intervention")
        })
@Data
public class BytelIntervention {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "id_intervention", nullable = false, length = 100)
    private String idIntervention;

    /** Periode au format de l'API dashboard : 2026_M09 */
    @Column(name = "periode", nullable = false, length = 20)
    private String periode;

    /** Periode telle qu'ecrite dans detail_intervention : 2026-M09 */
    @Column(name = "periode_detail", length = 20)
    private String periodeDetail;

    @Column(name = "source_id")
    private Long sourceId;

    @Column(name = "environment", length = 20)
    private String environment;

    // ---------- Metadonnees metier ----------

    @Column(name = "mainteneur", length = 100)
    private String mainteneur;

    @Column(name = "sous_traitant", length = 150)
    private String sousTraitant;

    @Column(name = "departement", length = 10)
    private String departement;

    @Column(name = "code_insee", length = 10)
    private String codeInsee;

    @Column(name = "code_cloture", length = 40)
    private String codeCloture;

    @Column(name = "identifiant_technicien", length = 60)
    private String identifiantTechnicien;

    @Column(name = "oi", length = 40)
    private String oi;

    @Column(name = "fyt", length = 60)
    private String fyt;

    @Column(name = "reference_pm", length = 80)
    private String referencePm;

    @Column(name = "date_intervention", length = 60)
    private String dateIntervention;

    // ---------- Agregats ----------

    @Column(name = "nb_qualifications")
    private Integer nbQualifications = 0;

    @Column(name = "nb_actionnables")
    private Integer nbActionnables = 0;

    @Column(name = "montant_total")
    private Double montantTotal = 0d;

    /** true si au moins deux qualifications actionnables partagent le meme typeIntervention */
    @Column(name = "ciblage_ambigu")
    private Boolean ciblageAmbigu = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "detail_json", columnDefinition = "jsonb")
    private Map<String, Object> detailJson;

    /** Empreinte du detail brut : permet de sauter une ecriture inutile. */
    @Column(name = "detail_hash", length = 40)
    private String detailHash;

    @Column(name = "synced_at")
    private LocalDateTime syncedAt;
}
