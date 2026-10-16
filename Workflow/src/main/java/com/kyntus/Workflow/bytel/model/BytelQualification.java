package com.kyntus.Workflow.bytel.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Une qualification = une ligne actionnable.
 * Un EPS en porte souvent plusieurs, toutes en EN_ATTENTE_VALIDATION_PARTENAIRE,
 * parfois avec des montants et des types differents.
 */
@Entity
@Table(
        name = "bytel_qualifications",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_bqual_uuid_periode",
                columnNames = {"qualification_id", "periode"}),
        indexes = {
                @Index(name = "idx_bqual_periode", columnList = "periode"),
                @Index(name = "idx_bqual_etat", columnList = "etat"),
                @Index(name = "idx_bqual_eps", columnList = "id_intervention"),
                @Index(name = "idx_bqual_type", columnList = "type_intervention")
        })
@Data
public class BytelQualification {

    public static final String ETAT_ACTIONNABLE = "EN_ATTENTE_VALIDATION_PARTENAIRE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** UUID de la qualification, fourni par Bytel */
    @Column(name = "qualification_id", nullable = false, length = 80)
    private String qualificationId;

    @Column(name = "id_intervention", nullable = false, length = 100)
    private String idIntervention;

    @Column(name = "periode", nullable = false, length = 20)
    private String periode;

    /** Position dans le tableau renvoye par l'API : 0 = la plus recente */
    @Column(name = "ordre_api")
    private Integer ordreApi;

    // ---------- Qualification ----------

    @Column(name = "etat", length = 60)
    private String etat;

    /** QualificationRaccordement | QualificationSAV | QualificationReseau */
    @Column(name = "type_qualification", length = 60)
    private String typeQualification;

    /** Valeur du query param lors d'une action */
    @Column(name = "type_intervention", length = 60)
    private String typeIntervention;

    @Column(name = "type_raccordement", length = 60)
    private String typeRaccordement;

    @Column(name = "type_prestation", length = 60)
    private String typePrestation;

    @Column(name = "montant")
    private Double montant;

    @Column(name = "date_qualification", length = 60)
    private String dateQualification;

    // ---------- Etape de traitement ----------

    @Column(name = "etape_type", length = 80)
    private String etapeType;

    @Column(name = "etape_avis", length = 40)
    private String etapeAvis;

    @Column(name = "etape_acteur", length = 100)
    private String etapeActeur;

    @Column(name = "etape_commentaire", columnDefinition = "text")
    private String etapeCommentaire;

    // ---------- Ciblage ----------

    /**
     * true si une autre qualification actionnable du meme EPS porte le meme
     * typeIntervention : le query param ne suffit alors pas a les distinguer.
     */
    @Column(name = "ciblage_ambigu")
    private Boolean ciblageAmbigu = false;

    /** Qualification complete, sert a reconstruire le corps envoye a Bytel */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "qualif_json", columnDefinition = "jsonb")
    private Map<String, Object> qualifJson;

    // ---------- Suivi local ----------

    /** Empreinte de la qualification brute : permet de sauter une ecriture inutile. */
    @Column(name = "qualif_hash", length = 40)
    private String qualifHash;

    @Column(name = "synced_at")
    private LocalDateTime syncedAt;

    @Column(name = "derniere_action", length = 30)
    private String derniereAction;

    @Column(name = "derniere_action_at")
    private LocalDateTime derniereActionAt;

    @Column(name = "derniere_action_auteur", length = 100)
    private String derniereActionAuteur;

    @Column(name = "version_courante")
    private Integer versionCourante = 0;
}
