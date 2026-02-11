package com.kyntus.Workflow.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@Table(name = "batches")
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Smiyet l fichier Excel lli t'importa (Ex: "Analyse_Janvier.xlsx")
    private String fileName;

    private LocalDateTime importedAt = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "imported_by")
    private User importedBy;

    // Total d les lignes f had l'import
    private int totalRecords;
}