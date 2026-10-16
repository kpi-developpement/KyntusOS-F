package com.kyntus.Workflow.bytel.service;

import com.kyntus.Workflow.bytel.model.BytelAction;
import com.kyntus.Workflow.bytel.model.BytelQualification;
import com.kyntus.Workflow.bytel.repository.BytelActionRepository;
import com.kyntus.Workflow.bytel.repository.BytelQualificationRepository;
import jakarta.annotation.PreDestroy;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Export Excel des onglets INTERVENTIONS et HISTORIQUE / VERSIONS.
 *
 * Le fichier est genere EN ARRIERE-PLAN puis telecharge : un mois complet
 * represente des dizaines de milliers de lignes, et le proxy du frontend
 * coupe toute requete au-dela d'une trentaine de secondes.
 *
 * Les lignes sont lues par lots via le meme filtre que l'ecran
 * (BytelRechercheService), donc le fichier correspond exactement a ce
 * qui est affiche, toutes pages confondues.
 */
@Service
public class BytelExportService {

    public static final String ONGLET_INTERVENTIONS = "INTERVENTIONS";
    public static final String ONGLET_VERSIONS = "VERSIONS";
    public static final String ONGLET_EQUIPE = "EQUIPE";
    /** Historique groupe par EPS, de la premiere a la derniere version. */
    public static final String ONGLET_VERSIONS_EPS = "VERSIONS_EPS";

    /** Limite d'Excel : 1 048 576 lignes, on garde une marge. */
    private static final int MAX_LIGNES = 1_000_000;
    private static final int TAILLE_LOT = 2_000;
    private static final Duration DUREE_CONSERVATION = Duration.ofHours(2);

    /** Designations reellement presentes dans les donnees, par type. */
    private static final Map<String, List<String>> ELEMENTS_PAR_QUALIF = Map.of(
            "QualificationRaccordement", List.of("INSTALLATION", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "DEPLACEMENT", "GOULOTTE"),
            "QualificationSAV", List.of("INSTALLATION", "SUPPORT", "DEPLACEMENT", "JARRETIERES"),
            "QualificationReseau", List.of("INSTALLATION", "MATERIEL", "JARRETIERES", "DEPLACEMENT"));
    private static final List<String> ELEMENTS_TOUS =
            List.of("INSTALLATION", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "DEPLACEMENT", "GOULOTTE", "JARRETIERES");

    private static final ZoneId PARIS = ZoneId.of("Europe/Paris");

    private final BytelRechercheService recherche;
    private final BytelQualificationRepository qualifRepo;
    private final BytelActionRepository actionRepo;
    private final ExecutorService executeur = Executors.newFixedThreadPool(2, r -> {
        Thread t = new Thread(r, "bytel-export");
        t.setDaemon(true);
        return t;
    });
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();

    public BytelExportService(BytelRechercheService recherche,
                              BytelQualificationRepository qualifRepo,
                              BytelActionRepository actionRepo) {
        this.recherche = recherche;
        this.qualifRepo = qualifRepo;
        this.actionRepo = actionRepo;
    }

    @PreDestroy
    public void arreter() {
        executeur.shutdownNow();
        for (Job j : jobs.values()) supprimerFichier(j);
    }

    // ------------------------------------------------------------------

    public static final class Job {
        final String id;
        final String onglet;
        final LocalDateTime debut = LocalDateTime.now();
        volatile String statut = "EN_COURS";
        volatile long total;
        volatile long ecrites;
        volatile boolean tronque;
        volatile String erreur;
        volatile LocalDateTime fin;
        volatile Path fichier;
        volatile String nomFichier;

        Job(String id, String onglet) { this.id = id; this.onglet = onglet; }

