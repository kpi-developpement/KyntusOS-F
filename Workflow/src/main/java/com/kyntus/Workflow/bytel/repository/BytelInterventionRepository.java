package com.kyntus.Workflow.bytel.repository;

import com.kyntus.Workflow.bytel.model.BytelIntervention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BytelInterventionRepository extends JpaRepository<BytelIntervention, Long> {

    Optional<BytelIntervention> findByIdInterventionAndPeriode(String idIntervention, String periode);

    /** Chargement par lot : une seule requete pour toute une page. */
    List<BytelIntervention> findByPeriodeAndIdInterventionIn(String periode, Collection<String> ids);

    @Query("SELECT DISTINCT b.periode FROM BytelIntervention b ORDER BY b.periode DESC")
    List<String> findDistinctPeriodes();

    long countByPeriode(String periode);

    /** Nombre d'EPS pour un motif de periode : "2026_M%", "%", etc. */
    @Query("SELECT COUNT(b) FROM BytelIntervention b WHERE b.periode LIKE :periode")
    long compterMotif(@org.springframework.data.repository.query.Param("periode") String periode);

    long countByPeriodeAndCiblageAmbigu(String periode, Boolean ciblageAmbigu);
}
