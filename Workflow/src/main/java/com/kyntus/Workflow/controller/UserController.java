package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.Role;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Jib lia ghir les PILOTES (bach l'Admin ma yghletch w ya3ti tache l admin akhor)
    @GetMapping("/pilots")
    public List<User> getPilots() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.PILOT)
                .collect(Collectors.toList());
    }

    // Jib l-profil dyal User wahed (Bach l-Frontend y-qra les permissions w l-état)
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ========================================================================
    // 🔥 NOUVEAUX ENDPOINTS DE GESTION (ADMIN TOOLS) 🔥
    // ========================================================================

    // 1. Activer / Désactiver un compte (ON/OFF)
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            user.setActive(!user.isActive()); // Switch
            userRepository.save(user);
            return ResponseEntity.ok(Map.of(
                    "message", "Statut du compte mis à jour avec succès",
                    "active", user.isActive()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 2. Resetter le mot de passe (Sécurité > Affichage)
    @PatchMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String newPassword = payload.get("newPassword");

        if (newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Le nouveau mot de passe ne peut pas être vide"));
        }

        return userRepository.findById(id).map(user -> {
            // On hash le nouveau password bach l-code ybqa propre w sécurisé
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès"));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 3. Modifier les permissions (Accès aux modules)
    @PatchMapping("/{id}/permissions")
    public ResponseEntity<?> updatePermissions(@PathVariable Long id, @RequestBody Map<String, Boolean> newPermissions) {
        return userRepository.findById(id).map(user -> {
            user.setPermissions(newPermissions);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of(
                    "message", "Permissions mises à jour avec succès",
                    "permissions", user.getPermissions()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }
}