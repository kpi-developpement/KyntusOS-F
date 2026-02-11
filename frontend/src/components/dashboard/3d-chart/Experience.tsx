"use client";

import { useFrame } from "@react-three/fiber";
import { Grid, Environment } from "@react-three/drei";
import { BarPillar } from "./BarPillar";
import { Axes } from "./Axes";
import * as THREE from "three";

export function Experience({ projects }: { projects: any[] }) {
  
  // CAMERA LOGIC: Mouvement TRES subtil juste pour le depth, presque fixe.
  useFrame((state) => {
    // On garde la camera presque au centre pour la lisibilité
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, 0, 0.1); 
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, 4, 0.1);
    state.camera.lookAt(0, 2, 0);
  });

  const spacing = 1.8; // Espace confortable
  const totalWidth = projects.length * spacing;
  const startX = -totalWidth / 2 + (spacing / 2);

  return (
    <>
        <Environment preset="city" /> 
        
        {/* Eclairage fonctionnel pour bien voir les couleurs */}
        <ambientLight intensity={0.6} color="#ffffff" />
        <directionalLight position={[5, 10, 5]} intensity={2} color="#ffffff" />
        <pointLight position={[-5, 5, 5]} intensity={1} color="#00f2ea" />

        {/* AXES CLAIRS */}
        <Axes width={totalWidth + 2} height={5} />

        {/* SOL DISCRET (Grid simple) */}
        <Grid 
            position={[0, -0.01, 0]} 
            args={[30, 10]} 
            cellSize={1} 
            cellThickness={0.5} 
            cellColor="#333" 
            sectionSize={5} 
            sectionThickness={1} 
            sectionColor="#444" 
            fadeDistance={20} 
        />

        {/* LES BARRES */}
        <group position={[0, 0, 0]}>
            {projects.map((proj, index) => (
                <BarPillar 
                    key={proj.templateId}
                    data={proj}
                    position={[startX + (index * spacing), 0, 0]}
                    index={index}
                />
            ))}
        </group>
    </>
  );
}