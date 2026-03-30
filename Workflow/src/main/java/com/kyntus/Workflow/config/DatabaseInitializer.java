package com.kyntus.Workflow.config; // Awla dir l-package li mwalef kat-khdem fih

import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 🚀 Hada kay-demarri awtomatikiyn m3a Spring Boot.
     * Kay-t2kked wach l-Table kayna, ila makaynach kay-khleqha!
     */
    @PostConstruct
    public void initDatabase() {
        try {
            String sql = "CREATE TABLE IF NOT EXISTS ventilation_data (" +
                    "id SERIAL PRIMARY KEY, " +
                    "annee INT NOT NULL, " +
                    "mois INT NOT NULL, " +
                    "json_data TEXT" +
                    ")";

            jdbcTemplate.execute(sql);
            System.out.println("✅ [SYSTEM ALERTS] Table 'ventilation_data' vérifiée/créée avec succès !");

        } catch (Exception e) {
            System.err.println("❌ [SYSTEM ALERTS] Erreur lors de la création de la table : " + e.getMessage());
        }
    }
}