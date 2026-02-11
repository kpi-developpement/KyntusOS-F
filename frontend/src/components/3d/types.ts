export interface TerrainData {
  templateId: number;
  templateName: string;
  totalTimeRemainingHours: number; // Y-Axis (Elevation)
  complexity: number;              // Z-Axis (Depth)
  activeTaskCount: number;         // Width (Volume)
  riskFactor: number;              // Color (0 to 1)
}