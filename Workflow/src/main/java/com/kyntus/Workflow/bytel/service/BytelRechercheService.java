package com.kyntus.Workflow.bytel.service;

import com.kyntus.Workflow.bytel.model.BytelQualification;
import com.kyntus.Workflow.bytel.repository.BytelQualificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Point unique de construction des criteres de recherche.
 *
 * La liste, l'onglet des versions et l'export passent tous par ici : ils
 * appliquent donc exactement les memes filtres.
 */
@Service
public class BytelRechercheService {

    /** Au-dela, la requete depasserait les limites raisonnables du pilote JDBC. */
    public static final int MAX_EPS_LISTE = 10_000;

    /** Valeur factice liee au parametre IN quand aucune liste n'est fournie. */
    private static final List<String> LISTE_FACTICE = List.of("__AUCUN__");

    private final BytelQualificationRepository qualifRepo;

    public BytelRechercheService(BytelQualificationRepository qualifRepo) {
        this.qualifRepo = qualifRepo;
    }

    // ------------------------------------------------------------------
    // Filtres bruts, tels que recus de l'ecran
    // ------------------------------------------------------------------

    /**
     * year et month sont des chaines : un nombre, ou "TOUS".
     * eps peut contenir un seul identifiant (recherche partielle) ou
     * plusieurs separes par des espaces, virgules, points-virgules ou
     * retours a la ligne (recherche exacte).
     */
    public record Filtres(
            String period,
            String year,
            String month,
            String etat,
            String type,
            String qualif,
            String eps,
            List<String> epsList,
            String traitement,
            String dateDebut,
            String dateFin,
            Integer page,
            Integer size,
            /** COURANTE (defaut) | PREMIERE | TOUTE : version sur laquelle porte le filtre d'etat */
            String modeEtat
    ) {}

    /** Criteres normalises, prets pour le repository. Jamais de valeur nulle. */
    public record Criteres(
            String periode,
            boolean courantesOnly,
            String etat,
            String type,
            String qualif,
            String eps,
            List<String> epsList,
            boolean traiteeOnly,
            boolean nonTraiteeOnly,
            String dateDebut,
            String dateFin,
            String modeEtat
    ) {
        public boolean sansListe() { return epsList == null || epsList.isEmpty(); }
        public Collection<String> listeOuFactice() { return sansListe() ? LISTE_FACTICE : epsList; }
        public boolean periodeUnique() { return !periode.contains("%"); }
    }

    // ------------------------------------------------------------------

    /**
     * Motif de periode pour LIKE.
     * period prime s'il est fourni et precis ; sinon il est construit
     * depuis year et month, ou "TOUS" donne un joker.
     */
    public static String motifPeriode(String period, String year, String month) {
        if (period != null && !period.isBlank() && !period.toUpperCase().contains("TOUS")) {
            return period.trim();
        }
        String a = (year == null || year.isBlank() || "TOUS".equalsIgnoreCase(year.trim()))
                ? "%" : year.trim();
        String m;
        if (month == null || month.isBlank() || "TOUS".equalsIgnoreCase(month.trim())) {
            m = "%";
        } else {
            try { m = String.format("%02d", Integer.parseInt(month.trim())); }
            catch (NumberFormatException e) { m = "%"; }
        }
        if ("%".equals(a) && "%".equals(m)) return "%";
        return a + "_M" + m;
    }

    /** Libelle lisible du motif, pour les noms de fichiers et les messages. */
    public static String libellePeriode(String motif) {
        if ("%".equals(motif)) return "TOUTES_PERIODES";
        return motif.replace("%", "TOUS");
    }

    /** Decoupe un texte colle en identifiants EPS distincts, dans l'ordre. */
    public static List<String> parserEps(String brut) {
        if (brut == null || brut.isBlank()) return List.of();
        LinkedHashSet<String> uniques = new LinkedHashSet<>();
        for (String t : brut.split("[\\s,;|]+")) {
            String v = t.trim().replace("\"", "").replace("'", "");
            if (!v.isEmpty()) uniques.add(v.toUpperCase());
        }
        return new ArrayList<>(uniques);
    }

    /**
     * Construit les criteres.
     * Un seul EPS saisi garde la recherche partielle d'origine.
     * Deux ou plus basculent en recherche exacte par liste.
     */
    public Criteres construire(Filtres f, boolean courantesOnly) {
        String periode = motifPeriode(f.period(), f.year(), f.month());

        LinkedHashSet<String> liste = new LinkedHashSet<>();
        if (f.epsList() != null) {
            for (String e : f.epsList()) liste.addAll(parserEps(e));
        }
        List<String> depuisChamp = parserEps(f.eps());

        String epsPartiel = "";
        if (liste.isEmpty() && depuisChamp.size() == 1) {
            epsPartiel = depuisChamp.get(0);
        } else {
            liste.addAll(depuisChamp);
        }

        List<String> epsList = new ArrayList<>(liste);
        if (epsList.size() > MAX_EPS_LISTE) epsList = epsList.subList(0, MAX_EPS_LISTE);

        String traitement = vide(f.traitement());
        String dateDebut = vide(f.dateDebut()).isEmpty() ? "" : f.dateDebut().trim() + "T00:00:00.000Z";
        String dateFin = vide(f.dateFin()).isEmpty() ? "" : f.dateFin().trim() + "T23:59:59.999Z";

        return new Criteres(
                periode,
                courantesOnly,
                vide(f.etat()),
                vide(f.type()),
                vide(f.qualif()),
                epsPartiel,
                epsList,
                "TRAITEE".equals(traitement),
                "NON_TRAITEE".equals(traitement),
                dateDebut,
                dateFin,
                normaliserMode(f.modeEtat()));
    }

