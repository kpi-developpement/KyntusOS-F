package com.kyntus.Workflow.dto;

import lombok.Data;
import java.util.List;

@Data
public class WorkflowTemplateDto {
    private String name;
    private String description;
    private int complexity; // New Field (1-10)
    private List<FieldDefinitionDto> fields;
}