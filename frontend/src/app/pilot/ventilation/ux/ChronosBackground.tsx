"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere } from '@react-three/drei'; // 🛑 7yydna Stars mn hna!
import * as THREE from 'three';

// 🌐 L-Grid b' Alwan L-Ventilation (Red & Blue)
function MovingGrid() {
  const gridRef = useRef<THREE.GridHelper>(null);
  useFrame((state) => {
    // Sre3naha chwiya (x4) bash t-3ti l-vibe dyal Time Machine! ⏳
    if (gridRef.current) gridRef.current.position.z = (state.clock.elapsedTime * 4) % 1; 
  });
  return <gridHelper ref={gridRef} args={[200, 100, "#ef4444", "#0ea5e9"]} position={[0, -2.5, 0]} />;
}

// 🧊 Data Cubes
function FloatingDataCubes() {
  const cubesRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => Array.from({ length: 30 }).map(() => ({
      x: (Math.random() - 0.5) * 40, y: Math.random() * 10 - 2, z: Math.random() * -50 - 10, speed: Math.random() * 3 + 1
  })), []);

  useFrame((state, delta) => {
    if (cubesRef.current) {
      cubesRef.current.children.forEach((cube, i) => {
        cube.position.z += delta * positions[i].speed * 12; // Zedt f-S-sor3a d-l-moka3abat
        cube.rotation.x += delta * positions[i].speed;
        cube.rotation.y += delta * positions[i].speed;
        if (cube.position.z > 5) cube.position.z = -60; 
      });
    }
  });

  return (
    <group ref={cubesRef}>
      {positions.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          {/* Loun L-Moka3abat */}
          <meshBasicMaterial color={i % 2 === 0 ? "#ef4444" : "#0ea5e9"} wireframe />
        </mesh>
      ))}
    </group>
  );
}

// 🎥 Parallax Camera (Kat-myeel m3a s-souris)
function ParallaxCamera() {
  useFrame((state) => {
    const mouseX = (state.pointer.x * Math.PI) / 20;
    const mouseY = (state.pointer.y * Math.PI) / 20;
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, mouseX * 5, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, mouseY * 2 + 1, 0.05);
    state.camera.lookAt(0, 0, -20);
  });
  return null;
}

export default function ChronosBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: -1, backgroundColor: "#020205", overflow: "hidden" }}>
      
      {/* 🔮 THE NEON GLOW BLOB (Red & Blue) */}
      <div style={{ 
        position: "absolute", top: "50%", left: "50%", 
        width: "1000px", height: "1000px", 
        background: "radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, rgba(14, 165, 233, 0.05) 40%, transparent 70%)", 
        borderRadius: "50%", filter: "blur(80px)", transform: "translate(-50%, -50%)", 
        pointerEvents: "none", zIndex: 1 
      }} />

      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        {/* 🛑 L-Canvas d-bsa7 */}
        <Canvas camera={{ position: [0, 1, 6], fov: 60 }} gl={{ alpha: true, antialias: true }}>
          {/* D-dbaba l-k7la f-l-afaq */}
          <fog attach="fog" args={["#020205", 10, 40]} /> 
          <ambientLight intensity={0.5} />
          
          {/* 🛑 7YYDNA N-JOUM (<Stars />) KIMA BGHITI! 🛑 */}

          <MovingGrid />
          <FloatingDataCubes />
          
          {/* 🌟 THE NEXUS CORE (L-Kora 3imlaqa b' L-7mer w z-Zreq) */}
          <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
            <Sphere args={[12, 64, 64]} position={[0, 8, -45]}>
              <meshBasicMaterial color="#ef4444" wireframe opacity={0.3} transparent />
            </Sphere>
            <Sphere args={[11.5, 32, 32]} position={[0, 8, -45]}>
              <meshBasicMaterial color="#0ea5e9" opacity={0.8} transparent />
            </Sphere>
            <pointLight position={[0, 8, -40]} color="#ef4444" intensity={50} distance={100} />
          </Float>

          <ParallaxCamera />
        </Canvas>
      </div>
    </div>
  );
}