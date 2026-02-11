package com.kyntus.Workflow.dto;

import lombok.Data;

@Data
public class RegisterRequestDto {
    private String username;
    private String password;
    private String role; // "ADMIN" ou "PILOT"
}