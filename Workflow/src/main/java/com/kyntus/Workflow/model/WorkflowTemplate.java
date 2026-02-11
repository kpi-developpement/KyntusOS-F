package com.kyntus.Workflow.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
public class WorkflowTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    @Column(columnDefinition = "int default 1")
    private int complexity = 1;

    // Fetch EAGER = Jib loulad m3ak dima
    @OneToMany(mappedBy = "workflowTemplate", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    @ToString.Exclude
    private List<FieldDefinition> fields = new ArrayList<>();

    // -- METHODE IMPORTANTE --
    public void addField(FieldDefinition field) {
        if (this.fields == null) {
            this.fields = new ArrayList<>();
        }
        this.fields.add(field);
        field.setWorkflowTemplate(this); // Liaison inverse
    }
}