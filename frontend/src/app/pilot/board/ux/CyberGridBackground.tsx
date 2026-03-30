"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// 🌐 L-Grid l-Asli
function MovingGrid() {
  const gridRef = useRef<THREE.GridHelper>(null);
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 3) % 1; 
    }
  });
  return <gridHelper ref={gridRef} args={[200, 100, "#b026ff", "#00f0ff"]} position={[0, -2.5, 0]} />;
}

// 🧊 Data Cubes li kay-tiro mn L-Core
function FloatingDataCubes() {
  const cubesRef = useRef<THREE.Group>(null);
  const cubesCount = 40;

  const positions = useMemo(() => {
    return Array.from({ length: cubesCount }).map(() => ({
      x: (Math.random() - 0.5) * 40,
      y: Math.random() * 10 - 2,
      z: Math.random() * -50 - 10,
      speed: Math.random() * 2 + 1
    }));
  }, []);

  useFrame((state, delta) => {
    if (cubesRef.current) {
      cubesRef.current.children.forEach((cube, i) => {
        cube.position.z += delta * positions[i].speed * 10;
        cube.rotation.x += delta * positions[i].speed;
        cube.rotation.y += delta * positions[i].speed;
        if (cube.position.z > 5) cube.position.z = -60; // Kay-3awdo y-bdaw mn wera
      });
    }
  });

  return (
    <group ref={cubesRef}>
      {positions.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#00f0ff" : "#b026ff"} wireframe />
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

export default function CyberGridBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: -1, backgroundColor: "#02040a", overflow: "hidden" }}>
      
      {/* 🔮 THE NEON GLOW BLOB (F' wsset sh-shasha) */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: "1000px", height: "1000px",
        background: "radial-gradient(circle, rgba(0, 240, 255, 0.1) 0%, rgba(176, 38, 255, 0.05) 40%, transparent 70%)",
        borderRadius: "50%", filter: "blur(80px)", transform: "translate(-50%, -50%)",
        pointerEvents: "none", zIndex: 1
      }} />

      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Canvas camera={{ position: [0, 1, 6], fov: 60 }} gl={{ alpha: true, antialias: true }}>
          <fog attach="fog" args={["#02040a", 10, 40]} /> 
          <ambientLight intensity={0.5} />
          
          <Stars radius={100} depth={50} count={4000} factor={4} saturation={1} fade speed={2} />
          <MovingGrid />
          <FloatingDataCubes />
          
          {/* 🌟 THE NEXUS CORE (L-Kora 3imlaqa f' l-Afaq) */}
          <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
            <Sphere args={[12, 64, 64]} position={[0, 8, -45]}>
              <meshBasicMaterial color="#b026ff" wireframe opacity={0.3} transparent />
            </Sphere>
            <Sphere args={[11.5, 32, 32]} position={[0, 8, -45]}>
              <meshBasicMaterial color="#00f0ff" opacity={0.8} transparent />
            </Sphere>
            <pointLight position={[0, 8, -40]} color="#00f0ff" intensity={50} distance={100} />
          </Float>

          <ParallaxCamera />
        </Canvas>
      </div>
    </div>
  );
}