"use client";

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Edges, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { TerrainData } from './types';

interface DataTerrainProps {
  data: TerrainData[];
  onHover: (data: TerrainData | null) => void;
}

// CONFIGURATION (Design Control)
const SPACING_X = 10; // Tba3oud kbir bin les templates
const MAX_LOAD_HOURS = 100; 
const HEIGHT_SCALE = 0.3; 
const MAX_VISUAL_HEIGHT = MAX_LOAD_HOURS * HEIGHT_SCALE;

// GENERATEUR DE COULEUR DETERMINISTE (Stable par ID)
const getTemplateColor = (id: number) => {
  const hue = (id * 265.4) % 360; 
  return `hsl(${hue}, 85%, 60%)`;
};

// --- AXIS GIZMO (X, Y, Z Indicators) ---
const WorldGizmo = () => (
    <group position={[-12, 0, 10]}>
        {/* X: TEMPLATES */}
        <mesh position={[5, 0.2, 0]}>
            <boxGeometry args={[10, 0.1, 0.1]} />
            <meshBasicMaterial color="#ff2d55" />
        </mesh>
        <Billboard position={[12, 1, 0]}>
            <Text fontSize={1} color="#ff2d55" fontWeight="bold">X: PROJETS</Text>
        </Billboard>

        {/* Y: TIME */}
        <mesh position={[0, 6, 0]}>
            <boxGeometry args={[0.1, 12, 0.1]} />
            <meshBasicMaterial color="#39ff14" />
        </mesh>
        <Billboard position={[0, 13, 0]}>
            <Text fontSize={1} color="#39ff14" fontWeight="bold">Y: TEMPS</Text>
        </Billboard>

        {/* Z: COMPLEXITY */}
        <mesh position={[0, 0.2, -6]}>
            <boxGeometry args={[0.1, 0.1, 12]} />
            <meshBasicMaterial color="#00f2ea" />
        </mesh>
        <Billboard position={[0, 1, -13]}>
            <Text fontSize={1} color="#00f2ea" fontWeight="bold">Z: COMPLEXITÉ</Text>
        </Billboard>
    </group>
);

// --- HOLO RULER (Y-Axis Percentage) ---
const AxisGrid = () => {
  const levels = [0.25, 0.50, 0.75, 1.0]; // 25% -> 100%

  return (
    <group position={[-8, 0, 0]}> 
      {/* Poteau Vertical */}
      <mesh position={[0, MAX_VISUAL_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.1, MAX_VISUAL_HEIGHT, 0.1]} />
        <meshStandardMaterial color="#666" />
      </mesh>

      {/* Lignes de Niveau */}
      {levels.map((lvl) => {
        const yPos = MAX_VISUAL_HEIGHT * lvl;
        return (
          <group key={lvl} position={[0, yPos, 0]}>
            {/* Laser Beam */}
            <mesh position={[60, 0, 0]}>
               <boxGeometry args={[140, 0.05, 0.05]} />
               <meshBasicMaterial color="rgba(0, 242, 234, 0.2)" transparent opacity={0.3} />
            </mesh>
            {/* Pourcentage Text */}
            <Billboard position={[-4, 0, 0]}>
              <Text fontSize={1.2} color="#00f2ea" fontWeight="900">
                {lvl * 100}%
              </Text>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
};

// --- LE MONOLITHE DE DONNÉES ---
const StrategicBar = ({ item, index, totalItems, onHover }: { item: TerrainData, index: number, totalItems: number, onHover: any }) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);

  // 1. POSITION X (Ecartement)
  const positionX = (index - totalItems / 2) * SPACING_X;

  // 2. HAUTEUR Y (Temps)
  const height = Math.max(0.5, Math.min(item.totalTimeRemainingHours * HEIGHT_SCALE, MAX_VISUAL_HEIGHT)); 
  
  // 3. PROFONDEUR Z (Complexité - VRAI CONTRASTE)
  // Level 1 = 0.5 (R9i9 bzaf)
  // Level 10 = 8.0 (Ghlid bzaf)
  const depth = Math.max(0.5, item.complexity * 0.8); 

  // 4. LARGEUR (Fixe)
  const width = 3;

  // Couleur
  const color = useMemo(() => getTemplateColor(item.templateId), [item.templateId]);

  useFrame((state) => {
    if (hovered) {
        mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, 1.1, 0.1);
        mesh.current.material.emissiveIntensity = 0.8;
    } else {
        mesh.current.scale.y = THREE.MathUtils.lerp(mesh.current.scale.y, 1, 0.1);
        mesh.current.material.emissiveIntensity = 0.2;
    }
  });

  return (
    <group position={[positionX, 0, 0]}>
      
      {/* THE DATA MESH */}
      <mesh
        ref={mesh}
        position={[0, height / 2, 0]} 
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); onHover(item); }}
        onPointerOut={(e) => { setHover(false); onHover(null); }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial 
          color={color} 
          roughness={0.2}
          metalness={0.8}
          transmission={0.1} // Glass look
          thickness={2}
          transparent
          opacity={0.9}
          emissive={color}
          emissiveIntensity={0.2}
        />
        <Edges scale={1} threshold={15} color="white" />
      </mesh>

      {/* TEXTE DANS LA BARRE (Vertical) */}
      <Text
        position={[0, height / 2, depth / 2 + 0.2]} // Juste devant la face
        rotation={[0, 0, Math.PI / 2]} // Vertical
        fontSize={0.8}
        color="black"
        anchorX="center"
        anchorY="middle"
        maxWidth={height - 1} 
        textAlign="center"
        fillOpacity={0.8}
      >
        {item.templateName.toUpperCase()}
      </Text>

      {/* INDICATEUR Z (Au sol à droite) */}
      <group position={[width/2 + 1, 0, 0]}>
         {/* Ligne qui montre la profondeur */}
         <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <planeGeometry args={[0.2, depth]} />
            <meshBasicMaterial color={color} opacity={0.6} transparent />
         </mesh>
         <Text 
            position={[0.5, 0.5, 0]} 
            rotation={[-Math.PI/2, 0, 0]} 
            fontSize={0.6} 
            color={color}
            anchorX="left"
            fontWeight="bold"
         >
            LVL {item.complexity}
         </Text>
      </group>

      {/* OMBRE AU SOL */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <planeGeometry args={[width + 2, depth + 2]} />
        <meshBasicMaterial color="#000" transparent opacity={0.5} />
      </mesh>

    </group>
  );
};

// --- MAIN COMPONENT (SAFE) ---
export default function DataTerrain({ data = [], onHover }: DataTerrainProps) {
  // \ud83d\udea8 FIX CRASH ICI : Ila data undefined, mat-renderi walo (Empty Group)
  // Hada howa l'sterr li kan khassek
  if (!data || !Array.isArray(data)) return null;

  return (
    <group>
      <gridHelper args={[300, 60, 0x333333, 0x050505]} position={[0, -0.1, 0]} />
      
      <WorldGizmo />
      <AxisGrid />

      {data.map((item, i) => (
        <StrategicBar 
            key={item.templateId} 
            item={item} 
            index={i} 
            totalItems={data.length} 
            onHover={onHover} 
        />
      ))}
    </group>
  );
}