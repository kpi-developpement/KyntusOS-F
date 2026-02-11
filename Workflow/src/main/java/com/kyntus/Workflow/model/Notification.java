package com.kyntus.Workflow.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Notification {
    private String message;
    private String targetUsername; // "admin" ou "saad" ou "ALL"
    private String type; // "INFO", "SUCCESS", "ALERT"
}