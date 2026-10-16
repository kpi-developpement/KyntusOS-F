package com.kyntus.Workflow.bytel.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Memorise EN BASE l'etat de synchronisation de chaque periode.
 *
 * Sans cela, le marqueur vivait dans la page du navigateur : chaque
 * rechargement relancait une synchronisation complete de plusieurs minutes.
 * Desormais le serveur sait ce qui a deja ete synchronise et quand.
 */
@Entity
@Table(name = "bytel_sync_etat")
@Data
public class BytelSyncEtat {

    @Id
    @Column(name = "periode", length = 20)
    private String periode;

    /** JAMAIS | EN_COURS | TERMINE | ERREUR */
    @Column(name = "statut", length = 20)
    private String statut;

    @Column(name = "derniere_sync")
    private LocalDateTime derniereSync;

    @Column(name = "duree_secondes")
    private Long dureeSecondes;

    @Column(name = "total_eps")
    private Long totalEps;

    @Column(name = "total_versions")
    private Long totalVersions;

    @Column(name = "pages_lues")
    private Integer pagesLues;

    @Column(name = "pages_total")
    private Integer pagesTotal;

    @Column(name = "message", columnDefinition = "text")
    private String message;
}
