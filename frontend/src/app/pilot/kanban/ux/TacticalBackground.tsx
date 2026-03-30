"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function MovingGrid() {
  const gridRef = useRef<THREE.GridHelper>(null);
  useFrame((state) => {
    if (gridRef.current) gridRef.current.position.z = (state.clock.elapsedTime * 3) % 1; 
  });
  // Alwan Jdad: Amber (#f59e0b) w Neon Green (#39ff14)
  return <gridHelper ref={gridRef} args={[200, 100, "#f59e0b", "#39ff14"]} position={[0, -2.5, 0]} />;
}

function FloatingDataCubes() {
  const cubesRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => Array.from({ length: 30 }).map(() => ({
      x: (Math.random() - 0.5) * 40, y: Math.random() * 10 - 2, z: Math.random() * -50 - 10, speed: Math.random() * 2 + 1
  })), []);

  useFrame((state, delta) => {
    if (cubesRef.current) {
      cubesRef.current.children.forEach((cube, i) => {
        cube.position.z += delta * positions[i].speed * 10;
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
          <meshBasicMaterial color={i % 2 === 0 ? "#39ff14" : "#f59e0b"} wireframe />
        </mesh>
      ))}
    </group>
  );
}

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

export default function TacticalBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: -1, backgroundColor: "#02040a", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "50%", left: "50%", width: "1000px", height: "1000px", background: "radial-gradient(circle, rgba(57, 255, 20, 0.08) 0%, rgba(245, 158, 11, 0.05) 40%, transparent 70%)", borderRadius: "50%", filter: "blur(80px)", transform: "translate(-50%, -50%)", pointerEvents: "none", zIndex: 1 }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <Canvas camera={{ position: [0, 1, 6], fov: 60 }} gl={{ alpha: true, antialias: true }}>
          <fog attach="fog" args={["#02040a", 10, 40]} /> 
          <ambientLight intensity={0.5} />
          <Stars radius={100} depth={50} count={3000} factor={4} saturation={1} fade speed={2} />
          <MovingGrid />
          <FloatingDataCubes />
          <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
            <Sphere args={[12, 64, 64]} position={[0, 8, -45]}>
              <meshBasicMaterial color="#f59e0b" wireframe opacity={0.3} transparent />
            </Sphere>
            <Sphere args={[11.5, 32, 32]} position={[0, 8, -45]}>
              <meshBasicMaterial color="#39ff14" opacity={0.8} transparent />
            </Sphere>
            <pointLight position={[0, 8, -40]} color="#39ff14" intensity={50} distance={100} />
          </Float>
          <ParallaxCamera />
        </Canvas>
      </div>
    </div>
  );
}