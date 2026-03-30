"use client";

import React, { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { Float, Environment } from "@react-three/drei";
import * as THREE from "three";

// 🏠 1. HANDASAT D-DAR L-7QIQIYA (REALISTIC ARCHITECTURE) 🏠
const RealHouse3D = ({ isHovered }: { isHovered: boolean }) => {
  const houseGroupRef = useRef<THREE.Group>(null);
  
  // L-Alwan: Neon Zreq f' 3adi, Neon Kheder f' Hover
  const glowColor = isHovered ? "#39ff14" : "#00f0ff"; 
  
  useFrame((state, delta) => {
    if (houseGroupRef.current) {
      // D-Dar kat-dour b-slasa (Smooth rotation)
      houseGroupRef.current.rotation.y += delta * (isHovered ? 1.5 : 0.3);
      // Mayaan khfif
      houseGroupRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.05;
      houseGroupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });

  return (
    <group ref={houseGroupRef} position={[0, -0.2, 0]} scale={isHovered ? 1.1 : 1}>
      
      {/* 🛑 1. L-BASE (Tebla d-L-M3den) */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[1.2, 1.3, 0.1, 32]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* 🛑 2. L-7YOUT (Dark Slate Metal) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color="#020617" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 🛑 3. S-SQEF (Modern Angled Roof) */}
      <mesh position={[0, 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
        {/* 4 sides cylinder = Pyramid / Modern Roof */}
        <cylinderGeometry args={[0.2, 1.1, 0.3, 4]} />
        <meshStandardMaterial color="#0f172a" metalness={1} roughness={0.1} />
      </mesh>

      {/* 🪟 4. Z-ZAJ PANORAMIQUE (Physical Glass Material d-bsa7!) */}
      {/* Zaja l-Gddam */}
      <mesh position={[0, 0.1, 0.61]}>
        <boxGeometry args={[0.9, 0.4, 0.05]} />
        <meshPhysicalMaterial 
          color={glowColor} 
          transmission={0.9} // Shaffaf (Transparent d-bsa7)
          opacity={1} 
          metalness={1} 
          roughness={0.1} 
          emissive={glowColor} 
          emissiveIntensity={isHovered ? 0.6 : 0.2} 
        />
      </mesh>

      {/* Zaja f-J-Jnb (Draita) */}
      <mesh position={[0.61, 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.7, 0.4, 0.05]} />
        <meshPhysicalMaterial 
          color={glowColor} transmission={0.9} metalness={1} roughness={0.1} 
          emissive={glowColor} emissiveIntensity={isHovered ? 0.6 : 0.2} 
        />
      </mesh>

      {/* Zaja f-J-Jnb (Lissra) */}
      <mesh position={[-0.61, 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.7, 0.4, 0.05]} />
        <meshPhysicalMaterial 
          color={glowColor} transmission={0.9} metalness={1} roughness={0.1} 
          emissive={glowColor} emissiveIntensity={isHovered ? 0.6 : 0.2} 
        />
      </mesh>

      {/* 🚪 5. L-BAB L-HOLOGRAPHIQUE (Kay-sh3el) */}
      <mesh position={[0, -0.3, 0.61]}>
        <boxGeometry args={[0.3, 0.4, 0.05]} />
        <meshStandardMaterial 
          color={glowColor} 
          emissive={glowColor} 
          emissiveIntensity={isHovered ? 1.5 : 0.5} 
        />
      </mesh>

      {/* 💡 IDAA2A DAKHILIYA (Bash t-beyyen d-dar m-dowya mn L-dakhel) */}
      <pointLight position={[0, 0, 0]} color={glowColor} intensity={isHovered ? 2 : 0.5} distance={3} />
    </group>
  );
};

// 🎬 2. L-BOUTON KAMEL W L-ANIMATION DYAL TEXT
export default function HoloBackButton() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      style={{
        position: "fixed",
        top: "25px",
        left: "25px", 
        width: "120px",  // Kbbertha chwiya bash t-hzz d-dar mzyan
        height: "120px",
        zIndex: 99999,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => router.push("/pilot/home")} 
    >
      {/* 🌟 1. L-CANVAS DYAL D-DAR 3D */}
      <div style={{ 
        width: "100%", height: "100%", 
        background: isHovered ? "rgba(0, 240, 255, 0.05)" : "transparent",
        borderRadius: "50%",
        transition: "all 0.4s ease",
        boxShadow: isHovered ? "0 0 20px rgba(0, 240, 255, 0.2)" : "none"
      }}>
        <Canvas camera={{ position: [0, 1.5, 4.5], fov: 45 }} gl={{ alpha: true, antialias: true }}>
          
          {/* L-ENVIRONMENT: Hada howa S-Serr li kay-red L-M3den 7qiqi 100% */}
          <Environment preset="city" />
          
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={2} color="#ffffff" />
          
          <Float speed={3} rotationIntensity={0.1} floatIntensity={0.5}>
            <RealHouse3D isHovered={isHovered} />
          </Float>

        </Canvas>
      </div>
      
      {/* 🚀 2. TEXT "BACK TO HOME" (Kat-ban b' Animation Wa3ra f' L-Hover) */}
      <div style={{
        position: "absolute",
        bottom: "-20px",
        whiteSpace: "nowrap",
        color: isHovered ? "#39ff14" : "#00f0ff",
        fontFamily: "monospace",
        fontSize: "0.75rem",
        fontWeight: "900",
        letterSpacing: "2px",
        backgroundColor: "rgba(2, 6, 23, 0.8)",
        padding: "4px 12px",
        borderRadius: "4px",
        border: `1px solid ${isHovered ? "#39ff14" : "#00f0ff"}`,
        // L-Animation: Kat-t-l3 mn l-te7t w kat-ban
        opacity: isHovered ? 1 : 0,
        transform: isHovered ? "translateY(0)" : "translateY(10px)",
        transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        pointerEvents: "none",
        boxShadow: `0 0 10px ${isHovered ? "rgba(57, 255, 20, 0.3)" : "rgba(0, 240, 255, 0.3)"}`
      }}>
        BACK TO HOME
      </div>

    </div>
  );
}