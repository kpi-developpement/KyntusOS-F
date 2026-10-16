package com.kyntus.Workflow.bytel.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.*;

/**
 * Cherche une liste d'EPS DIRECTEMENT dans l'API source, periode par periode.
 *
 * L'API ne sait pas filtrer par identifiant : il faut parcourir ses pages.
 * Le faire a la main dans un navigateur demanderait d'ouvrir des centaines de
 * pages ; cet endpoint les parcourt cote serveur et repond en une fois.
 *
 * Lecture seule : rien n'est ecrit en base.
 */
@RestController
@RequestMapping("/api/bytel")
public class BytelLocaliserController {

    private final ObjectMapper mapper;
    private final RestClient restClient;

    @Value("${bytel.dashboard.url:http://10.10.10.25:8117/api/dashboard/interventions}")
    private String dashboardUrl;

    @Value("${bytel.dashboard.page-size:500}")
    private int pageSize;

    public BytelLocaliserController(ObjectMapper mapper) {
        this.mapper = mapper;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofSeconds(10));
        f.setReadTimeout(Duration.ofSeconds(60));
        this.restClient = RestClient.builder().requestFactory(f).build();
    }

    public record LocaliserRequest(List<String> epsList, String eps, List<String> periodes) {}

    /**
     * @return pour chaque EPS trouve, la periode qui le contient ;
     *         et la liste de ceux qui n'existent nulle part.
     */
    @PostMapping("/localiser")
    public ResponseEntity<Map<String, Object>> localiser(@RequestBody LocaliserRequest req) {
        Map<String, Object> out = new LinkedHashMap<>();

        // Liste des EPS a trouver
        LinkedHashSet<String> cherches = new LinkedHashSet<>();
        if (req.epsList() != null) {
            for (String e : req.epsList()) ajouterTokens(cherches, e);
        }
        ajouterTokens(cherches, req.eps());

        if (cherches.isEmpty()) {
            out.put("erreur", "Aucun EPS fourni.");
            return ResponseEntity.ok(out);
        }

        // Periodes a explorer : celles demandees, sinon les douze mois de l'annee en cours
        List<String> periodes = (req.periodes() != null && !req.periodes().isEmpty())
                ? req.periodes()
                : periodesParDefaut();

        Set<String> restants = new LinkedHashSet<>(cherches);
        Map<String, String> trouves = new LinkedHashMap<>();
        Map<String, Object> parcours = new LinkedHashMap<>();
        long t0 = System.currentTimeMillis();

        for (String periode : periodes) {
            if (restants.isEmpty()) break;

            int page = 0, totalPages = 1, lus = 0, trouvesIci = 0;
            String note = null;

            while (page < totalPages && page < 2000 && !restants.isEmpty()) {
                String url = dashboardUrl + "?period=" + periode + "&size=" + pageSize + "&page=" + page;
                JsonNode root;
                try {
                    String body = restClient.get().uri(url).retrieve().body(String.class);
                    root = mapper.readTree(body == null ? "{}" : body);
                } catch (Exception e) {
                    note = "lecture interrompue page " + page + " : " + e.getMessage();
                    break;
                }

                if (page == 0) totalPages = root.path("totalPages").asInt(1);

                JsonNode content = root.path("content");
                if (!content.isArray() || content.isEmpty()) break;

                for (JsonNode item : content) {
                    lus++;
                    String id = item.path("idIntervention").asText("");
                    if (id.isEmpty()) continue;
                    String maj = id.toUpperCase();
                    if (restants.remove(maj)) {
                        trouves.put(maj, item.path("periode").asText(periode));
                        trouvesIci++;
                    }
                }
                page++;
            }

            Map<String, Object> bilan = new LinkedHashMap<>();
            bilan.put("pagesLues", page);
            bilan.put("pagesTotal", totalPages);
            bilan.put("interventionsParcourues", lus);
            bilan.put("trouvesIci", trouvesIci);
            if (note != null) bilan.put("note", note);
            parcours.put(periode, bilan);
        }

        out.put("demandes", cherches.size());
        out.put("trouves", trouves.size());
        out.put("introuvables", new ArrayList<>(restants));
        out.put("parPeriode", repartition(trouves));
        out.put("detail", trouves);
        out.put("periodesExplorees", parcours);
        out.put("dureeSecondes", (System.currentTimeMillis() - t0) / 1000);
        return ResponseEntity.ok(out);
    }

    private Map<String, Integer> repartition(Map<String, String> trouves) {
        Map<String, Integer> r = new TreeMap<>();
        for (String p : trouves.values()) r.merge(p, 1, Integer::sum);
        return r;
    }

    private void ajouterTokens(Set<String> cible, String brut) {
        if (brut == null || brut.isBlank()) return;
        for (String t : brut.split("[\\s,;|]+")) {
            String v = t.trim().replace("\"", "").replace("'", "").toUpperCase();
            if (!v.isEmpty()) cible.add(v);
        }
    }

    private List<String> periodesParDefaut() {
        int annee = java.time.LocalDate.now().getYear();
        List<String> l = new ArrayList<>();
        for (int m = 12; m >= 1; m--) l.add(annee + "_M" + String.format("%02d", m));
        for (int m = 12; m >= 1; m--) l.add((annee - 1) + "_M" + String.format("%02d", m));
        return l;
    }
}
