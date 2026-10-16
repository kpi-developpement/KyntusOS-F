package com.kyntus.Workflow.bytel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyntus.Workflow.bytel.model.BytelQualification;
import com.kyntus.Workflow.bytel.repository.BytelInterventionRepository;
import com.kyntus.Workflow.bytel.repository.BytelQualificationRepository;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

/**
 * Synchronisation asynchrone avec transactions par page dans BytelPageWriter.
 * Le suivi est en memoire, local a cette instance, et disparait au redemarrage.
 * L'annulation est cooperative : une page deja en ecriture peut etre terminee.
 */
@Service
public class BytelSyncService implements DisposableBean {
    private final BytelInterventionRepository interventionRepo;
    private final BytelQualificationRepository qualifRepo;
    private final BytelPageWriter pageWriter;
    private final ObjectMapper mapper;
    private final RestClient restClient;
    private final Map<String, Etat> etats = new LinkedHashMap<>();
    private final ThreadPoolExecutor executor = new ThreadPoolExecutor(
            1, 1, 0L, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(24), r -> {
                Thread t = new Thread(r, "bytel-sync");
                t.setDaemon(true);
                return t;
            }, new ThreadPoolExecutor.AbortPolicy());
    private boolean arret;

    @Value("${bytel.dashboard.url:http://10.10.10.25:8117/api/dashboard/interventions}")
    private String dashboardUrl;
    @Value("${bytel.dashboard.page-size:200}")
    private int pageSize;
    @Value("${bytel.dashboard.max-pages:500}")
    private int maxPages;

