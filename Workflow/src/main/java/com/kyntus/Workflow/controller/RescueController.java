package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.model.Role; // ✅ ZID HADI (Import l-Enum)
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
            if (userRepository.findByUsername("elabdi").isPresent()) {
                return "⚠️ ADMIN 'elabdi' EXISTE DÉJÀ !";
            }

            User admin = new User();
            admin.setUsername("elabdi");
            admin.setPassword(passwordEncoder.encode("admin123"));

            // ❌ Ghalat: admin.setRole("ADMIN");
            // ✅ S7i7: Sta3mel l-Enum direct
            admin.setRole(Role.ADMIN);

            userRepository.save(admin);
            return "✅ SUCCÈS: Admin 'elabdi' créé";

        } catch (Exception e) {
            return "❌ ERREUR: " + e.getMessage();
        }
    }

    @GetMapping("/pilot")
    public String createRescuePilot() {
        try {
            if (userRepository.findByUsername("saad").isPresent()) {
                return "⚠️ PILOTE 'saad' EXISTE DÉJÀ !";
            }

            User pilot = new User();
            pilot.setUsername("saad");
            pilot.setPassword(passwordEncoder.encode("pilot123"));

            // ❌ Ghalat: pilot.setRole("PILOT");
            // ✅ S7i7: Sta3mel l-Enum direct
            pilot.setRole(Role.PILOT);

            userRepository.save(pilot);
            return "✅ SUCCÈS: Pilote 'saad' créé";

        } catch (Exception e) {
            return "❌ ERREUR: " + e.getMessage();
        }
    }
}