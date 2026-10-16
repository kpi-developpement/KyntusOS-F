package com.kyntus.Workflow.bytel.controller;

import com.kyntus.Workflow.bytel.model.BytelAction;
import com.kyntus.Workflow.bytel.model.BytelQualification;
import com.kyntus.Workflow.bytel.repository.BytelActionRepository;
import com.kyntus.Workflow.bytel.repository.BytelInterventionRepository;
import com.kyntus.Workflow.bytel.repository.BytelQualificationRepository;
import com.kyntus.Workflow.bytel.service.BytelActionService;
import com.kyntus.Workflow.bytel.service.BytelExportService;
import com.kyntus.Workflow.bytel.service.BytelRechercheService;
import com.kyntus.Workflow.bytel.service.BytelLiveService;
import com.kyntus.Workflow.bytel.service.BytelSyncService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/bytel")
public class BytelApiController {

    private static final LocalDateTime DATE_MIN = LocalDateTime.of(2000, 1, 1, 0, 0);
    private static final LocalDateTime DATE_MAX = LocalDateTime.of(2999, 12, 31, 23, 59, 59);

    private final BytelSyncService syncService;
    private final BytelLiveService liveService;
    private final BytelActionService actionService;
    private final BytelInterventionRepository interventionRepo;
    private final BytelQualificationRepository qualifRepo;
    private final BytelActionRepository actionRepo;
    private final BytelRechercheService recherche;
    private final BytelExportService exportService;

    public BytelApiController(BytelSyncService syncService,
                              BytelLiveService liveService,
                              BytelActionService actionService,
                              BytelInterventionRepository interventionRepo,
                              BytelQualificationRepository qualifRepo,
                              BytelActionRepository actionRepo,
                              BytelRechercheService recherche,
                              BytelExportService exportService) {
        this.syncService = syncService;
        this.liveService = liveService;
        this.actionService = actionService;
        this.interventionRepo = interventionRepo;
        this.qualifRepo = qualifRepo;
        this.actionRepo = actionRepo;
        this.recherche = recherche;
        this.exportService = exportService;
    }

    /** Le mois choisi dans l'ecran devient le parametre period de l'URL d'appel. */
    public static String periodeDe(int annee, int mois) {
        return annee + "_M" + String.format("%02d", mois);
    }

    private String resoudrePeriode(String period, Integer year, Integer month) {
        if (period != null && !period.isBlank()) return period;
        return periodeDe(year != null ? year : LocalDate.now().getYear(),
                         month != null ? month : LocalDate.now().getMonthValue());
    }

    // ===================== SYNCHRONISATION =====================

