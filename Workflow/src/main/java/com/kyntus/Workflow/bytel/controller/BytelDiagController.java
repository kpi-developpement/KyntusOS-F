package com.kyntus.Workflow.bytel.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Diagnostic de la liaison vers l'API dashboard.
 * Fichier additif : ne modifie rien.
 * A appeler depuis le navigateur : /api/bytel/diag
 */
@RestController
@RequestMapping("/api/bytel")
public class BytelDiagController {

    @Value("${bytel.dashboard.url:http://10.10.10.25:8117/api/dashboard/interventions}")
    private String dashboardUrl;

    @GetMapping("/diag")
    public ResponseEntity<Map<String, Object>> diag(
            @RequestParam(defaultValue = "2026_M01") String period,
            @RequestParam(defaultValue = "1") int size) {

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("urlConfiguree", dashboardUrl);

        // 1) Resolution hote + port
        String host = null;
        int port = -1;
        try {
            URI u = URI.create(dashboardUrl);
            host = u.getHost();
            port = u.getPort() > 0 ? u.getPort() : ("https".equals(u.getScheme()) ? 443 : 80);
            out.put("hote", host);
            out.put("port", port);
        } catch (Exception e) {
            out.put("etape1_url", "URL INVALIDE : " + e.getMessage());
            return ResponseEntity.ok(out);
        }

        // 2) Ouverture TCP brute : distingue "reseau bloque" de "erreur applicative"
        long t0 = System.currentTimeMillis();
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(host, port), 5000);
            out.put("etape2_tcp", "OK en " + (System.currentTimeMillis() - t0) + " ms");
        } catch (Exception e) {
            out.put("etape2_tcp", "ECHEC : " + e.getClass().getSimpleName() + " - " + e.getMessage());
            out.put("conclusion", "La machine qui fait tourner le backend n'atteint pas " + host + ":" + port
                    + ". Causes habituelles : backend dans un conteneur Docker sans acces a ce reseau, "
                    + "pare-feu, ou VPN non monte.");
            return ResponseEntity.ok(out);
        }

        // 3) Appel HTTP reel
        String url = dashboardUrl + "?period=" + period + "&size=" + size + "&page=0";
        out.put("urlTestee", url);
        try {
            RestClient rc = RestClient.builder().build();
            var rep = rc.get().uri(url).retrieve().toEntity(String.class);

            String body = rep.getBody() == null ? "" : rep.getBody();
            out.put("etape3_http", "HTTP " + rep.getStatusCode().value());
            out.put("tailleReponse", body.length());
            out.put("debutReponse", body.length() > 600 ? body.substring(0, 600) + "..." : body);
            out.put("conclusion", rep.getStatusCode().is2xxSuccessful()
                    ? "Liaison fonctionnelle. Si la synchronisation reste vide, verifiez la periode demandee."
                    : "Le serveur repond mais refuse la requete. Verifiez si une authentification est requise.");
        } catch (Exception e) {
            out.put("etape3_http", "ECHEC : " + e.getClass().getSimpleName() + " - " + e.getMessage());
            out.put("conclusion", "Le port est ouvert mais l'appel HTTP echoue. "
                    + "Verifiez le chemin de l'URL et si l'API exige une authentification.");
        }

        return ResponseEntity.ok(out);
    }
}
