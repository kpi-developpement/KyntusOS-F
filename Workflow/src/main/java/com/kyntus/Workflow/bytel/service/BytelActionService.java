package com.kyntus.Workflow.bytel.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyntus.Workflow.bytel.model.BytelAction;
import com.kyntus.Workflow.bytel.model.BytelQualification;
import com.kyntus.Workflow.bytel.repository.BytelActionRepository;
import com.kyntus.Workflow.bytel.repository.BytelQualificationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Enregistre les decisions Kyntus sur la version COURANTE d'un EPS.
 *
 * SECURITE : l'envoi reel vers l'API partenaire est desactive par defaut
 * (bytel.envoi.enabled=false). L'action est alors enregistree avec le payload
 * et l'URL exacts, sans aucun appel sortant.
 */
@Service
public class BytelActionService {

    /** Champs calcules par Bytel : jamais renvoyes dans le corps. */
    private static final Set<String> CHAMPS_EXCLUS = Set.of(
            "etat", "identifiant", "date", "coutIntervention",
            "elementsFacturationCalcule", "etapeTraitementFacturation");

    private final BytelQualificationRepository qualifRepo;
    private final BytelActionRepository actionRepo;
    private final ObjectMapper mapper;
    private final RestClient restClient;

    @Value("${bytel.envoi.enabled:false}")
    private boolean envoiActive;

    @Value("${bytel.partner.base-url:https://partner.api.sandbox.bouyguestelecom.fr/ap2/v1}")
    private String partnerBaseUrl;

    public BytelActionService(BytelQualificationRepository qualifRepo,
                              BytelActionRepository actionRepo,
                              ObjectMapper mapper) {
        this.qualifRepo = qualifRepo;
        this.actionRepo = actionRepo;
        this.mapper = mapper;
        this.restClient = RestClient.builder().build();
    }

    @Transactional
    public Map<String, Object> enregistrerAction(String qualificationId,
                                                 String periode,
                                                 String actionType,
                                                 String commentaire,
                                                 String typeInterventionApres,
                                                 String typeRaccordementApres,
                                                 String auteur,
                                                 String bearerToken) {
        return enregistrerAction(qualificationId, periode, actionType, commentaire,
                typeInterventionApres, typeRaccordementApres, auteur, bearerToken, null, null);
    }

