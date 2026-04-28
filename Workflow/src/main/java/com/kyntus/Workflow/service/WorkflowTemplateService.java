package com.kyntus.Workflow.service;

import com.kyntus.Workflow.dto.FieldDefinitionDto;
import com.kyntus.Workflow.dto.WorkflowTemplateDto;
import com.kyntus.Workflow.model.FieldDefinition;
import com.kyntus.Workflow.model.WorkflowTemplate;
import com.kyntus.Workflow.repository.WorkflowTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class WorkflowTemplateService {

    private final WorkflowTemplateRepository repository;

    public WorkflowTemplateService(WorkflowTemplateRepository repository) {
        this.repository = repository;
    }

    public List<WorkflowTemplate> getAllTemplates() {
        return repository.findAll();
    }

    // 🔥 THE FIX: N-khedmou b' Methode li kat-jib Global + Private
    public List<WorkflowTemplate> getTemplatesByUserId(Long userId) {
        return repository.findByUserIdOrGlobal(userId);
    }

    @Transactional
    public WorkflowTemplate createTemplate(WorkflowTemplateDto dto) {
        WorkflowTemplate template = new WorkflowTemplate();
        template.setName(dto.getName());
        template.setDescription(dto.getDescription());
        template.setComplexity(dto.getComplexity() > 0 ? dto.getComplexity() : 1);
        template.setFields(new ArrayList<>());

        // Ila bghiti tsawb mission l-chi pilote b-dbt (Optionnel)
        // template.setUserId(dto.getUserId());

        if (dto.getFields() != null) {
            for (FieldDefinitionDto fieldDto : dto.getFields()) {
                FieldDefinition field = new FieldDefinition();
                field.setName(fieldDto.getName());
                field.setType(fieldDto.getType());
                field.setRequired(fieldDto.isRequired());
                template.addField(field);
            }
        }
        return repository.save(template);
    }
}