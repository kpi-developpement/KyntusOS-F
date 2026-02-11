package com.kyntus.Workflow.model;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore; // Bach ma ndkhlouch f boucle infinie

@Entity
@Data
@Table(name = "field_definitions")
public class FieldDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name; // Ex: "Distance", "Anomalie"
    private String type; // Ex: "TEXT", "NUMBER", "SELECT"
    private boolean required = false;

    // Liaison: Had l'champ tabe3 l ina Template?
    @ManyToOne
    @JoinColumn(name = "template_id")
    @JsonIgnore // Bach ma tbuggich l'JSON
    private WorkflowTemplate workflowTemplate;
}