    /**
     * @param snapshot qualification brute fournie par l'ecran lorsqu'il travaille
     *                 en lecture directe : la ligne n'est alors pas en base, et
     *                 attendre une synchronisation complete serait absurde.
     * @param eps      identifiant EPS, necessaire avec un snapshot
     */
    @Transactional
    public Map<String, Object> enregistrerAction(String qualificationId,
                                                 String periode,
                                                 String actionType,
                                                 String commentaire,
                                                 String typeInterventionApres,
                                                 String typeRaccordementApres,
                                                 String auteur,
                                                 String bearerToken,
                                                 Map<String, Object> snapshot,
                                                 String eps) {

        Map<String, Object> res = new LinkedHashMap<>();

        BytelQualification q = qualifRepo
                .findByQualificationIdAndPeriode(qualificationId, periode)
                .orElse(null);

        // Absente de la base : on la reconstitue depuis le snapshot fourni
        if (q == null && snapshot != null && eps != null && !eps.isBlank()) {
            q = depuisSnapshot(qualificationId, periode, eps, snapshot);
        }

        if (q == null) {
            res.put("ok", false);
            res.put("erreur", "QUALIFICATION_INCONNUE");
            res.put("message", "Version " + qualificationId + " absente pour la periode " + periode
                    + ". Lancez une synchronisation.");
            return res;
        }

        if (!BytelAction.TYPE_VALIDATION.equals(actionType)
                && !BytelAction.TYPE_CONTESTATION.equals(actionType)) {
            res.put("ok", false);
            res.put("erreur", "TYPE_ACTION_INVALIDE");
            return res;
        }

        // On n'agit que sur la version courante, celle d'ordre 0
        if (q.getOrdreApi() != null && !Integer.valueOf(0).equals(q.getOrdreApi())) {
            res.put("ok", false);
            res.put("erreur", "VERSION_NON_COURANTE");
            res.put("message", "Cette version n'est plus la version courante de l'EPS "
                    + q.getIdIntervention() + ". Relancez une synchronisation.");
            return res;
        }

        if (!BytelQualification.ETAT_ACTIONNABLE.equals(q.getEtat())) {
            res.put("ok", false);
            res.put("erreur", "NO_WORKFLOW");
            res.put("message", "Action impossible : l'intervention est dans l'etat " + q.getEtat());
            res.put("etatCourant", q.getEtat());
            return res;
        }

        if (BytelAction.TYPE_CONTESTATION.equals(actionType)
                && (commentaire == null || commentaire.isBlank())) {
            res.put("ok", false);
            res.put("erreur", "COMMENTAIRE_OBLIGATOIRE");
            res.put("message", "Un commentaire est requis pour une contestation.");
            return res;
        }

        String typeFinal = (typeInterventionApres != null && !typeInterventionApres.isBlank())
                ? typeInterventionApres : q.getTypeIntervention();
        String raccFinal = (typeRaccordementApres != null && !typeRaccordementApres.isBlank())
                ? typeRaccordementApres : q.getTypeRaccordement();

        Map<String, Object> payload = construirePayload(q, typeFinal, raccFinal);

        Integer max = actionRepo.findMaxVersion(q.getQualificationId());
        BytelAction action = new BytelAction();
        action.setQualificationId(q.getQualificationId());
        action.setIdIntervention(q.getIdIntervention());
        action.setPeriode(periode);
        action.setVersionNo((max == null ? 0 : max) + 1);
        action.setActionType(actionType);
        action.setTypeQualification(q.getTypeQualification());
        action.setMontant(q.getMontant());
        action.setEtatAvant(q.getEtat());
        action.setEtatApres(BytelAction.TYPE_VALIDATION.equals(actionType)
                ? "VALIDEE" : "EN_ATTENTE_VALIDATION_BYTEL");
        action.setTypeInterventionAvant(q.getTypeIntervention());
        action.setTypeInterventionApres(typeFinal);
        action.setTypeRaccordementAvant(q.getTypeRaccordement());
        action.setTypeRaccordementApres(raccFinal);
        action.setCommentaire(commentaire);
        action.setAuteur(auteur == null || auteur.isBlank() ? "INCONNU" : auteur);
        action.setActionAt(LocalDateTime.now());
        action.setDateSource(q.getDateQualification());
        action.setPayloadEnvoye(payload);
        action.setCiblageAmbigu(false);

        String segment = BytelAction.TYPE_VALIDATION.equals(actionType) ? "validation" : "contestation";
        String url = partnerBaseUrl + "/interventions-facturables/" + q.getIdIntervention()
                + "/" + segment + "?typeIntervention=" + typeFinal;
        action.setUrlAppelee(url);

        if (!envoiActive) {
            action.setStatutEnvoi(BytelAction.ENVOI_NON_ENVOYE);
            actionRepo.save(action);
            majQualification(q, action);

            res.put("ok", true);
            res.put("envoye", false);
            res.put("message", "Action enregistree localement. Envoi vers Bytel desactive (bytel.envoi.enabled=false).");
            res.put("version", action.getVersionNo());
            res.put("urlPrevue", url);
            res.put("payloadPrevu", payload);
            return res;
        }

        try {
            RestClient.RequestBodySpec req = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON);
            if (bearerToken != null && !bearerToken.isBlank()) {
                req = req.header("Authorization",
                        bearerToken.startsWith("Bearer ") ? bearerToken : "Bearer " + bearerToken);
            }
            var reponse = req.body(mapper.writeValueAsString(payload))
                    .retrieve().toEntity(String.class);

            action.setHttpStatus(reponse.getStatusCode().value());
            action.setReponseApi(reponse.getBody());
            action.setStatutEnvoi(reponse.getStatusCode().is2xxSuccessful()
                    ? BytelAction.ENVOI_OK : BytelAction.ENVOI_ERREUR);
            action.setEnvoyeAt(LocalDateTime.now());

            res.put("ok", reponse.getStatusCode().is2xxSuccessful());
            res.put("envoye", true);
            res.put("httpStatus", reponse.getStatusCode().value());
            res.put("reponse", reponse.getBody());
        } catch (Exception e) {
            action.setStatutEnvoi(BytelAction.ENVOI_ERREUR);
            action.setReponseApi(e.getMessage());
            action.setEnvoyeAt(LocalDateTime.now());
            res.put("ok", false);
            res.put("envoye", true);
            res.put("erreur", "ECHEC_ENVOI");
            res.put("message", e.getMessage());
        }

