package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.dto.WorkflowTemplateDto;
import com.kyntus.Workflow.model.WorkflowTemplate;
import com.kyntus.Workflow.service.WorkflowTemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
// 🔥 THE CORS FIX: 7iydna "*" w zedna l-port dyal Next.js (3000) w allowCredentials 🔥
public class WorkflowTemplateController {

    private final WorkflowTemplateService templateService;

    public WorkflowTemplateController(WorkflowTemplateService templateService) {
        this.templateService = templateService;
    }

    // ========================================================================
    // GET: Kay-jib l-Missions dyal l-Pilote
    // ========================================================================
    @GetMapping
    public ResponseEntity<List<WorkflowTemplate>> getTemplates(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            // Sifet ghir l-Missions dyal had l-Pilote
            return ResponseEntity.ok(templateService.getTemplatesByUserId(userId));
        }
        // Sifet kolchi (Ila kan admin awla ma-khtar walo)
        return ResponseEntity.ok(templateService.getAllTemplates());
    }

    // ========================================================================
    // POST: L-Création dyal Template Jdid
    // ========================================================================
    @PostMapping
    public ResponseEntity<WorkflowTemplate> create(@RequestBody WorkflowTemplateDto dto) {
        return ResponseEntity.ok(templateService.createTemplate(dto));
    }
}