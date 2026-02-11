package com.kyntus.Workflow.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TerrainStatsDto {

    // Identity (X-Axis Logic in Frontend)
    private Long templateId;
    private String templateName;

    // Height (Y-Axis)
    private double totalTimeRemainingHours;

    // Depth (Z-Axis) - The Manual Complexity
    private int complexity; // 1 to 10

    // Volume & Texture
    private int activeTaskCount;
    private double riskFactor; // 0.0 (Green) to 1.0 (Red)
}