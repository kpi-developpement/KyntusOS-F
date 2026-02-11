"use client";

import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function WarpStars() {
  const mesh = useRef<THREE.Points>(null!);
  const count = 4000; // Densité parfaite

  // Génération statique (Le nuage ne bouge pas tout seul)
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Zone large pour permettre le mouvement sans coupure
      positions[i * 3] = (Math.random() - 0.5) * 200;     
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200; 
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 20; // Fond profond
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    // LOGIQUE "REACTIVE PARALLAX"
    // L'objectif: Le fond bouge VITE dans le sens OPPOSÉ de la souris
    
    // Sensibilité extrême (x25)
    const targetX = -state.pointer.x * 25; 
    const targetY = -state.pointer.y * 25;
    
    // Lerp rapide (0.1) pour une réponse immédiate mais fluide (0.5mm sensitivity)
    mesh.current.position.x = THREE.MathUtils.lerp(mesh.current.position.x, targetX, 0.1);
    mesh.current.position.y = THREE.MathUtils.lerp(mesh.current.position.y, targetY, 0.1);

    // Petite rotation Z imperceptible pour le réalisme
    mesh.current.rotation.z += 0.0001;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12} 
        color="#ffffff"
        sizeAttenuation={true}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}