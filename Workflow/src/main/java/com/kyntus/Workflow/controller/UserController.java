package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.model.Role;
import com.kyntus.Workflow.model.User;
import com.kyntus.Workflow.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Jib lia ghir les PILOTES (bach l'Admin ma yghletch w ya3ti tache l admin akhor)
    @GetMapping("/pilots")
    public List<User> getPilots() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.PILOT)
                .collect(Collectors.toList());
    }
}