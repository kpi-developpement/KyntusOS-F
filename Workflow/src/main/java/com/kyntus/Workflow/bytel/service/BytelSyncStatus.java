package com.kyntus.Workflow.bytel.service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Etat d'avancement d'une synchronisation, tenu en memoire.
 * Permet a l'ecran d'afficher la progression sans maintenir la requete HTTP
 * ouverte pendant plusieurs minutes, ce qui faisait couper le proxy.
 */
public class BytelSyncStatus {

    public static final String EN_COURS = "EN_COURS";
    public static final String TERMINE  = "TERMINE";
    public static final String ERREUR   = "ERREUR";

    private final String periode;
    private volatile String statut = EN_COURS;
    private volatile String urlAppelee;
    private volatile String messageFinal;

    private final AtomicInteger pagesLues = new AtomicInteger(0);
    private final AtomicInteger pagesTotal = new AtomicInteger(1);
    private final AtomicInteger epsLus = new AtomicInteger(0);
    private final AtomicInteger versionsNouvelles = new AtomicInteger(0);
    private final AtomicInteger versionsMaj = new AtomicInteger(0);

    private final List<String> erreurs = new CopyOnWriteArrayList<>();
    private final AtomicBoolean annule = new AtomicBoolean(false);

    private final LocalDateTime debut = LocalDateTime.now();
    private volatile LocalDateTime fin;

    // Compteurs finaux, remplis a la fin
    private volatile long totalEps;
    private volatile long totalVersions;
    private volatile long actionnables;

    public BytelSyncStatus(String periode) { this.periode = periode; }

    public String getPeriode() { return periode; }
    public String getStatut() { return statut; }
    public void setStatut(String s) { this.statut = s; }
    public boolean estEnCours() { return EN_COURS.equals(statut); }

    public void setUrlAppelee(String u) { this.urlAppelee = u; }
    public void setMessageFinal(String m) { this.messageFinal = m; }
    public void terminer(String nouveauStatut) { this.statut = nouveauStatut; this.fin = LocalDateTime.now(); }

    public void setPagesTotal(int n) { pagesTotal.set(Math.max(n, 1)); }
    public void incrementPage() { pagesLues.incrementAndGet(); }
    public void ajouter(int eps, int nouvelles, int maj) {
        epsLus.addAndGet(eps); versionsNouvelles.addAndGet(nouvelles); versionsMaj.addAndGet(maj);
    }
    public void ajouterErreur(String e) { if (erreurs.size() < 50) erreurs.add(e); }
    public List<String> getErreurs() { return Collections.unmodifiableList(erreurs); }

    public void demanderAnnulation() { annule.set(true); }
    public boolean estAnnule() { return annule.get(); }

    public void setCompteurs(long eps, long versions, long act) {
        this.totalEps = eps; this.totalVersions = versions; this.actionnables = act;
    }

    public int getEpsLus() { return epsLus.get(); }
    public int getVersionsNouvelles() { return versionsNouvelles.get(); }
    public int getVersionsMaj() { return versionsMaj.get(); }

    /** Representation JSON envoyee a l'ecran. */
    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("periode", periode);
        m.put("statut", statut);
        m.put("pagesLues", pagesLues.get());
        m.put("pagesTotal", pagesTotal.get());
        int pct = pagesTotal.get() <= 0 ? 0
                : (int) Math.min(100, Math.round(100.0 * pagesLues.get() / pagesTotal.get()));
        m.put("pourcentage", TERMINE.equals(statut) ? 100 : pct);
        m.put("epsLus", epsLus.get());
        m.put("versionsNouvelles", versionsNouvelles.get());
        m.put("versionsMisesAJour", versionsMaj.get());
        m.put("urlAppelee", urlAppelee);
        m.put("erreurs", erreurs);
        m.put("messageFinal", messageFinal);
        m.put("totalEps", totalEps);
        m.put("totalVersions", totalVersions);
        m.put("actionnables", actionnables);
        m.put("debut", debut.toString());
        m.put("fin", fin == null ? null : fin.toString());
        m.put("dureeSecondes", java.time.Duration.between(debut,
                fin == null ? LocalDateTime.now() : fin).getSeconds());
        return m;
    }
}
