package com.kyntus.Workflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 🔥 L-FIX 1: Kan-forciw Spring Security y-kheddem CORS 9bel ma y-bloki
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 🔥 L-FIX 2: Le Pass VIP l'ga3 les requêtes OPTIONS (Preflight)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // L'accès l'login w l'inscription sans token
                        .requestMatchers("/api/auth/**").permitAll()
                        // N-khelliw l'Websocket y-douz ila knti khddam bih
                        .requestMatchers("/ws/**").permitAll()
                        // Ay 7aja okhra khassha token
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    // 🔥 L-FIX 3: L'Configuration Centrale dyal CORS west Security
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
                "http://localhost:3000",
                "http://kyntusos.kyntus.fr",
                "https://kyntusos.kyntus.fr"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}