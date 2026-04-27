package com.kyntus.Workflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(
                        "http://localhost:3000",       // L'environnement d'Dev
                        "http://kyntusos.kyntus.fr",   // L'environnement Prod (HTTP)
                        "https://kyntusos.kyntus.fr",  // L'environnement Prod (HTTPS - Anticipation)
                        "http://kyntusos.kyntus.fr:3000" // 🔥 HNA 3AWTANI 🔥
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}