    /**
     * Demarre la synchronisation en arriere-plan et rend la main immediatement.
     * Une periode complete prend plusieurs minutes : garder la requete ouverte
     * faisait couper le proxy. L'avancement se lit sur /sync/status.
     */
    @PostMapping("/sync")
    public ResponseEntity<?> synchroniser(@RequestParam(required = false) String period,
                                          @RequestParam(required = false) Integer year,
                                          @RequestParam(required = false) Integer month,
                                          @RequestParam(defaultValue = "false") boolean forcer) {
        String p = resoudrePeriode(period, year, month);
        try {
            return ResponseEntity.accepted().body(syncService.demarrer(p, forcer));
        } catch (Throwable t) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("periode", p);
            err.put("erreur", t.getClass().getSimpleName() + " : " + String.valueOf(t.getMessage()));
            return ResponseEntity.internalServerError().body(err);
        }
    }

    /** Avancement de la synchronisation d'une periode. */
    @GetMapping("/sync/status")
    public ResponseEntity<Map<String, Object>> syncStatus(@RequestParam("period") String period) {
        try {
            return ResponseEntity.ok(syncService.statut(period));
        } catch (Throwable t) {
            return ResponseEntity.ok(Map.of("periode", period, "statut", "AUCUNE", "pourcentage", 0));
        }
    }

    @PostMapping("/sync/annuler")
    public ResponseEntity<Map<String, Object>> syncAnnuler(@RequestParam("period") String period) {
        return ResponseEntity.ok(syncService.annuler(period));
    }

    /** Periodes deja synchronisees, avec leur fraicheur. */
    @GetMapping("/sync/etats")
    public ResponseEntity<List<Map<String, Object>>> syncEtats() {
        return ResponseEntity.ok(syncService.etatsConnus());
    }

    // ===================== LECTURE DIRECTE (instantanee) =====================

    /**
     * Lit une page directement depuis l'API, sans passer par la base.
     * Aussi rapide que d'ouvrir l'URL dans un navigateur.
     * Chaque ligne porte la version courante ET toutes ses versions, donc la
     * chronologie s'affiche sans appel supplementaire.
     */
    @GetMapping("/live")
    public ResponseEntity<Map<String, Object>> live(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        String p = resoudrePeriode(period, year, month);
        try {
            return ResponseEntity.ok(liveService.page(p, page, size));
        } catch (Throwable t) {
            // Jamais de 500 ici : l'ecran doit pouvoir reessayer proprement.
            Map<String, Object> vide = new LinkedHashMap<>();
            vide.put("periode", p);
            vide.put("mode", "DIRECT");
            vide.put("content", List.of());
            vide.put("currentPage", page);
            vide.put("totalItems", 0);
            vide.put("totalPages", 0);
            vide.put("erreur", t.getClass().getSimpleName() + " : " + t.getMessage());
            vide.put("reessayable", true);
            return ResponseEntity.ok(vide);
        }
    }

    // ===================== LISTE ET VERSIONS : RECHERCHE UNIFIEE =====================
    //
    // year et month acceptent un nombre ou "TOUS". Le champ eps accepte un
    // identifiant (recherche partielle) ou plusieurs (recherche exacte).
    // Les variantes POST acceptent une liste de milliers d'EPS, sans la
    // limite de longueur d'une URL.

    @GetMapping("/qualifications")
    public ResponseEntity<Map<String, Object>> lister(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String etat,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String qualif,
            @RequestParam(required = false) String eps,
            @RequestParam(defaultValue = "false") boolean traiteeOnly,
            @RequestParam(defaultValue = "false") boolean nonTraiteeOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        String traitement = traiteeOnly ? "TRAITEE" : (nonTraiteeOnly ? "NON_TRAITEE" : "");
        return ResponseEntity.ok(listerInterne(new BytelRechercheService.Filtres(
                period, year, month, etat, type, qualif, eps, null, traitement, null, null, page, size, null), true));
    }

    @PostMapping("/qualifications/recherche")
    public ResponseEntity<Map<String, Object>> listerPost(@RequestBody BytelRechercheService.Filtres f) {
        return ResponseEntity.ok(listerInterne(f, true));
    }

    @GetMapping("/versions")
    public ResponseEntity<Map<String, Object>> versions(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String etat,
            @RequestParam(required = false) String qualif,
            @RequestParam(required = false) String eps,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(listerInterne(new BytelRechercheService.Filtres(
                period, year, month, etat, null, qualif, eps, null, null, dateDebut, dateFin, page, size, null), false));
    }

    @PostMapping("/versions/recherche")
    public ResponseEntity<Map<String, Object>> versionsPost(@RequestBody BytelRechercheService.Filtres f) {
        return ResponseEntity.ok(listerInterne(f, false));
    }

    /**
     * Historique groupe par EPS.
     *
     * Les EPS sont selectionnes selon l'etat, applique a la version courante
     * (par defaut), a la premiere version, ou a n'importe quelle version.
     * Pour chacun, TOUTES ses versions sont renvoyees, de la plus ancienne a la
     * plus recente, quel que soit leur etat : c'est la chronologie complete.
     */
    @PostMapping("/versions/par-eps")
    public ResponseEntity<Map<String, Object>> versionsParEps(@RequestBody BytelRechercheService.Filtres f) {
        int page = f.page() == null ? 0 : Math.max(0, f.page());
        int size = f.size() == null ? 20 : Math.min(Math.max(1, f.size()), 200);
        Map<String, Object> body = new LinkedHashMap<>();
        try {
            BytelRechercheService.Criteres c = recherche.construire(f, false);
            Page<BytelQualification> ancres = recherche.ancres(c, PageRequest.of(page, size,
                    Sort.by("idIntervention").ascending().and(Sort.by("periode").ascending())));

            Map<String, List<BytelQualification>> groupes = recherche.versionsDesAncres(ancres.getContent());

            List<Map<String, Object>> contenu = new ArrayList<>();
            for (BytelQualification a : ancres.getContent()) {
                List<BytelQualification> versions = groupes.getOrDefault(
                        a.getIdIntervention() + "|" + a.getPeriode(), List.of());
                BytelQualification courante = versions.isEmpty() ? a : versions.get(versions.size() - 1);

                Map<String, Object> g = new LinkedHashMap<>();
                g.put("idIntervention", a.getIdIntervention());
                g.put("periode", a.getPeriode());
                g.put("nbVersions", versions.size());
                g.put("etatCourant", courante.getEtat());
                g.put("premiereDate", versions.isEmpty() ? null : versions.get(0).getDateQualification());
                g.put("derniereDate", courante.getDateQualification());
                g.put("versions", versions);
                contenu.add(g);
            }

            body.put("content", contenu);
            body.put("currentPage", ancres.getNumber());
            body.put("totalItems", ancres.getTotalElements());
            body.put("totalPages", ancres.getTotalPages());
            body.put("modeEtat", c.modeEtat());
            if (!c.sansListe()) {
                body.put("epsDemandes", c.epsList().size());
                body.put("epsIntrouvables", recherche.introuvables(c));
            }
        } catch (Exception e) {
            body.put("content", List.of());
            body.put("currentPage", 0);
            body.put("totalItems", 0);
            body.put("totalPages", 0);
            body.put("note", "lecture impossible : " + e.getMessage());
        }
        return ResponseEntity.ok(body);
    }

    /**
     * @param courantes true = une ligne par EPS (version courante),
     *                  false = toutes les versions, de la plus recente a la plus ancienne
     */
    private Map<String, Object> listerInterne(BytelRechercheService.Filtres f, boolean courantes) {
        int page = f.page() == null ? 0 : Math.max(0, f.page());
        int size = f.size() == null ? 50 : Math.min(Math.max(1, f.size()), 500);
        try {
            BytelRechercheService.Criteres c = recherche.construire(f, courantes);
            Sort tri = courantes
                    ? Sort.by("idIntervention").ascending().and(Sort.by("periode").ascending())
                    : Sort.by("dateQualification").descending().and(Sort.by("idIntervention").ascending());

            Page<BytelQualification> res = recherche.rechercher(c, PageRequest.of(page, size, tri));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("content", res.getContent());

            if (courantes) {
                // Cle "EPS|periode" : en mode toutes periodes, un EPS peut apparaitre plusieurs fois
                Map<String, Long> nbVersions = new HashMap<>();
                for (BytelQualification q : res.getContent()) {
                    String eps = q.getIdIntervention();
                    String per = q.getPeriode();
                    nbVersions.computeIfAbsent(eps + "|" + per,
                            k -> qualifRepo.countByIdInterventionAndPeriode(eps, per));
                }
                body.put("nbVersionsParEps", nbVersions);
            }

            body.put("currentPage", res.getNumber());
            body.put("totalItems", res.getTotalElements());
            body.put("totalPages", res.getTotalPages());
            body.put("periodeMotif", c.periode());
            body.put("periodeUnique", c.periodeUnique());

            if (!c.sansListe()) {
                body.put("epsDemandes", c.epsList().size());
                body.put("epsIntrouvables", recherche.introuvables(c));
                body.put("epsLimite", BytelRechercheService.MAX_EPS_LISTE);
            }
            return body;
        } catch (Exception e) {
            Map<String, Object> vide = new LinkedHashMap<>();
            vide.put("content", List.of());
            vide.put("nbVersionsParEps", Map.of());
            vide.put("currentPage", 0);
            vide.put("totalItems", 0);
            vide.put("totalPages", 0);
            vide.put("note", "lecture impossible : " + e.getMessage());
            return vide;
        }
    }

    // ===================== EXPORT EXCEL =====================

    /** Demande d'export : onglet + memes filtres que l'ecran. */
    public record ExportRequest(String onglet, BytelRechercheService.Filtres filtres) {}

    /** Lance la generation en arriere-plan et rend la main immediatement. */
    @PostMapping("/export")
    public ResponseEntity<Map<String, Object>> exporter(@RequestBody ExportRequest req) {
        try {
            boolean parEps = BytelExportService.ONGLET_VERSIONS_EPS.equals(req.onglet());
            boolean versions = parEps || BytelExportService.ONGLET_VERSIONS.equals(req.onglet());
            BytelRechercheService.Filtres f = req.filtres() != null ? req.filtres()
                    : new BytelRechercheService.Filtres(null, null, null, null, null, null, null,
                            null, null, null, null, 0, 50, null);
            BytelRechercheService.Criteres c = recherche.construire(f, !versions);
            String onglet = parEps ? BytelExportService.ONGLET_VERSIONS_EPS
                    : (versions ? BytelExportService.ONGLET_VERSIONS : BytelExportService.ONGLET_INTERVENTIONS);
            return ResponseEntity.accepted().body(exportService.demarrer(onglet, c));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("statut", "ERREUR", "erreur", String.valueOf(e.getMessage())));
        }
    }

    /**
     * Export equipe : une ligne par EPS, avec ses commentaires d'equipe.
     * seulementDecisions limite aux commentaires commencant par "valide"
     * ou "contest", comme la regle de la section import.
     */
    public record ExportEquipeRequest(
            List<String> epsList,
            String eps,
            String period,
            String year,
            String month,
            Boolean seulementDecisions) {}

    @PostMapping("/export/equipe")
    public ResponseEntity<Map<String, Object>> exporterEquipe(@RequestBody ExportEquipeRequest req) {
        try {
            // Le texte colle et la liste sont acceptes indifferemment
            LinkedHashSet<String> eps = new LinkedHashSet<>();
            if (req.epsList() != null) {
                for (String e : req.epsList()) eps.addAll(BytelRechercheService.parserEps(e));
            }
            eps.addAll(BytelRechercheService.parserEps(req.eps()));

            if (eps.isEmpty()) {
                return ResponseEntity.ok(Map.of("statut", "ERREUR",
                        "erreur", "Aucun EPS fourni."));
            }
            String periode = BytelRechercheService.motifPeriode(req.period(), req.year(), req.month());
            return ResponseEntity.accepted().body(exportService.demarrerEquipe(
                    new ArrayList<>(eps), periode, Boolean.TRUE.equals(req.seulementDecisions())));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("statut", "ERREUR", "erreur", String.valueOf(e.getMessage())));
        }
    }

    @GetMapping("/export/{id}/status")
    public ResponseEntity<Map<String, Object>> exportStatus(@PathVariable String id) {
        return ResponseEntity.ok(exportService.statut(id));
    }

    @GetMapping("/export/{id}/fichier")
    public ResponseEntity<?> exportFichier(@PathVariable String id) {
        BytelExportService.Job job = exportService.job(id);
        if (job == null || !job.estPret()) {
            return ResponseEntity.status(404).body(Map.of("erreur", "Export introuvable ou pas encore pret."));
        }
        FileSystemResource res = new FileSystemResource(job.fichier());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + job.nomFichier() + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(res);
    }

    /**
     * Chronologie complete d'un EPS : les versions fournies par l'API
     * et les decisions enregistrees chez Kyntus, fusionnees et numerotees
     * de la plus ancienne a la plus recente.
     */
    @GetMapping("/timeline/{eps}")
    public ResponseEntity<List<Map<String, Object>>> timeline(
            @PathVariable String eps,
            @RequestParam("period") String period) {

        List<BytelQualification> versions =
                qualifRepo.findByIdInterventionAndPeriodeOrderByOrdreApiAsc(eps, period);

        List<Map<String, Object>> sortie = new ArrayList<>();
        int total = versions.size();

        // ordreApi 0 est la plus recente : on numerote a l'envers
        for (BytelQualification q : versions) {
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("source", "BYTEL");
            e.put("version", total - (q.getOrdreApi() == null ? 0 : q.getOrdreApi()));
            e.put("courante", Integer.valueOf(0).equals(q.getOrdreApi()));
            e.put("date", q.getDateQualification());
            e.put("qualificationId", q.getQualificationId());
            e.put("etat", q.getEtat());
            e.put("typeQualification", q.getTypeQualification());
            e.put("typeIntervention", q.getTypeIntervention());
            e.put("typeRaccordement", q.getTypeRaccordement());
            e.put("typePrestation", q.getTypePrestation());
            e.put("montant", q.getMontant());
            e.put("etape", q.getEtapeType());
            e.put("avis", q.getEtapeAvis());
            e.put("acteur", q.getEtapeActeur());
            e.put("commentaire", q.getEtapeCommentaire());
            sortie.add(e);
        }

        // Decisions Kyntus
        for (BytelAction a : actionRepo.findByIdInterventionAndPeriodeOrderByActionAtAsc(eps, period)) {
            if (BytelAction.TYPE_SYNC.equals(a.getActionType())
                    || BytelAction.TYPE_INITIAL.equals(a.getActionType())) continue;
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("source", "KYNTUS");
            e.put("version", a.getVersionNo());
            e.put("courante", false);
            e.put("date", a.getActionAt() == null ? null : a.getActionAt().toString());
            e.put("qualificationId", a.getQualificationId());
            e.put("actionType", a.getActionType());
            e.put("etat", a.getEtatApres());
            e.put("etatAvant", a.getEtatAvant());
            e.put("typeIntervention", a.getTypeInterventionApres());
            e.put("typeInterventionAvant", a.getTypeInterventionAvant());
            e.put("typeRaccordement", a.getTypeRaccordementApres());
            e.put("montant", a.getMontant());
            e.put("commentaire", a.getCommentaire());
            e.put("acteur", a.getAuteur());
            e.put("statutEnvoi", a.getStatutEnvoi());
            e.put("httpStatus", a.getHttpStatus());
            sortie.add(e);
        }

        // Tri chronologique, du plus ancien au plus recent
        sortie.sort(Comparator.comparing(m -> String.valueOf(m.get("date") == null ? "" : m.get("date"))));
        return ResponseEntity.ok(sortie);
    }

    /** Toutes les versions brutes d'un EPS. */
    @GetMapping("/eps/{eps}/versions")
    public ResponseEntity<List<BytelQualification>> versionsDeLEps(
            @PathVariable String eps, @RequestParam("period") String period) {
        return ResponseEntity.ok(qualifRepo.findByIdInterventionAndPeriodeOrderByOrdreApiAsc(eps, period));
    }

    @GetMapping("/eps/{eps}")
    public ResponseEntity<?> detailEps(@PathVariable String eps, @RequestParam("period") String period) {
        return interventionRepo.findByIdInterventionAndPeriode(eps, period)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ===================== DROPDOWNS =====================
    // year et month acceptent "TOUS" : les listes couvrent alors toutes les periodes en base.

    private static String motif(String period, String year, String month) {
        return BytelRechercheService.motifPeriode(period, year, month);
    }

    @GetMapping("/etats")
    public ResponseEntity<List<String>> etats(@RequestParam(required = false) String period,
                                              @RequestParam(required = false) String year,
                                              @RequestParam(required = false) String month) {
        try { return ResponseEntity.ok(qualifRepo.findDistinctEtats(motif(period, year, month))); }
        catch (Exception e) { return ResponseEntity.ok(List.of()); }
    }

    @GetMapping("/types")
    public ResponseEntity<List<String>> types(@RequestParam(required = false) String period,
                                              @RequestParam(required = false) String year,
                                              @RequestParam(required = false) String month) {
        try { return ResponseEntity.ok(qualifRepo.findDistinctTypes(motif(period, year, month))); }
        catch (Exception e) { return ResponseEntity.ok(List.of()); }
    }

    @GetMapping("/types-qualification")
    public ResponseEntity<List<String>> typesQualification(@RequestParam(required = false) String period,
                                                           @RequestParam(required = false) String year,
                                                           @RequestParam(required = false) String month) {
        try { return ResponseEntity.ok(qualifRepo.findDistinctTypesQualification(motif(period, year, month))); }
        catch (Exception e) { return ResponseEntity.ok(List.of()); }
    }

    @GetMapping("/periodes")
    public ResponseEntity<List<String>> periodes() {
        return ResponseEntity.ok(interventionRepo.findDistinctPeriodes());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(@RequestParam(required = false) String period,
                                                     @RequestParam(required = false) String year,
                                                     @RequestParam(required = false) String month) {
        // Jamais de 500 ici : sans donnee, les compteurs restent a zero.
        String p = motif(period, year, month);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("periode", p);
        Map<String, Object> parEtat = new LinkedHashMap<>();
        Map<String, Long> parAction = new LinkedHashMap<>();
        try {
            for (Object[] row : qualifRepo.statsParEtat(p)) {
                Map<String, Object> v = new LinkedHashMap<>();
                v.put("nb", row[1] == null ? 0L : ((Number) row[1]).longValue());
                v.put("montant", row[2] == null ? 0d : ((Number) row[2]).doubleValue());
                parEtat.put(row[0] == null ? "INCONNU" : row[0].toString(), v);
            }
            for (Object[] row : actionRepo.countByActionType(p)) {
                parAction.put(row[0] == null ? "?" : row[0].toString(),
                        row[1] == null ? 0L : ((Number) row[1]).longValue());
            }
            out.put("totalEps", interventionRepo.compterMotif(p));
            out.put("totalVersions", qualifRepo.compterVersions(p));
            out.put("versionsCourantes", qualifRepo.compterCourantes(p));
            out.put("actionnables", qualifRepo.countCourantesParEtat(p, BytelQualification.ETAT_ACTIONNABLE));
            out.put("traitees", qualifRepo.countTraitees(p));
        } catch (Exception e) {
            out.put("totalEps", 0);
            out.put("totalVersions", 0);
            out.put("versionsCourantes", 0);
            out.put("actionnables", 0);
            out.put("traitees", 0);
            out.put("note", "stats indisponibles : " + e.getMessage());
        }
        out.put("parEtat", parEtat);
        out.put("parAction", parAction);
        return ResponseEntity.ok(out);
    }

    // ===================== ACTIONS =====================

    public record ActionRequest(
            String qualificationId, String period, String actionType, String commentaire,
            String typeInterventionApres, String typeRaccordementApres,
            String auteur, String bearerToken,
            /** Qualification brute, transmise quand l'ecran travaille en lecture directe. */
            Map<String, Object> snapshot,
            String eps) {}

    @PostMapping("/actions")
    public ResponseEntity<?> agir(@RequestBody ActionRequest req) {
        try {
            Map<String, Object> res = actionService.enregistrerAction(
                    req.qualificationId(), req.period(), req.actionType(), req.commentaire(),
                    req.typeInterventionApres(), req.typeRaccordementApres(),
                    req.auteur(), req.bearerToken(), req.snapshot(), req.eps());
            return Boolean.TRUE.equals(res.get("ok"))
                    ? ResponseEntity.ok(res)
                    : ResponseEntity.badRequest().body(res);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("ok", false, "erreur", String.valueOf(e.getMessage())));
        }
    }

    @GetMapping("/actions/apercu")
    public ResponseEntity<Map<String, Object>> apercu(
            @RequestParam String qualificationId,
            @RequestParam String period,
            @RequestParam(required = false) String typeInterventionApres,
            @RequestParam(required = false) String typeRaccordementApres) {
        return ResponseEntity.ok(actionService.apercu(
                qualificationId, period, typeInterventionApres, typeRaccordementApres));
    }

    public record ActionLotRequest(
            List<String> qualificationIds, String period, String actionType,
            String commentaire, String auteur, String bearerToken) {}

    @PostMapping("/actions/lot")
    public ResponseEntity<?> agirEnLot(@RequestBody ActionLotRequest req) {
        List<Map<String, Object>> resultats = new ArrayList<>();
        int ok = 0, ko = 0;
        for (String qid : (req.qualificationIds() == null ? List.<String>of() : req.qualificationIds())) {
            if (qid == null || qid.isBlank()) continue;
            Map<String, Object> r = actionService.enregistrerAction(
                    qid.trim(), req.period(), req.actionType(), req.commentaire(),
                    null, null, req.auteur(), req.bearerToken());
            r.put("qualificationId", qid.trim());
            if (Boolean.TRUE.equals(r.get("ok"))) ok++; else ko++;
            resultats.add(r);
        }
        return ResponseEntity.ok(Map.of(
                "traites", resultats.size(), "succes", ok, "echecs", ko, "details", resultats));
    }

    // ===================== HISTORIQUE DES DECISIONS KYNTUS =====================

    @GetMapping("/historique")
    public ResponseEntity<Map<String, Object>> historique(
            @RequestParam(required = false) String period,
            @RequestParam(required = false) String year,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String auteur,
            @RequestParam(required = false) String eps,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        try {
            Page<BytelAction> res = actionRepo.findHistorique(
                    motif(period, year, month), actionType, auteur, eps,
                    parseDate(dateDebut, true), parseDate(dateFin, false),
                    PageRequest.of(page, size));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("content", res.getContent());
            body.put("currentPage", res.getNumber());
            body.put("totalItems", res.getTotalElements());
            body.put("totalPages", res.getTotalPages());
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private LocalDateTime parseDate(String s, boolean debut) {
        if (s == null || s.isBlank()) return debut ? DATE_MIN : DATE_MAX;
        try {
            if (s.length() <= 10) {
                LocalDate d = LocalDate.parse(s);
                return debut ? d.atStartOfDay() : d.atTime(23, 59, 59);
            }
            return LocalDateTime.parse(s);
        } catch (Exception e) {
            return debut ? DATE_MIN : DATE_MAX;
        }
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("etatActionnable", BytelQualification.ETAT_ACTIONNABLE);
        out.put("envoiActive", actionService.isEnvoiActive());
        out.put("partnerBaseUrl", actionService.getPartnerBaseUrl());
        return ResponseEntity.ok(out);
    }
}