    public BytelSyncService(BytelInterventionRepository interventionRepo,
                            BytelQualificationRepository qualifRepo,
                            BytelPageWriter pageWriter, ObjectMapper mapper) {
        this.interventionRepo = interventionRepo;
        this.qualifRepo = qualifRepo;
        this.pageWriter = pageWriter;
        this.mapper = mapper;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(15000);
        factory.setReadTimeout(120000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    private static final class Etat {
        final Map<String, Object> valeurs = new LinkedHashMap<>();
        volatile boolean annulation;
        volatile boolean actif = true;
        Etat(String periode) {
            valeurs.put("periode", periode);
            valeurs.put("statut", "EN_ATTENTE");
            valeurs.put("pourcentage", 0);
            valeurs.put("pagesLues", 0);
            valeurs.put("pagesTotal", 0);
            valeurs.put("epsLus", 0);
            valeurs.put("versionsNouvelles", 0);
            valeurs.put("versionsMisesAJour", 0);
            valeurs.put("erreurs", List.of());
            valeurs.put("demandeAt", LocalDateTime.now().toString());
        }
        synchronized void maj(Map<String, Object> valeurs) { this.valeurs.putAll(valeurs); }
        synchronized Map<String, Object> copie() { return new LinkedHashMap<>(valeurs); }
        synchronized void terminer(String statut) {
            valeurs.put("statut", statut);
            valeurs.put("finAt", LocalDateTime.now().toString());
            if ("TERMINE".equals(statut)) valeurs.put("pourcentage", 100);
            actif = false;
        }
    }

    private String valider(String periode) {
        if (periode == null || !periode.trim().matches("[0-9]{4}_M(0[1-9]|1[0-2])"))
            throw new IllegalArgumentException("Periode attendue : AAAA_M01 a AAAA_M12");
        return periode.trim();
    }

    /** forcer relance une periode terminee, sans lancer deux traitements simultanes. */
    public synchronized Map<String, Object> demarrer(String periode, boolean forcer) {
        String p = valider(periode);
        if (arret) throw new IllegalStateException("Service en cours d'arret");
        Etat precedent = etats.get(p);
        if (precedent != null && (precedent.actif ||
                (!forcer && "TERMINE".equals(precedent.copie().get("statut")))))
            return precedent.copie();
        Etat e = new Etat(p);
        etats.put(p, e);
        try {
            executor.execute(() -> executer(p, e));
        } catch (RejectedExecutionException ex) {
            if (precedent == null) etats.remove(p); else etats.put(p, precedent);
            throw new IllegalStateException("File de synchronisation pleine ou service arrete", ex);
        }
        return e.copie();
    }

    public synchronized Map<String, Object> statut(String periode) {
        String p = valider(periode);
        Etat e = etats.get(p);
        return e == null ? Map.of("periode", p, "statut", "AUCUNE", "pourcentage", 0) : e.copie();
    }

    public synchronized Map<String, Object> annuler(String periode) {
        String p = valider(periode);
        Etat e = etats.get(p);
        if (e == null) return statut(p);
        synchronized (e) {
            if (e.actif) {
                e.annulation = true;
                e.maj(Map.of("statut", "ANNULATION_DEMANDEE"));
            }
            return e.copie();
        }
    }

    /** Etats observes depuis le demarrage de cette instance ; aucune nouvelle table. */
    public synchronized List<Map<String, Object>> etatsConnus() {
        List<Map<String, Object>> resultat = new ArrayList<>();
        for (Etat e : etats.values()) resultat.add(e.copie());
        return resultat;
    }

    /** Conserve l'entree synchrone pour les eventuels appelants existants. */
    public Map<String, Object> synchroniserPeriode(String periode) {
        String p = valider(periode);
        Etat e;
        synchronized (this) {
            if (arret) throw new IllegalStateException("Service en cours d'arret");
            Etat precedent = etats.get(p);
            if (precedent != null && precedent.actif)
                throw new IllegalStateException("Synchronisation deja active pour " + p);
            e = new Etat(p);
            etats.put(p, e);
        }
        executer(p, e);
        return e.copie();
    }

    private boolean doitAnnuler(Etat e) {
        return e.annulation || Thread.currentThread().isInterrupted();
    }

    private void executer(String periode, Etat e) {
        long debut = System.currentTimeMillis();
        int page = 0, totalPages = 1;
        int epsLus = 0, nouvelles = 0, maj = 0;
        List<String> erreurs = new ArrayList<>();
        boolean complet = false;
        try {
            synchronized (e) {
                if (!e.annulation) e.maj(Map.of("statut", "EN_COURS"));
                e.maj(Map.of("debutAt", LocalDateTime.now().toString()));
            }
            if (pageSize <= 0 || maxPages <= 0)
                throw new IllegalStateException("page-size et max-pages doivent etre positifs");
            while (page < totalPages && page < maxPages && !doitAnnuler(e)) {
                final int numeroPage = page;
                String url = dashboardUrl + "?period=" + periode + "&size=" + pageSize + "&page=" + page;
                if (page == 0) e.maj(Map.of("urlAppelee", url));
                JsonNode root;
                try {
                    String body = restClient.get().uri(url).retrieve().body(String.class);
                    root = mapper.readTree(body == null ? "{}" : body);
                    if (root == null || !root.path("content").isArray())
                        throw new IllegalStateException("Reponse sans tableau content");
                    if (page == 0) {
                        JsonNode total = root.path("totalPages");
                        if (!total.isIntegralNumber() || !total.canConvertToInt() || total.asInt() < 0)
                            throw new IllegalStateException("totalPages absent ou invalide");
                        totalPages = total.asInt();
                        e.maj(Map.of("pagesTotal", totalPages));
                    }
                } catch (Exception ex) {
                    erreurs.add("Lecture page " + numeroPage + " : " + ex.getClass().getSimpleName() + " - " + ex.getMessage());
                    break;
                }
                if (doitAnnuler(e)) break;
                JsonNode content = root.path("content");
                if (content.isEmpty()) {
                    if (page == 0 && totalPages <= 1) complet = true;
                    else erreurs.add("Page " + page + " vide avant la fin annoncee");
                    break;
                }
                if (totalPages == 0) {
                    erreurs.add("Reponse incoherente : content non vide et totalPages=0");
                    break;
                }
                try {
                    int[] r = pageWriter.ecrirePage(content, periode, erreurs);
                    epsLus += r[0]; nouvelles += r[1]; maj += r[2];
                } catch (Exception ex) {
                    erreurs.add("Ecriture page " + page + " : " + ex.getClass().getSimpleName() + " - " + ex.getMessage());
                }
                page++;
                e.maj(Map.of("pagesLues", page, "epsLus", epsLus,
                        "versionsNouvelles", nouvelles, "versionsMisesAJour", maj,
                        "pourcentage", (int) Math.min(99L, 100L * page / Math.max(1, totalPages)),
                        "erreurs", Collections.unmodifiableList(new ArrayList<>(erreurs))));
            }
            if (page >= totalPages) complet = true;
            if (!doitAnnuler(e) && page >= maxPages && page < totalPages)
                erreurs.add("Limite max-pages atteinte : " + page + "/" + totalPages);
            if (!doitAnnuler(e)) {
                try {
                    Map<String, Object> compteurs = new LinkedHashMap<>();
                    compteurs.put("totalEps", interventionRepo.countByPeriode(periode));
                    compteurs.put("totalVersions", qualifRepo.countByPeriode(periode));
                    compteurs.put("actionnables", qualifRepo.countCourantesParEtat(periode, BytelQualification.ETAT_ACTIONNABLE));
                    e.maj(compteurs);
                } catch (Exception ex) {
                    erreurs.add("Lecture des compteurs : " + ex.getMessage());
                }
            }
        } catch (Exception ex) {
            erreurs.add(ex.getClass().getSimpleName() + " : " + ex.getMessage());
        } catch (Error fatal) {
            erreurs.add("Erreur fatale : " + fatal.getClass().getSimpleName());
            throw fatal;
        } finally {
            synchronized (e) {
                String statut = doitAnnuler(e) ? "ANNULE" :
                        (complet && erreurs.isEmpty() ? "TERMINE" : "ERREUR");
                e.maj(Map.of("pagesLues", page, "pagesTotal", totalPages,
                        "epsLus", epsLus, "versionsNouvelles", nouvelles,
                        "versionsMisesAJour", maj, "dureeMs", System.currentTimeMillis() - debut,
                        "erreurs", Collections.unmodifiableList(new ArrayList<>(erreurs))));
                if ("TERMINE".equals(statut)) e.maj(Map.of("syncAt", LocalDateTime.now().toString()));
                e.terminer(statut);
            }
        }
    }

    @Override
    public void destroy() {
        synchronized (this) {
            arret = true;
            for (Etat e : etats.values()) {
                synchronized (e) {
                    if (e.actif) {
                        e.annulation = true;
                        e.maj(Map.of("statut", "ANNULATION_DEMANDEE"));
                    }
                }
            }
            executor.shutdown();
        }
        try {
            if (!executor.awaitTermination(30, TimeUnit.SECONDS)) executor.shutdownNow();
        } catch (InterruptedException ex) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
