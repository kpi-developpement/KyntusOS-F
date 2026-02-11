"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import { HyperText } from "./HyperText";
import { WarpStars } from "./WarpStars";

// Interface pour les props
interface SceneProps {
  isHovered?: boolean;
}

export default function HeroScene({ isHovered = false }: SceneProps) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#000000" }}>
      <Canvas 
        camera={{ position: [0, 0, 10], fov: 40 }} 
        gl={{ 
            antialias: true, 
            powerPreference: "high-performance"
        }}
        dpr={[1, 2]} 
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#000000", 20, 100]} /> 

        <Suspense fallback={null}>
            <WarpStars />

            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-10, -5, 10]} intensity={2} color="#00f2ea" />
            
            {/* On passe le signal ici */}
            <HyperText isHovered={isHovered} />
        </Suspense>
      </Canvas>
    </div>
  );
}