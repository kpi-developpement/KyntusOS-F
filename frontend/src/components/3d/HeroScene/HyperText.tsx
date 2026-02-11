"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Text } from "@react-three/drei";
import * as THREE from "three";

const fontUrl = "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff";

interface HyperTextProps {
  isHovered: boolean;
}

export function HyperText({ isHovered }: HyperTextProps) {
  const group = useRef<THREE.Group>(null!);

  // Refs pour les materiaux (pour animation performante)
  const materialRefs = useRef<THREE.MeshPhysicalMaterial[]>([]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // 1. ROTATION LOGIC
    // Normal: Thqil (Heavy)
    // Hover: Vibration Rapide (Energy)
    const targetRotY = isHovered 
        ? Math.sin(t * 5) * 0.05 // Jitter rapide
        : state.pointer.x * 0.2; // Suivi souris lent
    
    const targetRotX = isHovered
        ? Math.cos(t * 3) * 0.05
        : -state.pointer.y * 0.2;

    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRotY, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRotX, 0.05);

    // 2. EXPANSION LOGIC (L'infitah)
    // Si Hover, les layers s'écartent (Z-axis expansion)
    group.current.children.forEach((child, i) => {
        const baseZ = -i * 0.03; // Normal spacing (compact)
        const expandedZ = -i * 0.2; // Hover spacing (large)
        const targetZ = isHovered ? expandedZ : baseZ;
        
        child.position.z = THREE.MathUtils.lerp(child.position.z, targetZ, 0.1);
    });
  });

  const renderLayers = () => {
    const layers = [];
    const depth = 6; 
    
    for (let i = 0; i < depth; i++) {
        // COULEUR & MATERIAL LOGIC
        // Normal: Metal Sombre
        // Hover: Glass Cyan Transparent
        
        // On utilise MeshPhysicalMaterial pour l'effet de verre (Transmission)
        // Note: Le changement de props material en temps réel est couteux, 
        // ici on triche en changeant l'opacité et la couleur dans la boucle de rendu si besoin,
        // ou on utilise des props réactives. Pour la simplicité et l'effet, on conditionne le rendu.
        
        layers.push(
            <Text
                key={i}
                font={fontUrl}
                fontSize={1.8}
                letterSpacing={-0.05}
                anchorX="center"
                anchorY="middle"
                position={[0, 0, -i * 0.03]} // Position initiale
                // Si Hover: Wireframe bleu. Sinon: Outline gris.
                outlineWidth={isHovered ? 0.005 : (i === 0 ? 0.01 : 0)} 
                outlineColor={isHovered ? "#00f2ea" : "#a0a0a0"}
            >
                KYNTUS
                {/* MATERIAL HYBRIDE (METAL <-> GLASS) */}
                <meshPhysicalMaterial 
                    color={isHovered ? "#00f2ea" : (i === 0 ? "#ffffff" : "#111111")}
                    emissive={isHovered ? "#00f2ea" : (i === 0 ? "#00f2ea" : "#000000")}
                    emissiveIntensity={isHovered ? 0.5 : (i === 0 ? 0.1 : 0)}
                    
                    // PROPRIÉTÉS MÉTAL (Normal)
                    metalness={isHovered ? 0.1 : 1}
                    roughness={isHovered ? 0 : 0.1}
                    
                    // PROPRIÉTÉS VERRE (Hover)
                    transmission={isHovered ? 1 : 0} // Deviens transparent comme du verre
                    thickness={isHovered ? 2 : 0}
                    transparent={isHovered}
                    opacity={isHovered ? 0.3 : 1}
                    
                    toneMapped={false}
                />
            </Text>
        );
    }
    return layers;
  };

  return (
    <Float 
        speed={isHovered ? 5 : 1} // Flotte plus vite quand hover
        rotationIntensity={isHovered ? 0.5 : 0.1} 
        floatIntensity={isHovered ? 1 : 0.2} 
        floatingRange={[-0.1, 0.1]}
    >
      <group ref={group}>
        {renderLayers()}
        
        {/* L'Ombre s'éloigne aussi */}
        <Text
            font={fontUrl}
            fontSize={1.8}
            letterSpacing={-0.05}
            anchorX="center"
            anchorY="middle"
            position={[0, 0, -2]} // Loin derrière
            fillOpacity={0.5}
        >
            KYNTUS
            <meshBasicMaterial 
                color={isHovered ? "#00f2ea" : "#000000"} 
                transparent 
                opacity={isHovered ? 0.2 : 0.6} 
                blur={[isHovered ? 20 : 4, isHovered ? 20 : 4]} 
            />
        </Text>
      </group>
    </Float>
  );
}