package com.kyntus.Workflow.bytel.repository;

import com.kyntus.Workflow.bytel.model.BytelQualification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Chaque ligne est une VERSION d'un EPS, telle que fournie par l'API
 * dans qualificationInterventions. ordreApi = 0 est la version courante.
 *
 * La periode est toujours comparee avec LIKE :
 *   "2026_M07"  une periode precise
 *   "2026_M%"   tous les mois de 2026
 *   "%_M07"     le mois 07 de toutes les annees
 *   "%"         toutes les periodes
 */
public interface BytelQualificationRepository extends JpaRepository<BytelQualification, Long> {

    /**
     * Filtre unique, partage par la liste, les versions, le comptage et
     * l'export : l'ecran et le fichier exporte ne peuvent pas diverger.
     * Les chaines vides signifient "pas de filtre". Les parametres ne sont
     * jamais nuls, ce qui evite les erreurs de typage de PostgreSQL.
     */
    String FILTRE =
            "q.periode LIKE :periode " +
            "AND (:courantesOnly = false OR q.ordreApi = 0) " +
            "AND (:etat = '' OR q.etat = :etat) " +
            "AND (:type = '' OR q.typeIntervention = :type) " +
            "AND (:qualif = '' OR q.typeQualification = :qualif) " +
            "AND (:eps = '' OR LOWER(q.idIntervention) LIKE LOWER(CONCAT('%', :eps, '%'))) " +
            "AND (:sansListe = true OR q.idIntervention IN :epsList) " +
            "AND (:traiteeOnly = false OR COALESCE(q.versionCourante, 0) > 0) " +
            "AND (:nonTraiteeOnly = false OR COALESCE(q.versionCourante, 0) = 0) " +
            "AND (:dateDebut = '' OR q.dateQualification >= :dateDebut) " +
            "AND (:dateFin = '' OR q.dateQualification <= :dateFin) ";

    /**
     * Selection d'EPS pour la vue "historique par EPS".
     *
     * Chaque EPS est represente par UNE ligne d'ancrage, ce qui rend le
     * comptage et la pagination exacts. Le filtre d'etat s'applique selon
     * le mode :
     *   COURANTE  l'etat de la version courante (ordre 0)
     *   PREMIERE  l'etat de la toute premiere version de l'EPS
     *   TOUTE     l'EPS est passe par cet etat a un moment quelconque
     */
    String FILTRE_ANCRE =
            "q.periode LIKE :periode " +
            "AND (:qualif = '' OR q.typeQualification = :qualif) " +
            "AND (:eps = '' OR LOWER(q.idIntervention) LIKE LOWER(CONCAT('%', :eps, '%'))) " +
            "AND (:sansListe = true OR q.idIntervention IN :epsList) " +
            "AND (:dateDebut = '' OR q.dateQualification >= :dateDebut) " +
            "AND (:dateFin = '' OR q.dateQualification <= :dateFin) " +
            "AND ( " +
            "  (:mode = 'COURANTE' AND q.ordreApi = 0 AND (:etat = '' OR q.etat = :etat)) " +
            "  OR (:mode = 'PREMIERE' AND q.ordreApi = (SELECT MAX(p.ordreApi) FROM BytelQualification p " +
            "        WHERE p.idIntervention = q.idIntervention AND p.periode = q.periode) " +
            "      AND (:etat = '' OR q.etat = :etat)) " +
            "  OR (:mode = 'TOUTE' AND q.ordreApi = 0 AND (:etat = '' OR EXISTS (SELECT t.id FROM BytelQualification t " +
            "        WHERE t.idIntervention = q.idIntervention AND t.periode = q.periode AND t.etat = :etat))) " +
            ") ";

    @Query(value = "SELECT q FROM BytelQualification q WHERE " + FILTRE_ANCRE,
           countQuery = "SELECT COUNT(q) FROM BytelQualification q WHERE " + FILTRE_ANCRE)
    Page<BytelQualification> ancres(@Param("periode") String periode,
                                    @Param("qualif") String qualif,
                                    @Param("eps") String eps,
                                    @Param("sansListe") boolean sansListe,
                                    @Param("epsList") Collection<String> epsList,
                                    @Param("dateDebut") String dateDebut,
                                    @Param("dateFin") String dateFin,
                                    @Param("mode") String mode,
                                    @Param("etat") String etat,
                                    Pageable pageable);

    /** Meme selection, lue par curseur pour l'export. */
    @Query("SELECT q FROM BytelQualification q WHERE " + FILTRE_ANCRE + " AND q.id > :apresId ORDER BY q.id ASC")
    List<BytelQualification> lotAncres(@Param("periode") String periode,
                                       @Param("qualif") String qualif,
                                       @Param("eps") String eps,
                                       @Param("sansListe") boolean sansListe,
                                       @Param("epsList") Collection<String> epsList,
                                       @Param("dateDebut") String dateDebut,
                                       @Param("dateFin") String dateFin,
                                       @Param("mode") String mode,
                                       @Param("etat") String etat,
                                       @Param("apresId") Long apresId,
                                       Pageable limite);

    // ===================== Acces unitaires (sync, actions) =====================

    Optional<BytelQualification> findByQualificationIdAndPeriode(String qualificationId, String periode);

    /** Chargement par lot : une seule requete pour toute une page. */
    List<BytelQualification> findByPeriodeAndQualificationIdIn(String periode, Collection<String> ids);

    /** Toutes les versions d'un EPS : ordre 0 = la plus recente. */
    List<BytelQualification> findByIdInterventionAndPeriodeOrderByOrdreApiAsc(String eps, String periode);

    Optional<BytelQualification> findFirstByIdInterventionAndPeriodeAndOrdreApi(String eps, String periode, Integer ordreApi);

