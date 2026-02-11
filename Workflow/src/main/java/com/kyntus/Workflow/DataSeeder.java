package com.kyntus.Workflow;

import com.kyntus.Workflow.model.Role;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;

    // Ma b9inach ma7tajin TaskRepository wla TemplateRepository hit hadchi prod
    public DataSeeder(UserRepository userRepo) {
        this.userRepository = userRepo;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Safety Check: Hada dima khasso yb9a
        // Hit dayer "update", ila lga users deja kaynine, maghadi ydir walou
        if (userRepository.count() > 0) {
            System.out.println("⚠️ DB déjà initialisée. Skipping Seeder.");
            return;
        }

        System.out.println("🚀 INITIALISATION PRODUCTION (Mode Clean)...");

        // 1. LE GRAND ADMIN (Master Account)
        // Hada howa li ghadi t-connecta bih bach t-créer les autres
        createUser("elabdi", "admin123", Role.ADMIN);
        System.out.println("✅ Compte Admin Crée : elabdi / admin123");

        // 2. LE PREMIER PILOTE (Juste pour tester ou commencer)
        createUser("pilote", "pilote123", Role.PILOT);
        System.out.println("✅ Compte Pilote Crée : pilote / pilote123");

        System.out.println("🏁 SYSTEM READY. Database initialisée avec succès.");
    }

    // --- Helper Simple ---
    private void createUser(String username, String password, Role role) {
        User u = new User();
        u.setUsername(username);
        u.setPassword(password);
        u.setRole(role);
        u.setActive(true);
        u.setErrorCount(0);
        u.setManualPoints(0);
        userRepository.save(u);
    }
}