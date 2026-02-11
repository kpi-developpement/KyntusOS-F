"use client";

import { Text, Line } from "@react-three/drei";

export function Axes({ width = 10, height = 5 }) {
  // Les niveaux de pourcentage (0%, 25%, 50%, 75%, 100%)
  const ticks = [0, 25, 50, 75, 100];

  return (
    <group position={[-width / 2 - 1, 0, 0]}>
      {/* 1. AXE Y (VERTICAL) */}
      <Line 
        points={[[0, 0, 0], [0, height + 0.5, 0]]} 
        color="#444" 
        lineWidth={2} 
      />

      {/* 2. TICKS & LABELS Y */}
      {ticks.map((tick) => {
        const yPos = (tick / 100) * height; // Mapping 0-100% vers 0-5 unités
        return (
          <group key={tick} position={[0, yPos, 0]}>
            {/* Petit trait */}
            <Line points={[[-0.2, 0, 0], [0, 0, 0]]} color="#666" lineWidth={1} />
            
            {/* Ligne Guide Horizontale (Grid Line) */}
            <Line 
                points={[[0, 0, 0], [width + 2, 0, 0]]} 
                color="#222" 
                lineWidth={0.5} 
                dashed 
                dashScale={2}
                dashSize={0.2}
            />

            {/* Label % */}
            <Text
              position={[-0.5, 0, 0]}
              fontSize={0.25}
              color="#888"
              anchorX="right"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
            >
              {tick}%
            </Text>
          </group>
        );
      })}

      {/* 3. AXE X (HORIZONTAL) */}
      <Line 
        points={[[0, 0, 0], [width + 2, 0, 0]]} 
        color="#444" 
        lineWidth={2} 
      />
      <Text
          position={[width + 2.5, 0, 0]}
          fontSize={0.25}
          color="#888"
          anchorX="left"
          anchorY="middle"
      >
          PROJECTS \u2192
      </Text>
    </group>
  );
}