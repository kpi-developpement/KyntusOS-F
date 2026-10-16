package com.kyntus.Workflow.bytel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyntus.Workflow.bytel.model.BytelIntervention;
import com.kyntus.Workflow.bytel.model.BytelQualification;
import com.kyntus.Workflow.bytel.repository.BytelInterventionRepository;
import com.kyntus.Workflow.bytel.repository.BytelQualificationRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Ecrit UNE page de resultats dans sa propre transaction, puis vide le contexte
 * de persistance.
 *
 * Sans cela, une periode entiere (jusqu'a une centaine de pages, soit plus de
 * cent mille entites avec leur JSON) reste accumulee en memoire jusqu'au commit
 * final, ce qui finit par saturer le tas du conteneur. C'est la cause des
 * erreurs 500 intermittentes selon le volume du mois.
 *
 * Classe separee volontairement : @Transactional n'agit que sur un appel
 * traversant le proxy Spring, donc pas sur un appel interne a la meme classe.
 */
@Service
public class BytelPageWriter {

    private final BytelInterventionRepository interventionRepo;
    private final BytelQualificationRepository qualifRepo;
    private final ObjectMapper mapper;

    @PersistenceContext
    private EntityManager em;

    public BytelPageWriter(BytelInterventionRepository interventionRepo,
                           BytelQualificationRepository qualifRepo,
                           ObjectMapper mapper) {
        this.interventionRepo = interventionRepo;
        this.qualifRepo = qualifRepo;
        this.mapper = mapper;
    }

    /** @return [epsLus, versionsNouvelles, versionsMisesAJour] */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int[] ecrirePage(JsonNode content, String periode, List<String> erreurs) {
        int epsLus = 0, nouvelles = 0, maj = 0;

        for (JsonNode item : content) {
            try {
                int[] r = traiterItem(item, periode);
                epsLus++;
                nouvelles += r[0];
                maj += r[1];
            } catch (Exception e) {
                if (erreurs.size() < 50) {
                    erreurs.add(item.path("idIntervention").asText("?") + " : "
                            + e.getClass().getSimpleName() + " - " + e.getMessage());
                }
            }
        }

        // Ecriture effective puis liberation : la page suivante repart a vide
        em.flush();
        em.clear();

        return new int[]{epsLus, nouvelles, maj};
    }

    private int[] traiterItem(JsonNode item, String periode) throws Exception {
        String eps = item.path("idIntervention").asText(null);
        if (eps == null || eps.isBlank()) return new int[]{0, 0};

        String periodeItem = tronquer(item.path("periode").asText(periode), 20);

        JsonNode detail = mapper.createObjectNode();
        String detailRaw = item.path("detail_intervention").asText("");
        if (detailRaw != null && !detailRaw.isBlank() && !"{}".equals(detailRaw)) {
            try { detail = mapper.readTree(detailRaw); } catch (Exception ignored) { }
        }

        BytelIntervention it = interventionRepo
                .findByIdInterventionAndPeriode(eps, periodeItem)
                .orElseGet(BytelIntervention::new);

        it.setIdIntervention(tronquer(eps, 100));
        it.setPeriode(periodeItem);
        it.setPeriodeDetail(tronquer(txt(detail, "periode"), 20));
        it.setSourceId(item.path("id").isNumber() ? item.path("id").asLong() : null);
        it.setEnvironment(tronquer(item.path("environment").asText(null), 20));
        it.setCodeCloture(tronquer(txt(detail, "codeCloture"), 40));
        it.setCodeInsee(tronquer(txt(detail, "codeInsee"), 10));
        it.setDepartement(tronquer(txt(detail, "departement"), 10));
        it.setDateIntervention(tronquer(txt(detail, "dateIntervention"), 60));
        it.setIdentifiantTechnicien(tronquer(txt(detail, "identifiantTechnicien"), 60));
        it.setSousTraitant(tronquer(txt(detail, "sousTraitant"), 150));
        it.setOi(tronquer(txt(detail, "oi"), 40));
        it.setFyt(tronquer(txt(detail, "fyt"), 60));
        it.setReferencePm(tronquer(txt(detail, "referencePm"), 80));
        it.setMainteneur(tronquer(detail.path("mainteneur").path("identifiant").asText(null), 100));

        @SuppressWarnings("unchecked")
        Map<String, Object> detailMap = mapper.convertValue(detail, Map.class);
        it.setDetailJson(detailMap);
        it.setSyncedAt(LocalDateTime.now());

        JsonNode qualifs = detail.path("qualificationInterventions");
        int nouvelles = 0, maj = 0;
        int nbVersions = qualifs.isArray() ? qualifs.size() : 0;
        double montantCourant = 0d;

        if (qualifs.isArray()) {
            int ordre = 0;
            for (JsonNode q : qualifs) {
                String uuid = txt(q, "identifiant");
                if (uuid == null || uuid.isBlank()) { ordre++; continue; }
                uuid = tronquer(uuid, 80);

                BytelQualification bq = qualifRepo
                        .findByQualificationIdAndPeriode(uuid, periodeItem)
                        .orElse(null);

                boolean creation = (bq == null);
                if (creation) {
                    bq = new BytelQualification();
                    bq.setQualificationId(uuid);
                    bq.setVersionCourante(0);
                }

                bq.setIdIntervention(tronquer(eps, 100));
                bq.setPeriode(periodeItem);
                bq.setOrdreApi(ordre);
                bq.setEtat(tronquer(txt(q, "etat"), 60));
                bq.setTypeQualification(tronquer(txt(q, "_type"), 60));
                bq.setTypeIntervention(tronquer(txt(q, "typeIntervention"), 60));
                bq.setTypeRaccordement(tronquer(txt(q, "typeRaccordement"), 60));
                bq.setTypePrestation(tronquer(txt(q, "typePrestation"), 60));
                bq.setDateQualification(tronquer(txt(q, "date"), 60));
                bq.setMontant(q.path("coutIntervention").path("montant").isNumber()
                        ? q.path("coutIntervention").path("montant").asDouble() : null);

                JsonNode etape = q.path("etapeTraitementFacturation");
                bq.setEtapeType(tronquer(txt(etape, "_type"), 80));
                bq.setEtapeAvis(tronquer(txt(etape, "avis"), 40));
                bq.setEtapeCommentaire(txt(etape, "commentaire"));
                bq.setEtapeActeur(tronquer(etape.path("acteur").path("login").asText(null), 100));
                bq.setCiblageAmbigu(false);

                @SuppressWarnings("unchecked")
                Map<String, Object> qMap = mapper.convertValue(q, Map.class);
                bq.setQualifJson(qMap);
                bq.setSyncedAt(LocalDateTime.now());

                qualifRepo.save(bq);

                if (ordre == 0 && bq.getMontant() != null) montantCourant = bq.getMontant();
                if (creation) nouvelles++; else maj++;
                ordre++;
            }
        }

        it.setNbQualifications(nbVersions);
        it.setNbActionnables(nbVersions > 0 ? 1 : 0);
        it.setMontantTotal(montantCourant);
        it.setCiblageAmbigu(false);
        interventionRepo.save(it);

        return new int[]{nouvelles, maj};
    }

    private String txt(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asText();
    }

    /** Evite qu'une valeur plus longue que la colonne fasse echouer tout l'enregistrement. */
    private String tronquer(String v, int max) {
        if (v == null) return null;
        return v.length() <= max ? v : v.substring(0, max);
    }
}
