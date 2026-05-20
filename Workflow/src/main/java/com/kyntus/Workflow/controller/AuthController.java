package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.dto.RegisterRequestDto;
import com.kyntus.Workflow.model.Role;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Login Amélioré (Supporte les passwords hashés w li en clair)
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");

        User user = userRepository.findByUsername(username).orElse(null);

        if (user != null) {
            // 🛑 CHECK D'ACTIVATION: Wach l-Admin darlou OFF ?
            if (!user.isActive()) {
                return ResponseEntity.status(403).body(Map.of("error", "Ce compte a été désactivé par l'administrateur."));
            }

            // 🧠 LOGIQUE "RISK-FIRST": N-tchekiw wach l-password hashé (jdid) wla en clair (qdim)
            boolean isMatch = false;
            if (user.getPassword().startsWith("$2a$")) {
                // Hada password m-hashi b' BCrypt
                isMatch = passwordEncoder.matches(password, user.getPassword());
            } else {
                // Hada password en clair (Ancienne méthode)
                isMatch = user.getPassword().equals(password);
            }

            if (isMatch) {
                // L-Backend kay-sifet l-user kamel m3a dik l-JSONB dyal l-permissions
                return ResponseEntity.ok(user);
            }
        }

        return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects"));
    }

    // --- AJOUT UTILISATEUR (POUR ADMIN) ---
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequestDto request) {
        // 1. Vérifier si user existe déjà
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Erreur: Ce nom d'utilisateur existe déjà !"));
        }

        // 2. Création
        User newUser = new User();
        newUser.setUsername(request.getUsername());

        // ✅ UPDATE: N-sauviw l-password m-hashi direct pour la sécurité
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));

        newUser.setActive(true);
        newUser.setErrorCount(0);
        newUser.setManualPoints(0);

        // Initialisation dyal l-Permissions khawya (Bach ma-t3tich NullPointerException)
        newUser.setPermissions(new HashMap<>());

        // 3. Rôle
        try {
            newUser.setRole(Role.valueOf(request.getRole().toUpperCase()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Rôle invalide (Doit être ADMIN ou PILOT)"));
        }

        userRepository.save(newUser);
        return ResponseEntity.ok(Map.of("message", "Utilisateur créé avec succès !"));
    }
}