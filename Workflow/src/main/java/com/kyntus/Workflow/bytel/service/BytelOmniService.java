package com.kyntus.Workflow.bytel.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.*;
import java.util.concurrent.*;

/**
 * Omni Search : equivalent de l'Omni Search de Terrain Records, mais lu
 * DIRECTEMENT dans l'API, toutes periodes confondues, sans synchronisation.
 *
 * Chaque EPS demande est cherche dans l'API ; chaque correspondance (une par
 * periode ou l'EPS existe) revient avec toutes ses versions.
 */
@Service
public class BytelOmniService {

    /** Garde-fou : chaque EPS coute un appel a l'API. */
    public static final int MAX_EPS = 500;
    private static final int PARALLELISME = 6;

    private final BytelLiveService live;

    public BytelOmniService(BytelLiveService live) {
        this.live = live;
    }

    public Map<String, Object> rechercher(List<String> demandes) {
        long t0 = System.currentTimeMillis();
        List<String> eps = demandes.size() > MAX_EPS ? demandes.subList(0, MAX_EPS) : demandes;

        Map<String, List<Map<String, Object>>> parEps = new ConcurrentHashMap<>();
        Map<String, String> erreurs = new ConcurrentHashMap<>();

        ExecutorService pool = Executors.newFixedThreadPool(Math.min(PARALLELISME, Math.max(1, eps.size())));
        try {
            List<Future<?>> taches = new ArrayList<>();
            for (String e : eps) {
                taches.add(pool.submit(() -> {
                    try {
                        parEps.put(e, live.chercherEps(e));
                    } catch (Exception ex) {
                        erreurs.put(e, ex.getClass().getSimpleName() + " : " + ex.getMessage());
                    }
                }));
            }
            for (Future<?> f : taches) {
                try { f.get(90, TimeUnit.SECONDS); } catch (Exception ignored) { }
            }
        } finally {
            pool.shutdownNow();
        }

        // Ordre de saisie conserve, periodes de la plus recente a la plus ancienne
        List<Map<String, Object>> contenu = new ArrayList<>();
        List<String> introuvables = new ArrayList<>();
        for (String e : eps) {
            List<Map<String, Object>> l = parEps.get(e);
            if (l == null || l.isEmpty()) {
                if (!erreurs.containsKey(e)) introuvables.add(e);
                continue;
            }
            List<Map<String, Object>> tri = new ArrayList<>(l);
            tri.sort((a, b) -> String.valueOf(b.get("periode")).compareTo(String.valueOf(a.get("periode"))));
            contenu.addAll(tri);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("content", contenu);
        out.put("demandes", demandes.size());
        out.put("traites", eps.size());
        out.put("tronque", demandes.size() > MAX_EPS);
        out.put("introuvables", introuvables);
        out.put("erreurs", erreurs);
        out.put("dureeMs", System.currentTimeMillis() - t0);
        return out;
    }

    private static final String[] ENTETES = {
            "EPS", "PERIODE", "VERSION", "COURANTE", "DATE QUALIFICATION", "ETAT", "QUALIFICATION",
            "TYPE INTERVENTION", "TYPE RACCORDEMENT", "MONTANT", "ETAPE", "AVIS", "ACTEUR", "COMMENTAIRE",
            "DEPARTEMENT", "SOUS-TRAITANT", "CODE CLOTURE", "DATE INTERVENTION"
    };

    /** Une ligne par version, de la plus ancienne a la plus recente, pour chaque EPS / periode. */
    @SuppressWarnings("unchecked")
    public byte[] excel(List<Map<String, Object>> lignes) throws Exception {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sh = wb.createSheet("Omni Search API");

            CellStyle entete = wb.createCellStyle();
            Font gras = wb.createFont();
            gras.setBold(true);
            gras.setColor(IndexedColors.WHITE.getIndex());
            entete.setFont(gras);
            entete.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            entete.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            CellStyle courante = wb.createCellStyle();
            courante.setFillForegroundColor(IndexedColors.LIGHT_GREEN.getIndex());
            courante.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row h = sh.createRow(0);
            for (int i = 0; i < ENTETES.length; i++) {
                Cell c = h.createCell(i);
                c.setCellValue(ENTETES[i]);
                c.setCellStyle(entete);
            }

            int r = 1;
            for (Map<String, Object> l : lignes) {
                List<Map<String, Object>> versions = new ArrayList<>(
                        (List<Map<String, Object>>) l.getOrDefault("versions", List.of()));
                int total = versions.size();
                Collections.reverse(versions); // l'API renvoie la plus recente en premier
                for (Map<String, Object> v : versions) {
                    Row row = sh.createRow(r++);
                    boolean estCourante = Boolean.TRUE.equals(v.get("courante"));
                    Object[] vals = {
                            l.get("idIntervention"), l.get("periode"),
                            v.get("version") + "/" + total, estCourante ? "OUI" : "",
                            v.get("dateQualification"), v.get("etat"),
                            str(v.get("typeQualification")).replace("Qualification", ""),
                            v.get("typeIntervention"), v.get("typeRaccordement"), v.get("montant"),
                            str(v.get("etapeType")).replace("Etape", ""), v.get("etapeAvis"),
                            v.get("etapeActeur"), v.get("etapeCommentaire"),
                            l.get("departement"), l.get("sousTraitant"), l.get("codeCloture"), l.get("dateIntervention")
                    };
                    for (int i = 0; i < vals.length; i++) {
                        Cell c = row.createCell(i);
                        Object o = vals[i];
                        if (o instanceof Number n) c.setCellValue(n.doubleValue());
                        else c.setCellValue(o == null ? "" : String.valueOf(o));
                        if (estCourante) c.setCellStyle(courante);
                    }
                }
            }
            sh.createFreezePane(0, 1);
            sh.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, Math.max(0, r - 1), 0, ENTETES.length - 1));
            for (int i = 0; i < ENTETES.length; i++) sh.setColumnWidth(i, i == 13 ? 60 * 256 : 20 * 256);

            wb.write(out);
            return out.toByteArray();
        }
    }

    private static String str(Object o) { return o == null ? "" : String.valueOf(o); }
}