    long countByPeriode(String periode);

    long countByIdInterventionAndPeriode(String eps, String periode);

    // ===================== Recherche filtree =====================

    @Query(value = "SELECT q FROM BytelQualification q WHERE " + FILTRE,
           countQuery = "SELECT COUNT(q) FROM BytelQualification q WHERE " + FILTRE)
    Page<BytelQualification> rechercher(@Param("periode") String periode,
                                        @Param("courantesOnly") boolean courantesOnly,
                                        @Param("etat") String etat,
                                        @Param("type") String type,
                                        @Param("qualif") String qualif,
                                        @Param("eps") String eps,
                                        @Param("sansListe") boolean sansListe,
                                        @Param("epsList") Collection<String> epsList,
                                        @Param("traiteeOnly") boolean traiteeOnly,
                                        @Param("nonTraiteeOnly") boolean nonTraiteeOnly,
                                        @Param("dateDebut") String dateDebut,
                                        @Param("dateFin") String dateFin,
                                        Pageable pageable);

    @Query("SELECT COUNT(q) FROM BytelQualification q WHERE " + FILTRE)
    long compter(@Param("periode") String periode,
                 @Param("courantesOnly") boolean courantesOnly,
                 @Param("etat") String etat,
                 @Param("type") String type,
                 @Param("qualif") String qualif,
                 @Param("eps") String eps,
                 @Param("sansListe") boolean sansListe,
                 @Param("epsList") Collection<String> epsList,
                 @Param("traiteeOnly") boolean traiteeOnly,
                 @Param("nonTraiteeOnly") boolean nonTraiteeOnly,
                 @Param("dateDebut") String dateDebut,
                 @Param("dateFin") String dateFin);

    /**
     * Lecture par lot pour l'export, par curseur sur l'id plutot que par
     * OFFSET : le cout reste constant meme au bout de centaines de milliers
     * de lignes.
     */
    @Query("SELECT q FROM BytelQualification q WHERE " + FILTRE + " AND q.id > :apresId ORDER BY q.id ASC")
    List<BytelQualification> lotExport(@Param("periode") String periode,
                                       @Param("courantesOnly") boolean courantesOnly,
                                       @Param("etat") String etat,
                                       @Param("type") String type,
                                       @Param("qualif") String qualif,
                                       @Param("eps") String eps,
                                       @Param("sansListe") boolean sansListe,
                                       @Param("epsList") Collection<String> epsList,
                                       @Param("traiteeOnly") boolean traiteeOnly,
                                       @Param("nonTraiteeOnly") boolean nonTraiteeOnly,
                                       @Param("dateDebut") String dateDebut,
                                       @Param("dateFin") String dateFin,
                                       @Param("apresId") Long apresId,
                                       Pageable limite);

    /**
     * Toutes les versions d'une liste d'EPS, de la plus ANCIENNE a la plus
     * recente : c'est l'ordre de lecture d'une chronologie d'equipe.
     */
    @Query("SELECT q FROM BytelQualification q " +
            "WHERE q.periode LIKE :periode AND q.idIntervention IN :epsList " +
            "ORDER BY q.idIntervention ASC, q.periode ASC, q.ordreApi DESC")
    List<BytelQualification> versionsPourEps(@Param("periode") String periode,
                                             @Param("epsList") Collection<String> epsList);

    /** EPS d'une liste effectivement presents, pour signaler les introuvables. */
    @Query("SELECT DISTINCT q.idIntervention FROM BytelQualification q " +
            "WHERE q.periode LIKE :periode AND q.idIntervention IN :epsList")
    List<String> epsPresents(@Param("periode") String periode,
                             @Param("epsList") Collection<String> epsList);

    // ===================== Listes deroulantes et statistiques =====================

    @Query("SELECT DISTINCT q.etat FROM BytelQualification q " +
            "WHERE q.periode LIKE :periode AND q.etat IS NOT NULL ORDER BY q.etat")
    List<String> findDistinctEtats(@Param("periode") String periode);

    @Query("SELECT DISTINCT q.typeIntervention FROM BytelQualification q " +
            "WHERE q.periode LIKE :periode AND q.typeIntervention IS NOT NULL ORDER BY q.typeIntervention")
    List<String> findDistinctTypes(@Param("periode") String periode);

    @Query("SELECT DISTINCT q.typeQualification FROM BytelQualification q " +
            "WHERE q.periode LIKE :periode AND q.typeQualification IS NOT NULL ORDER BY q.typeQualification")
    List<String> findDistinctTypesQualification(@Param("periode") String periode);

    /** Statistiques sur les versions COURANTES uniquement. */
    @Query("SELECT q.etat, COUNT(q), COALESCE(SUM(q.montant), 0) FROM BytelQualification q " +
            "WHERE q.periode LIKE :periode AND q.ordreApi = 0 GROUP BY q.etat")
    List<Object[]> statsParEtat(@Param("periode") String periode);

    @Query("SELECT COUNT(q) FROM BytelQualification q WHERE q.periode LIKE :periode")
    long compterVersions(@Param("periode") String periode);

    @Query("SELECT COUNT(q) FROM BytelQualification q WHERE q.periode LIKE :periode AND q.ordreApi = 0")
    long compterCourantes(@Param("periode") String periode);

    @Query("SELECT COUNT(q) FROM BytelQualification q " +
            "WHERE q.periode LIKE :periode AND q.ordreApi = 0 AND q.etat = :etat")
    long countCourantesParEtat(@Param("periode") String periode, @Param("etat") String etat);

    @Query("SELECT COUNT(q) FROM BytelQualification q " +
            "WHERE q.periode LIKE :periode AND q.ordreApi = 0 AND COALESCE(q.versionCourante, 0) > 0")
    long countTraitees(@Param("periode") String periode);
}
