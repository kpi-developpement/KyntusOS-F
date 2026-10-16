package com.kyntus.Workflow.bytel.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Historique / versionnage, au niveau de la QUALIFICATION.
 * Rien n'est jamais ecrase : chaque evenement incremente versionNo.
 */
@Entity
@Table(
        name = "bytel_actions",
        indexes = {
                @Index(name = "idx_bact_qualif", columnList = "qualification_id"),
                @Index(name = "idx_bact_eps", columnList = "id_intervention"),
                @Index(name = "idx_bact_periode", columnList = "periode"),
                @Index(name = "idx_bact_type", columnList = "action_type"),
                @Index(name = "idx_bact_date", columnList = "action_at")
        })
@Data
public class BytelAction {

    /** Premiere version : photo de la qualification a sa decouverte. */
    public static final String TYPE_INITIAL      = "ETAT_INITIAL";
    public static final String TYPE_VALIDATION   = "VALIDATION";
    public static final String TYPE_CONTESTATION = "CONTESTATION";
    /** Changement constate cote Bytel entre deux synchronisations. */
    public static final String TYPE_SYNC         = "SYNC_ETAT";

    public static final String ENVOI_NON_ENVOYE = "NON_ENVOYE";
    public static final String ENVOI_OK         = "ENVOYE";
    public static final String ENVOI_ERREUR     = "ERREUR";
    public static final String ENVOI_SANS_OBJET = "SANS_OBJET";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "qualification_id", nullable = false, length = 80)
    private String qualificationId;

    @Column(name = "id_intervention", nullable = false, length = 100)
    private String idIntervention;

    @Column(name = "periode", nullable = false, length = 20)
    private String periode;

    @Column(name = "version_no", nullable = false)
    private Integer versionNo;

    @Column(name = "action_type", nullable = false, length = 30)
    private String actionType;

    @Column(name = "type_qualification", length = 60)
    private String typeQualification;

    @Column(name = "montant")
    private Double montant;

    // ---------- Avant / apres ----------

    @Column(name = "etat_avant", length = 60)
    private String etatAvant;

    @Column(name = "etat_apres", length = 60)
    private String etatApres;

    @Column(name = "type_intervention_avant", length = 60)
    private String typeInterventionAvant;

    @Column(name = "type_intervention_apres", length = 60)
    private String typeInterventionApres;

    @Column(name = "type_raccordement_avant", length = 60)
    private String typeRaccordementAvant;

    @Column(name = "type_raccordement_apres", length = 60)
    private String typeRaccordementApres;

    @Column(name = "montant_avant")
    private Double montantAvant;

    @Column(name = "montant_apres")
    private Double montantApres;

    @Column(name = "avis_avant", length = 40)
    private String avisAvant;

    @Column(name = "avis_apres", length = 40)
    private String avisApres;

    @Column(name = "acteur_avant", length = 100)
    private String acteurAvant;

    @Column(name = "acteur_apres", length = 100)
    private String acteurApres;

    @Column(name = "etape_avant", length = 80)
    private String etapeAvant;

    @Column(name = "etape_apres", length = 80)
    private String etapeApres;

    /** Liste lisible des champs modifies, une entree par ligne. */
    @Column(name = "changements", columnDefinition = "text")
    private String changements;

    @Column(name = "commentaire", columnDefinition = "text")
    private String commentaire;

    // ---------- Tracabilite ----------

    @Column(name = "auteur", length = 100)
    private String auteur;

    /** Horodatage local de l'enregistrement. */
    @Column(name = "action_at", nullable = false)
    private LocalDateTime actionAt;

    /** Date portee par la qualification cote Bytel (champ "date"). */
    @Column(name = "date_source", length = 60)
    private String dateSource;

    @Column(name = "ciblage_ambigu")
    private Boolean ciblageAmbigu = false;

    // ---------- Envoi ----------

    @Column(name = "statut_envoi", length = 30)
    private String statutEnvoi = ENVOI_NON_ENVOYE;

    @Column(name = "http_status")
    private Integer httpStatus;

    @Column(name = "url_appelee", columnDefinition = "text")
    private String urlAppelee;

    @Column(name = "reponse_api", columnDefinition = "text")
    private String reponseApi;

    @Column(name = "envoye_at")
    private LocalDateTime envoyeAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_envoye", columnDefinition = "jsonb")
    private Map<String, Object> payloadEnvoye;
}