    private static String normaliserMode(String m) {
        if (m == null) return "COURANTE";
        String v = m.trim().toUpperCase();
        return ("PREMIERE".equals(v) || "TOUTE".equals(v)) ? v : "COURANTE";
    }

    // ------------------------------------------------------------------

    public Page<BytelQualification> rechercher(Criteres c, Pageable pageable) {
        return qualifRepo.rechercher(c.periode(), c.courantesOnly(), c.etat(), c.type(), c.qualif(),
                c.eps(), c.sansListe(), c.listeOuFactice(), c.traiteeOnly(), c.nonTraiteeOnly(),
                c.dateDebut(), c.dateFin(), pageable);
    }

    public long compter(Criteres c) {
        return qualifRepo.compter(c.periode(), c.courantesOnly(), c.etat(), c.type(), c.qualif(),
                c.eps(), c.sansListe(), c.listeOuFactice(), c.traiteeOnly(), c.nonTraiteeOnly(),
                c.dateDebut(), c.dateFin());
    }

    public List<BytelQualification> lot(Criteres c, long apresId, int taille) {
        return qualifRepo.lotExport(c.periode(), c.courantesOnly(), c.etat(), c.type(), c.qualif(),
                c.eps(), c.sansListe(), c.listeOuFactice(), c.traiteeOnly(), c.nonTraiteeOnly(),
                c.dateDebut(), c.dateFin(), apresId, PageRequest.of(0, taille));
    }

    // ---------------- Historique par EPS ----------------

    /** Une page d'EPS (une ligne d'ancrage par EPS). */
    public Page<BytelQualification> ancres(Criteres c, Pageable pageable) {
        return qualifRepo.ancres(c.periode(), c.qualif(), c.eps(), c.sansListe(), c.listeOuFactice(),
                c.dateDebut(), c.dateFin(), c.modeEtat(), c.etat(), pageable);
    }

    public List<BytelQualification> lotAncres(Criteres c, long apresId, int taille) {
        return qualifRepo.lotAncres(c.periode(), c.qualif(), c.eps(), c.sansListe(), c.listeOuFactice(),
                c.dateDebut(), c.dateFin(), c.modeEtat(), c.etat(), apresId, PageRequest.of(0, taille));
    }

    /**
     * Toutes les versions des EPS ancres, groupees par EPS et triees de la
     * plus ANCIENNE a la plus recente. La cle est "EPS|periode".
     */
    public Map<String, List<BytelQualification>> versionsDesAncres(List<BytelQualification> ancres) {
        Map<String, List<BytelQualification>> groupes = new LinkedHashMap<>();
        if (ancres.isEmpty()) return groupes;

        Map<String, Set<String>> parPeriode = new LinkedHashMap<>();
        for (BytelQualification a : ancres) {
            groupes.put(a.getIdIntervention() + "|" + a.getPeriode(), new ArrayList<>());
            parPeriode.computeIfAbsent(a.getPeriode(), k -> new LinkedHashSet<>()).add(a.getIdIntervention());
        }
        for (Map.Entry<String, Set<String>> e : parPeriode.entrySet()) {
            List<String> ids = new ArrayList<>(e.getValue());
            for (int i = 0; i < ids.size(); i += 1000) {
                for (BytelQualification v : qualifRepo.versionsPourEps(
                        e.getKey(), ids.subList(i, Math.min(i + 1000, ids.size())))) {
                    List<BytelQualification> g = groupes.get(v.getIdIntervention() + "|" + v.getPeriode());
                    if (g != null) g.add(v);
                }
            }
        }
        // versionsPourEps renvoie deja ordreApi decroissant, soit du plus ancien au plus recent
        return groupes;
    }

    /** EPS de la liste absents de la ou des periodes visees, dans l'ordre de saisie. */
    public List<String> introuvables(Criteres c) {
        if (c.sansListe()) return List.of();
        Set<String> presents = new HashSet<>();
        List<String> liste = c.epsList();
        for (int i = 0; i < liste.size(); i += 1000) {
            List<String> morceau = liste.subList(i, Math.min(i + 1000, liste.size()));
            presents.addAll(qualifRepo.epsPresents(c.periode(), morceau));
        }
        List<String> manquants = new ArrayList<>();
        for (String e : liste) if (!presents.contains(e)) manquants.add(e);
        return manquants;
    }

    private static String vide(String s) { return s == null ? "" : s.trim(); }
}
