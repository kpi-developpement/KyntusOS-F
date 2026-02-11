package com.kyntus.Workflow.controller;

import com.kyntus.Workflow.dto.WorkflowTemplateDto;
import com.kyntus.Workflow.model.WorkflowTemplate;
import com.kyntus.Workflow.service.WorkflowTemplateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
@CrossOrigin(origins = "http://localhost:3000")
public class WorkflowTemplateController {

    private final WorkflowTemplateService service;

    public WorkflowTemplateController(WorkflowTemplateService service) {
        this.service = service;
    }

    @GetMapping
    public List<WorkflowTemplate> getAll() {
        return service.getAllTemplates();
    }

    @PostMapping
    public ResponseEntity<WorkflowTemplate> create(@RequestBody WorkflowTemplateDto dto) {
        WorkflowTemplate created = service.createTemplate(dto);
        return ResponseEntity.ok(created);
    }
}