        actionRepo.save(action);
        majQualification(q, action);
        res.put("version", action.getVersionNo());
        res.put("urlAppelee", url);
        return res;
    }

    /** Reconstitue une qualification a partir du JSON renvoye par la lecture directe. */
    private BytelQualification depuisSnapshot(String qualificationId, String periode,
                                              String eps, Map<String, Object> snap) {
        BytelQualification q = new BytelQualification();
        q.setQualificationId(qualificationId);
        q.setIdIntervention(eps);
        q.setPeriode(periode);
        q.setOrdreApi(0);
        q.setVersionCourante(0);
        q.setEtat(str(snap.get("etat")));
        q.setTypeQualification(str(snap.get("_type")));
        q.setTypeIntervention(str(snap.get("typeIntervention")));
        q.setTypeRaccordement(str(snap.get("typeRaccordement")));
        q.setTypePrestation(str(snap.get("typePrestation")));
        q.setDateQualification(str(snap.get("date")));

        Object cout = snap.get("coutIntervention");
        if (cout instanceof Map<?, ?> c && c.get("montant") instanceof Number n) {
            q.setMontant(n.doubleValue());
        }
        Object etape = snap.get("etapeTraitementFacturation");
        if (etape instanceof Map<?, ?> e) {
            q.setEtapeType(str(e.get("_type")));
            q.setEtapeAvis(str(e.get("avis")));
            q.setEtapeCommentaire(str(e.get("commentaire")));
            if (e.get("acteur") instanceof Map<?, ?> a) q.setEtapeActeur(str(a.get("login")));
        }
        q.setQualifJson(snap);
        q.setCiblageAmbigu(false);
        q.setSyncedAt(LocalDateTime.now());
        return qualifRepo.save(q);
    }

    private String str(Object o) { return o == null ? null : String.valueOf(o); }

    private void majQualification(BytelQualification q, BytelAction action) {
        q.setDerniereAction(action.getActionType());
        q.setDerniereActionAt(action.getActionAt());
        q.setDerniereActionAuteur(action.getAuteur());
        q.setVersionCourante(action.getVersionNo());
        qualifRepo.save(q);
    }

    /** Reconstruit le corps attendu par Bytel en ne changeant que le parametrage modifie. */
    private Map<String, Object> construirePayload(BytelQualification q, String typeFinal, String raccFinal) {
        Map<String, Object> payload = new LinkedHashMap<>();

        Map<String, Object> src = q.getQualifJson();
        if (src != null) {
            for (Map.Entry<String, Object> e : src.entrySet()) {
                if (!CHAMPS_EXCLUS.contains(e.getKey())) payload.put(e.getKey(), e.getValue());
            }
        }
        if (payload.isEmpty()) payload.put("_type", q.getTypeQualification());

        payload.put("typeIntervention", typeFinal);
        if (raccFinal != null && !raccFinal.isBlank()) payload.put("typeRaccordement", raccFinal);
        return payload;
    }

    /** Apercu du corps et de l'URL, sans rien enregistrer. */
    public Map<String, Object> apercu(String qualificationId, String periode,
                                      String typeInterventionApres, String typeRaccordementApres) {
        BytelQualification q = qualifRepo
                .findByQualificationIdAndPeriode(qualificationId, periode)
                .orElse(null);
        if (q == null) return Map.of("erreur", "QUALIFICATION_INCONNUE");

        String typeFinal = (typeInterventionApres != null && !typeInterventionApres.isBlank())
                ? typeInterventionApres : q.getTypeIntervention();
        String raccFinal = (typeRaccordementApres != null && !typeRaccordementApres.isBlank())
                ? typeRaccordementApres : q.getTypeRaccordement();

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("payload", construirePayload(q, typeFinal, raccFinal));
        out.put("urlContestation", partnerBaseUrl + "/interventions-facturables/"
                + q.getIdIntervention() + "/contestation?typeIntervention=" + typeFinal);
        out.put("urlValidation", partnerBaseUrl + "/interventions-facturables/"
                + q.getIdIntervention() + "/validation?typeIntervention=" + typeFinal);
        out.put("envoiActive", envoiActive);
        return out;
    }

    public List<BytelAction> timelineQualification(String qualificationId) {
        return actionRepo.findByQualificationIdOrderByVersionNoAsc(qualificationId);
    }

    public List<BytelAction> timelineEps(String eps, String periode) {
        return (periode == null || periode.isBlank())
                ? actionRepo.findByIdInterventionOrderByActionAtAsc(eps)
                : actionRepo.findByIdInterventionAndPeriodeOrderByActionAtAsc(eps, periode);
    }

    public boolean isEnvoiActive() { return envoiActive; }

    public String getPartnerBaseUrl() { return partnerBaseUrl; }
}
