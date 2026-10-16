package com.kyntus.Workflow.bytel.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.*;

/**
 * Lecture DIRECTE d'une page de l'API, sans passer par la base.
 *
 * L'API ne sait filtrer que par periode : passer idIntervention ou etat ne
 * change pas totalElements. En revanche elle pagine parfaitement, donc
 * afficher une page est aussi rapide que de l'ouvrir dans un navigateur.
 *
 * Chaque ligne renvoyee porte la version courante de l'EPS et, en prime,
 * toutes ses versions. La chronologie s'affiche donc sans aucun appel
 * supplementaire ni copie locale.
 */
@Service
public class BytelLiveService {

    private final ObjectMapper mapper;
    private final RestClient restClient;

    @Value("${bytel.dashboard.url:http://10.10.10.25:8117/api/dashboard/interventions}")
    private String dashboardUrl;

    public BytelLiveService(ObjectMapper mapper) {
        this.mapper = mapper;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofSeconds(8));
        f.setReadTimeout(Duration.ofSeconds(25));
        this.restClient = RestClient.builder().requestFactory(f).build();
    }

    /** Une page de l'API, mise en forme pour l'ecran. */
    public Map<String, Object> page(String periode, int page, int size) {
        String url = dashboardUrl + "?period=" + periode + "&size=" + size + "&page=" + page;

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("periode", periode);
        out.put("urlAppelee", url);
        out.put("mode", "DIRECT");

        long t0 = System.currentTimeMillis();

        // L'API source est souvent lente au tout premier acces sur une periode,
        // puis rapide ensuite. On reessaie plutot que de remonter une erreur.
        JsonNode root = null;
        String derniereErreur = null;
        int tentatives = 0;
        for (int essai = 1; essai <= 3 && root == null; essai++) {
            tentatives = essai;
            try {
                String body = restClient.get().uri(url).retrieve().body(String.class);
                root = mapper.readTree(body == null ? "{}" : body);
            } catch (Exception e) {
                derniereErreur = e.getClass().getSimpleName() + " : " + e.getMessage();
                if (essai < 3) {
                    try { Thread.sleep(1200L * essai); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        out.put("tentatives", tentatives);

        if (root == null) {
            out.put("content", List.of());
            out.put("currentPage", page);
            out.put("totalItems", 0);
            out.put("totalPages", 0);
            out.put("erreur", derniereErreur);
            out.put("reessayable", true);
            return out;
        }

        List<Map<String, Object>> lignes = new ArrayList<>();
        List<String> lignesIgnorees = new ArrayList<>();
        JsonNode content = root.path("content");
        if (content.isArray()) {
            for (JsonNode item : content) {
                try {
                    Map<String, Object> ligne = construireLigne(item, periode);
                    if (ligne != null) lignes.add(ligne);
                } catch (Exception e) {
                    // Une ligne malformee ne doit pas faire echouer la page entiere
                    lignesIgnorees.add(item.path("idIntervention").asText("?") + " : " + e.getMessage());
                }
            }
        }
        if (!lignesIgnorees.isEmpty()) out.put("lignesIgnorees", lignesIgnorees);

        out.put("content", lignes);
        out.put("currentPage", root.path("number").asInt(page));
        out.put("totalItems", root.path("totalElements").asLong(0));
        out.put("totalPages", root.path("totalPages").asInt(0));
        out.put("dureeMs", System.currentTimeMillis() - t0);
        return out;
    }

    /**
     * Une ligne = un EPS, avec sa version courante a plat et la liste
     * complete de ses versions.
     */
    private Map<String, Object> construireLigne(JsonNode item, String periodeDefaut) {
        String eps = item.path("idIntervention").asText(null);
        if (eps == null || eps.isBlank()) return null;

        JsonNode detail = mapper.createObjectNode();
        String brut = item.path("detail_intervention").asText("");
        if (brut != null && !brut.isBlank() && !"{}".equals(brut)) {
            try { detail = mapper.readTree(brut); } catch (Exception ignored) { }
        }

        Map<String, Object> l = new LinkedHashMap<>();
        l.put("idIntervention", eps);
        l.put("periode", item.path("periode").asText(periodeDefaut));
        l.put("environment", txt(item, "environment"));
        l.put("departement", txt(detail, "departement"));
        l.put("sousTraitant", txt(detail, "sousTraitant"));
        l.put("codeCloture", txt(detail, "codeCloture"));
        l.put("dateIntervention", txt(detail, "dateIntervention"));
        l.put("identifiantTechnicien", txt(detail, "identifiantTechnicien"));
        l.put("oi", txt(detail, "oi"));

        JsonNode qualifs = detail.path("qualificationInterventions");
        List<Map<String, Object>> versions = new ArrayList<>();
        int total = qualifs.isArray() ? qualifs.size() : 0;

        if (qualifs.isArray()) {
            int ordre = 0;
            for (JsonNode q : qualifs) {
                Map<String, Object> v = new LinkedHashMap<>();
                v.put("ordreApi", ordre);
                v.put("version", total - ordre);          // 1 = la plus ancienne
                v.put("courante", ordre == 0);
                v.put("qualificationId", txt(q, "identifiant"));
                v.put("dateQualification", txt(q, "date"));
                v.put("etat", txt(q, "etat"));
                v.put("typeQualification", txt(q, "_type"));
                v.put("typeIntervention", txt(q, "typeIntervention"));
                v.put("typeRaccordement", txt(q, "typeRaccordement"));
                v.put("typePrestation", txt(q, "typePrestation"));
                v.put("montant", q.path("coutIntervention").path("montant").isNumber()
                        ? q.path("coutIntervention").path("montant").asDouble() : null);

                JsonNode etape = q.path("etapeTraitementFacturation");
                v.put("etapeType", txt(etape, "_type"));
                v.put("etapeAvis", txt(etape, "avis"));
                v.put("etapeCommentaire", txt(etape, "commentaire"));
                v.put("etapeActeur", etape.path("acteur").path("login").asText(null));

                // Detail de facturation, designation par designation
                Map<String, Double> elements = new LinkedHashMap<>();
                JsonNode efc = q.path("elementsFacturationCalcule");
                if (efc.isArray()) {
                    for (JsonNode e : efc) {
                        String nom = txt(e, "designationElementFacturation");
                        if (nom == null) continue;
                        elements.put(nom, e.path("montant").isNumber() ? e.path("montant").asDouble() : 0d);
                    }
                }
                v.put("elements", elements);

                // Qualification brute : permet d'agir sans copie locale
                if (ordre == 0) {
                    v.put("brut", mapper.convertValue(q, Map.class));
                }
                versions.add(v);
                ordre++;
            }
        }

        l.put("nbVersions", total);
        l.put("versions", versions);

        // Version courante remontee a plat, pour l'affichage du tableau
        if (!versions.isEmpty()) {
            Map<String, Object> c = versions.get(0);
            l.put("qualificationId", c.get("qualificationId"));
            l.put("dateQualification", c.get("dateQualification"));
            l.put("etat", c.get("etat"));
            l.put("typeQualification", c.get("typeQualification"));
            l.put("typeIntervention", c.get("typeIntervention"));
            l.put("typeRaccordement", c.get("typeRaccordement"));
            l.put("typePrestation", c.get("typePrestation"));
            l.put("montant", c.get("montant"));
            l.put("etapeActeur", c.get("etapeActeur"));
            l.put("etapeAvis", c.get("etapeAvis"));
            l.put("etapeCommentaire", c.get("etapeCommentaire"));
            l.put("elements", c.get("elements"));
        }
        return l;
    }

    private String txt(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asText();
    }
}
