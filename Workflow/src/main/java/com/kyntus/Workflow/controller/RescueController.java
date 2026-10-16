package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.model.Role;
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/rescue")
public class RescueController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RescueController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/admin")
    public String createRescueAdmin() {
        try {
            Optional<User> existingAdmin = userRepository.findByUsername("elabdi");
            if (existingAdmin.isPresent()) {
                // 🔥 L-FIX HNA: Ila lqa l-admin deja kayn, y-forci y-red lih l-mdp "admin123"
                User admin = existingAdmin.get();
                admin.setPassword(passwordEncoder.encode("admin123"));
                userRepository.save(admin);
                return "⚠️ ADMIN 'elabdi' EXISTE DÉJÀ ! Son mot de passe a été réinitialisé à 'admin123' ! ✅";
            }

            User admin = new User();
            admin.setUsername("elabdi");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(Role.ADMIN);
            admin.setActive(true);

            userRepository.save(admin);
            return "✅ SUCCÈS: Admin 'elabdi' créé avec mot de passe 'admin123'";

        } catch (Exception e) {
            return "❌ ERREUR: " + e.getMessage();
        }
    }

    @GetMapping("/pilot")
    public String createRescuePilot() {
        try {
            Optional<User> existingPilot = userRepository.findByUsername("saad");
            if (existingPilot.isPresent()) {
                User pilot = existingPilot.get();
                pilot.setPassword(passwordEncoder.encode("pilot123"));
                userRepository.save(pilot);
                return "⚠️ PILOTE 'saad' EXISTE DÉJÀ ! Son mot de passe a été réinitialisé à 'pilot123' ! ✅";
            }

            User pilot = new User();
            pilot.setUsername("saad");
            pilot.setPassword(passwordEncoder.encode("pilot123"));
            pilot.setRole(Role.PILOT);
            pilot.setActive(true);

            userRepository.save(pilot);
            return "✅ SUCCÈS: Pilote 'saad' créé avec mot de passe 'pilot123'";

        } catch (Exception e) {
            return "❌ ERREUR: " + e.getMessage();
        }
    }
}