        public Path fichier() { return fichier; }
        public String nomFichier() { return nomFichier; }
        public boolean estPret() { return "TERMINE".equals(statut) && fichier != null && Files.exists(fichier); }

        Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", id);
            m.put("onglet", onglet);
            m.put("statut", statut);
            m.put("total", total);
            m.put("ecrites", ecrites);
            m.put("pourcentage", total <= 0 ? ("TERMINE".equals(statut) ? 100 : 0)
                    : (int) Math.min(100, Math.round(100.0 * ecrites / total)));
            m.put("tronque", tronque);
            m.put("erreur", erreur);
            m.put("nomFichier", nomFichier);
            m.put("dureeSecondes", Duration.between(debut, fin == null ? LocalDateTime.now() : fin).getSeconds());
            return m;
        }
    }

    public Map<String, Object> demarrer(String onglet, BytelRechercheService.Criteres criteres) {
        nettoyer();
        String id = UUID.randomUUID().toString();
        String o = ONGLET_VERSIONS_EPS.equals(onglet) ? ONGLET_VERSIONS_EPS
                : (ONGLET_VERSIONS.equals(onglet) ? ONGLET_VERSIONS : ONGLET_INTERVENTIONS);
        Job job = new Job(id, o);
        jobs.put(id, job);
        if (ONGLET_VERSIONS_EPS.equals(o)) executeur.submit(() -> executerParEps(job, criteres));
        else executeur.submit(() -> executer(job, criteres));
        return job.toMap();
    }

    public Map<String, Object> statut(String id) {
        Job j = jobs.get(id);
        if (j == null) return Map.of("id", id, "statut", "INCONNU");
        return j.toMap();
    }

    public Job job(String id) { return jobs.get(id); }

    // ------------------------------------------------------------------

    /**
     * Export equipe : une ligne par EPS demande, avec la suite de ses
     * commentaires d'equipe et, en fin de ligne, le sens de la derniere
     * decision. Meme forme que l'export equipe de la section import, pour
     * que les habitudes de l'equipe restent les memes.
     *
     * @param seulementDecisions true = ne garder que les commentaires
     *        commencant par "valide" ou "contest", comme la regle d'origine.
     *        false = tous les commentaires ecrits par l'equipe.
     */
    public Map<String, Object> demarrerEquipe(List<String> epsList, String periode,
                                              boolean seulementDecisions) {
        nettoyer();
        String id = UUID.randomUUID().toString();
        Job job = new Job(id, ONGLET_EQUIPE);
        jobs.put(id, job);
        executeur.submit(() -> executerEquipe(job, epsList, periode, seulementDecisions));
        return job.toMap();
    }

    /**
     * Reconnait une decision d'equipe malgre les variantes d'ecriture.
     * Reprend la tolerance de la section import ("valied", "contaist"...).
     */
    public static String sensDecision(String commentaire) {
        if (commentaire == null || commentaire.isBlank()) return null;
        String n = commentaire.trim().toLowerCase().replaceAll("^[^a-z0-9]+", "");
        if (n.startsWith("valid") || n.startsWith("valied")) return "VALIDE";
        if (n.startsWith("contest") || n.startsWith("contaist") || n.startsWith("contast")) return "CONTESTER";
        return null;
    }

    private void executerEquipe(Job job, List<String> epsDemandes, String periode,
                                boolean seulementDecisions) {
        try {
            // Ordre de saisie conserve, doublons retires
            LinkedHashSet<String> eps = new LinkedHashSet<>();
            if (epsDemandes != null) {
                for (String e : epsDemandes) {
                    if (e == null) continue;
                    String v = e.replace("\uFEFF", "").replace("\"", "").trim().toUpperCase();
                    if (!v.isEmpty()) eps.add(v);
                }
            }
            job.total = eps.size();
            if (eps.isEmpty()) {
                job.statut = "TERMINE";
                job.fin = LocalDateTime.now();
                return;
            }

            Map<String, List<String>> parEps = new LinkedHashMap<>();
            for (String e : eps) parEps.put(e, new ArrayList<>());

            List<String> liste = new ArrayList<>(eps);
            for (int i = 0; i < liste.size(); i += 1000) {
                List<String> morceau = liste.subList(i, Math.min(i + 1000, liste.size()));

                // Commentaires portes par les versions, etape partenaire uniquement :
                // c'est l'etape ou intervient l'equipe Kyntus.
                for (BytelQualification q : qualifRepo.versionsPourEps(periode, morceau)) {
                    if (!"EtapeControlePartenaire".equals(q.getEtapeType())) continue;
                    ajouter(parEps, q.getIdIntervention(), q.getEtapeCommentaire(), seulementDecisions);
                }
                // Decisions prises dans cette application
                for (BytelAction a : actionRepo.decisionsPourEps(periode, morceau)) {
                    ajouter(parEps, a.getIdIntervention(), a.getCommentaire(), seulementDecisions);
                }
            }

            int maxColonnes = 1;
            for (List<String> l : parEps.values()) maxColonnes = Math.max(maxColonnes, l.size());

            Path fichier = Files.createTempFile("bytel-equipe-", ".xlsx");
            job.fichier = fichier;
            job.nomFichier = "bytel_equipe_" + BytelRechercheService.libellePeriode(periode) + "_"
                    + LocalDateTime.now(PARIS).format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")) + ".xlsx";

            try (SXSSFWorkbook wb = new SXSSFWorkbook(200)) {
                wb.setCompressTempFiles(true);
                Styles st = new Styles(wb);
                SXSSFSheet sheet = wb.createSheet("Export_Equipe");

                Row tete = sheet.createRow(0);
                tete.createCell(0).setCellValue("VR");
                tete.createCell(1).setCellValue("EPS");
                for (int i = 0; i < maxColonnes; i++) tete.createCell(i + 2).setCellValue(String.valueOf(i + 1));
                tete.createCell(maxColonnes + 2)
                        .setCellValue("Commentaire de la derniere version \"valide ou contester\"");
                for (int i = 0; i <= maxColonnes + 2; i++) {
                    Cell c = tete.getCell(i);
                    if (c != null) c.setCellStyle(st.entete);
                }
                sheet.setColumnWidth(0, 8 * 256);
                sheet.setColumnWidth(1, 20 * 256);
                for (int i = 0; i < maxColonnes; i++) sheet.setColumnWidth(i + 2, 45 * 256);
                sheet.setColumnWidth(maxColonnes + 2, 22 * 256);
                sheet.createFreezePane(2, 1);

                int numLigne = 1;
                for (Map.Entry<String, List<String>> e : parEps.entrySet()) {
                    Row r = sheet.createRow(numLigne++);
                    List<String> timeline = e.getValue();

                    if (!timeline.isEmpty()) r.createCell(0).setCellValue(timeline.size());
                    r.createCell(1).setCellValue(e.getKey());
                    for (int i = 0; i < maxColonnes; i++) {
                        if (i < timeline.size()) r.createCell(i + 2).setCellValue(timeline.get(i));
                    }
                    String sens = timeline.isEmpty() ? null : sensDecision(timeline.get(timeline.size() - 1));
                    if (sens != null) r.createCell(maxColonnes + 2).setCellValue(sens);

                    job.ecrites++;
                }

                if (numLigne > 1) {
                    sheet.setAutoFilter(new CellRangeAddress(0, numLigne - 1, 0, maxColonnes + 2));
                }
                try (OutputStream out = Files.newOutputStream(fichier)) { wb.write(out); }
                wb.dispose();
            }

            job.fin = LocalDateTime.now();
            job.statut = "TERMINE";
        } catch (Throwable t) {
            job.erreur = t.getClass().getSimpleName() + " : " + t.getMessage();
            job.fin = LocalDateTime.now();
            job.statut = "ERREUR";
            supprimerFichier(job);
        }
    }

    /**
     * Historique groupe par EPS : pour chaque EPS selectionne, toutes ses
     * versions de la plus ancienne a la plus recente, numerotees 1/N a N/N.
     * La progression est comptee en EPS traites.
     */
    private void executerParEps(Job job, BytelRechercheService.Criteres c) {
        List<String> elements = c.qualif().isEmpty()
                ? ELEMENTS_TOUS
                : ELEMENTS_PAR_QUALIF.getOrDefault(c.qualif(), ELEMENTS_TOUS);
        try {
            // Nombre d'EPS concernes, pour la barre de progression
            job.total = recherche.ancres(c, org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements();

            Path fichier = Files.createTempFile("bytel-historique-", ".xlsx");
            job.fichier = fichier;
            String mode = "COURANTE".equals(c.modeEtat()) ? "" : "_" + c.modeEtat().toLowerCase();
            String etat = c.etat().isEmpty() ? "" : "_" + c.etat().toLowerCase();
            job.nomFichier = "bytel_historique" + etat + mode + "_"
                    + BytelRechercheService.libellePeriode(c.periode()) + "_"
                    + LocalDateTime.now(PARIS).format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")) + ".xlsx";

            try (SXSSFWorkbook wb = new SXSSFWorkbook(200)) {
                wb.setCompressTempFiles(true);
                Styles st = new Styles(wb);
                SXSSFSheet sheet = wb.createSheet("Historique par EPS");

                List<String> entetes = new ArrayList<>(List.of(
                        "EPS", "PERIODE", "VERSION", "ETAT COURANT DE L'EPS", "DATE VERSION", "ETAT",
                        "QUALIFICATION", "TYPE INTERVENTION", "TYPE RACCORDEMENT", "TYPE PRESTATION",
                        "MONTANT", "ETAPE", "AVIS", "ACTEUR", "COMMENTAIRE"));
                int premiereColonneDetail = entetes.size();
                entetes.addAll(elements);
                entetes.add("TOTAL DETAIL");
                entetes.add("UUID");

                Row tete = sheet.createRow(0);
                for (int i = 0; i < entetes.size(); i++) {
                    Cell cell = tete.createCell(i);
                    cell.setCellValue(entetes.get(i));
                    cell.setCellStyle(st.entete);
                    sheet.setColumnWidth(i, largeur(entetes.get(i)));
                }
                sheet.setColumnWidth(3, 34 * 256);
                sheet.createFreezePane(3, 1);

                int numLigne = 1;
                long apresId = 0L;
                boucle:
                while (true) {
                    List<BytelQualification> ancres = recherche.lotAncres(c, apresId, 500);
                    if (ancres.isEmpty()) break;

                    Map<String, List<BytelQualification>> groupes = recherche.versionsDesAncres(ancres);

                    for (BytelQualification a : ancres) {
                        List<BytelQualification> versions = groupes.getOrDefault(
                                a.getIdIntervention() + "|" + a.getPeriode(), List.of());
                        int n = versions.size();
                        String etatCourant = n == 0 ? a.getEtat() : versions.get(n - 1).getEtat();

                        for (int i = 0; i < n; i++) {
                            if (numLigne > MAX_LIGNES) { job.tronque = true; break boucle; }
                            BytelQualification q = versions.get(i);
                            Row r = sheet.createRow(numLigne++);
                            int col = 0;
                            texte(r, col++, q.getIdIntervention(), null);
                            texte(r, col++, q.getPeriode(), null);
                            texte(r, col++, (i + 1) + "/" + n + (i == n - 1 ? " (courante)" : ""), null);
                            texte(r, col++, etatCourant, null);
                            date(r, col++, q.getDateQualification(), st);
                            texte(r, col++, q.getEtat(), null);
                            texte(r, col++, sansPrefixe(q.getTypeQualification(), "Qualification"), null);
                            texte(r, col++, q.getTypeIntervention(), null);
                            texte(r, col++, q.getTypeRaccordement(), null);
                            texte(r, col++, q.getTypePrestation(), null);
                            montant(r, col++, q.getMontant(), st);
                            texte(r, col++, sansPrefixe(q.getEtapeType(), "Etape"), null);
                            texte(r, col++, q.getEtapeAvis(), null);
                            texte(r, col++, q.getEtapeActeur(), null);
                            texte(r, col++, q.getEtapeCommentaire(), null);

                            Map<String, Double> el = elementsDe(q);
                            double total = 0d;
                            col = premiereColonneDetail;
                            for (String nom : elements) {
                                Double v = el.get(nom);
                                if (v != null) { montant(r, col, v, st); total += v; }
                                col++;
                            }
                            montantGras(r, col++, el.isEmpty() ? null : total, st);
                            texte(r, col, q.getQualificationId(), null);
                        }
                        job.ecrites++;
                        apresId = Math.max(apresId, a.getId() == null ? apresId : a.getId());
                    }
                    if (ancres.size() < 500) break;
                }

                if (numLigne > 1) {
                    sheet.setAutoFilter(new CellRangeAddress(0, numLigne - 1, 0, entetes.size() - 1));
                }
                try (OutputStream out = Files.newOutputStream(fichier)) { wb.write(out); }
                wb.dispose();
            }

            job.fin = LocalDateTime.now();
            job.statut = "TERMINE";
        } catch (Throwable t) {
            job.erreur = t.getClass().getSimpleName() + " : " + t.getMessage();
            job.fin = LocalDateTime.now();
            job.statut = "ERREUR";
            supprimerFichier(job);
        }
    }

    /** Ajoute un commentaire a la chronologie d'un EPS, sans repeter le precedent. */
    private void ajouter(Map<String, List<String>> parEps, String eps,
                         String commentaire, boolean seulementDecisions) {
        if (eps == null || commentaire == null || commentaire.isBlank()) return;
        List<String> l = parEps.get(eps.toUpperCase());
        if (l == null) return;
        String c = commentaire.trim();
        if (seulementDecisions && sensDecision(c) == null) return;
        if (!l.isEmpty() && l.get(l.size() - 1).equals(c)) return;
        l.add(c);
    }

    private void executer(Job job, BytelRechercheService.Criteres c) {
        boolean versions = ONGLET_VERSIONS.equals(job.onglet);
        List<String> elements = c.qualif().isEmpty()
                ? ELEMENTS_TOUS
                : ELEMENTS_PAR_QUALIF.getOrDefault(c.qualif(), ELEMENTS_TOUS);

        try {
            job.total = recherche.compter(c);
            if (job.total > MAX_LIGNES) job.tronque = true;

            Path fichier = Files.createTempFile("bytel-export-", ".xlsx");
            job.fichier = fichier;
            job.nomFichier = "bytel_" + (versions ? "versions" : "interventions") + "_"
                    + BytelRechercheService.libellePeriode(c.periode()) + "_"
                    + LocalDateTime.now(PARIS).format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")) + ".xlsx";

            try (SXSSFWorkbook wb = new SXSSFWorkbook(200)) {
                wb.setCompressTempFiles(true);
                Styles st = new Styles(wb);
                SXSSFSheet sheet = wb.createSheet(versions ? "Versions" : "Interventions");

                List<String> entetes = new ArrayList<>(versions
                        ? List.of("EPS", "PERIODE", "DATE VERSION", "RANG", "ETAT", "QUALIFICATION",
                                  "TYPE INTERVENTION", "TYPE RACCORDEMENT", "TYPE PRESTATION", "MONTANT",
                                  "ETAPE", "AVIS", "ACTEUR", "COMMENTAIRE")
                        : List.of("EPS", "PERIODE", "DATE VERSION", "ETAT", "QUALIFICATION",
                                  "TYPE INTERVENTION", "TYPE RACCORDEMENT", "TYPE PRESTATION", "MONTANT",
                                  "ETAPE", "AVIS", "ACTEUR", "COMMENTAIRE",
                                  "DERNIERE ACTION KYNTUS", "DATE ACTION", "AUTEUR ACTION"));
                int premiereColonneDetail = entetes.size();
                entetes.addAll(elements);
                entetes.add("TOTAL DETAIL");
                if (versions) entetes.add("UUID");

                Row tete = sheet.createRow(0);
                for (int i = 0; i < entetes.size(); i++) {
                    Cell cell = tete.createCell(i);
                    cell.setCellValue(entetes.get(i));
                    cell.setCellStyle(st.entete);
                    sheet.setColumnWidth(i, largeur(entetes.get(i)));
                }
                sheet.createFreezePane(1, 1);

                int numLigne = 1;
                long apresId = 0L;
                boucle:
                while (true) {
                    List<BytelQualification> lot = recherche.lot(c, apresId, TAILLE_LOT);
                    if (lot.isEmpty()) break;

                    for (BytelQualification q : lot) {
                        if (numLigne > MAX_LIGNES) break boucle;
                        Row r = sheet.createRow(numLigne++);
                        int col = 0;

                        texte(r, col++, q.getIdIntervention(), null);
                        texte(r, col++, q.getPeriode(), null);
                        date(r, col++, q.getDateQualification(), st);
                        if (versions) {
                            texte(r, col++, Integer.valueOf(0).equals(q.getOrdreApi())
                                    ? "COURANTE" : "-" + q.getOrdreApi(), null);
                        }
                        texte(r, col++, q.getEtat(), null);
                        texte(r, col++, sansPrefixe(q.getTypeQualification(), "Qualification"), null);
                        texte(r, col++, q.getTypeIntervention(), null);
                        texte(r, col++, q.getTypeRaccordement(), null);
                        texte(r, col++, q.getTypePrestation(), null);
                        montant(r, col++, q.getMontant(), st);
                        texte(r, col++, sansPrefixe(q.getEtapeType(), "Etape"), null);
                        texte(r, col++, q.getEtapeAvis(), null);
                        texte(r, col++, q.getEtapeActeur(), null);
                        texte(r, col++, q.getEtapeCommentaire(), null);
                        if (!versions) {
                            texte(r, col++, q.getDerniereAction(), null);
                            dateLocale(r, col++, q.getDerniereActionAt(), st);
                            texte(r, col++, q.getDerniereActionAuteur(), null);
                        }

                        // Detail de facturation, designation par designation
                        Map<String, Double> el = elementsDe(q);
                        double total = 0d;
                        col = premiereColonneDetail;
                        for (String nom : elements) {
                            Double v = el.get(nom);
                            if (v != null) { montant(r, col, v, st); total += v; }
                            col++;
                        }
                        montantGras(r, col++, el.isEmpty() ? null : total, st);
                        if (versions) texte(r, col, q.getQualificationId(), null);

                        job.ecrites++;
                        apresId = Math.max(apresId, q.getId() == null ? apresId : q.getId());
                    }
                    if (lot.size() < TAILLE_LOT) break;
                }

                if (numLigne > 1) {
                    sheet.setAutoFilter(new CellRangeAddress(0, numLigne - 1, 0, entetes.size() - 1));
                }

                try (OutputStream out = Files.newOutputStream(fichier)) {
                    wb.write(out);
                }
                wb.dispose();
            }

            job.fin = LocalDateTime.now();
            job.statut = "TERMINE";
        } catch (Throwable t) {
            job.erreur = t.getClass().getSimpleName() + " : " + t.getMessage();
            job.fin = LocalDateTime.now();
            job.statut = "ERREUR";
            supprimerFichier(job);
        }
    }

    // ------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private Map<String, Double> elementsDe(BytelQualification q) {
        Map<String, Double> out = new LinkedHashMap<>();
        Map<String, Object> src = q.getQualifJson();
        if (src == null) return out;
        Object liste = src.get("elementsFacturationCalcule");
        if (!(liste instanceof List<?> l)) return out;
        for (Object o : l) {
            if (o instanceof Map<?, ?> e) {
                Object nom = e.get("designationElementFacturation");
                Object m = e.get("montant");
                if (nom != null) out.put(String.valueOf(nom), m instanceof Number n ? n.doubleValue() : 0d);
            }
        }
        return out;
    }

    private static String sansPrefixe(String v, String prefixe) {
        return v == null ? null : v.replace(prefixe, "");
    }

    private static int largeur(String entete) {
        return switch (entete) {
            case "EPS", "UUID" -> 18 * 256;
            case "COMMENTAIRE" -> 40 * 256;
            case "DATE VERSION", "DATE ACTION" -> 19 * 256;
            case "ETAT" -> 34 * 256;
            default -> Math.max(12, entete.length() + 3) * 256;
        };
    }

    private static void texte(Row r, int col, String v, CellStyle style) {
        if (v == null) return;
        Cell c = r.createCell(col);
        c.setCellValue(v);
        if (style != null) c.setCellStyle(style);
    }

    private static void montant(Row r, int col, Double v, Styles st) {
        if (v == null) return;
        Cell c = r.createCell(col);
        c.setCellValue(Math.round(v * 100.0) / 100.0);
        c.setCellStyle(st.montant);
    }

    private static void montantGras(Row r, int col, Double v, Styles st) {
        if (v == null) return;
        Cell c = r.createCell(col);
        c.setCellValue(Math.round(v * 100.0) / 100.0);
        c.setCellStyle(st.montantGras);
    }

    /** Date ISO en UTC (ex : 2026-07-11T02:43:08.961Z) convertie en heure de Paris. */
    private static void date(Row r, int col, String iso, Styles st) {
        if (iso == null || iso.isBlank()) return;
        try {
            LocalDateTime ldt = OffsetDateTime.parse(iso).atZoneSameInstant(PARIS).toLocalDateTime();
            Cell c = r.createCell(col);
            c.setCellValue(ldt);
            c.setCellStyle(st.date);
        } catch (Exception e) {
            texte(r, col, iso, null);
        }
    }

    private static void dateLocale(Row r, int col, LocalDateTime v, Styles st) {
        if (v == null) return;
        Cell c = r.createCell(col);
        c.setCellValue(v);
        c.setCellStyle(st.date);
    }

    private static final class Styles {
        final CellStyle entete, montant, montantGras, date;

        Styles(Workbook wb) {
            DataFormat df = wb.createDataFormat();

            Font gras = wb.createFont();
            gras.setBold(true);
            gras.setColor(IndexedColors.WHITE.getIndex());
            entete = wb.createCellStyle();
            entete.setFont(gras);
            entete.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
            entete.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            entete.setAlignment(HorizontalAlignment.CENTER);

            montant = wb.createCellStyle();
            montant.setDataFormat(df.getFormat("#,##0.00"));

            Font g = wb.createFont();
            g.setBold(true);
            montantGras = wb.createCellStyle();
            montantGras.setDataFormat(df.getFormat("#,##0.00"));
            montantGras.setFont(g);

            date = wb.createCellStyle();
            date.setDataFormat(df.getFormat("dd/mm/yyyy hh:mm:ss"));
        }
    }

    private void nettoyer() {
        LocalDateTime limite = LocalDateTime.now().minus(DUREE_CONSERVATION);
        jobs.entrySet().removeIf(e -> {
            Job j = e.getValue();
            boolean perime = !"EN_COURS".equals(j.statut) && j.debut.isBefore(limite);
            if (perime) supprimerFichier(j);
            return perime;
        });
    }

    private static void supprimerFichier(Job j) {
        try { if (j.fichier != null) Files.deleteIfExists(j.fichier); } catch (Exception ignored) { }
    }
}
