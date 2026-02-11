package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.dto.RegisterRequestDto;
import com.kyntus.Workflow.model.Role;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Login Simple
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String password = payload.get("password");

        User user = userRepository.findByUsername(username)
                .orElse(null);

        if (user != null && user.getPassword().equals(password)) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.status(401).body("Identifiants incorrects");
        }
    }

    // --- NEW: AJOUT UTILISATEUR (POUR ADMIN) ---
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequestDto request) {
        // 1. Vérifier si user existe déjà
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Erreur: Ce nom d'utilisateur existe déjà !");
        }

        // 2. Création
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(request.getPassword()); // En clair pour l'instant (Simple)
        newUser.setActive(true);
        newUser.setErrorCount(0);
        newUser.setManualPoints(0);

        // 3. Rôle
        try {
            newUser.setRole(Role.valueOf(request.getRole().toUpperCase()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Rôle invalide (Doit être ADMIN ou PILOT)");
        }

        userRepository.save(newUser);
        return ResponseEntity.ok("Utilisateur créé avec succès !");
    }
}