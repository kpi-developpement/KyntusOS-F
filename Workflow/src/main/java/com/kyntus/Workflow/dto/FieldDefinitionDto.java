package com.kyntus.Workflow.dto;

import lombok.Data;

@Data
public class FieldDefinitionDto {
    private String name; // ex: "Distance"
    private String type; // ex: "NUMBER"
    private boolean required;
}