package com.kyntus.Workflow.config;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer {

    @PostConstruct
    public void initDatabase() {
        // 🔥 THE FIX: 7iydna l-CREATE TABLE manuel mn hna.
        // Hibernate (ddl-auto=update) kay-t-kellef b' VentilationData bo7do.
        // Mlli kenti kat-dir CREATE TABLE hna w Hibernate kay-dirha f nefs l-weqt,
        // kan kay-w9e3 DEADLOCK w l-backend kay-frizzi bla erreur.
        System.out.println("✅ [SYSTEM ALERTS] Initialisation de la base de données déléguée à Hibernate (Anti-Deadlock activé).");
    }
}