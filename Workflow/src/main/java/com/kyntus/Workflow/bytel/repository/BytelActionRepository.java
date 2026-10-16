package com.kyntus.Workflow.bytel.repository;

import com.kyntus.Workflow.bytel.model.BytelAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface BytelActionRepository extends JpaRepository<BytelAction, Long> {

    /** Timeline d'une qualification precise. */
    List<BytelAction> findByQualificationIdOrderByVersionNoAsc(String qualificationId);

    /** Timeline de tout l'EPS, toutes qualifications confondues. */
    List<BytelAction> findByIdInterventionAndPeriodeOrderByActionAtAsc(String eps, String periode);

    List<BytelAction> findByIdInterventionOrderByActionAtAsc(String eps);

    @Query("SELECT COALESCE(MAX(a.versionNo), 0) FROM BytelAction a WHERE a.qualificationId = :qualifId")
    Integer findMaxVersion(@Param("qualifId") String qualifId);

    /**
     * Historique global.
     * Les bornes de date sont toujours fournies par le controleur,
     * ce qui evite tout parametre nul dans la requete.
     */
    @Query("SELECT a FROM BytelAction a WHERE " +
            "(:periode IS NULL OR :periode = '' OR a.periode LIKE :periode) " +
            "AND (:actionType IS NULL OR :actionType = '' OR a.actionType = :actionType) " +
            "AND (:auteur IS NULL OR :auteur = '' OR LOWER(a.auteur) LIKE LOWER(CONCAT('%', :auteur, '%'))) " +
            "AND (:eps IS NULL OR :eps = '' OR LOWER(a.idIntervention) LIKE LOWER(CONCAT('%', :eps, '%'))) " +
            "AND a.actionAt >= :dateDebut AND a.actionAt <= :dateFin " +
            "ORDER BY a.actionAt DESC")
    Page<BytelAction> findHistorique(@Param("periode") String periode,
                                     @Param("actionType") String actionType,
                                     @Param("auteur") String auteur,
                                     @Param("eps") String eps,
                                     @Param("dateDebut") LocalDateTime dateDebut,
                                     @Param("dateFin") LocalDateTime dateFin,
                                     Pageable pageable);

    @Query("SELECT a.actionType, COUNT(a) FROM BytelAction a " +
            "WHERE (:periode IS NULL OR :periode = '' OR a.periode LIKE :periode) GROUP BY a.actionType")
    List<Object[]> countByActionType(@Param("periode") String periode);

    /** Decisions prises dans l'application pour une liste d'EPS, par ordre chronologique. */
    @Query("SELECT a FROM BytelAction a " +
            "WHERE a.periode LIKE :periode AND a.idIntervention IN :epsList " +
            "AND a.actionType IN ('VALIDATION', 'CONTESTATION') " +
            "ORDER BY a.idIntervention ASC, a.actionAt ASC")
    List<BytelAction> decisionsPourEps(@Param("periode") String periode,
                                       @Param("epsList") Collection<String> epsList);

    List<BytelAction> findByStatutEnvoiOrderByActionAtAsc(String statutEnvoi);
}
