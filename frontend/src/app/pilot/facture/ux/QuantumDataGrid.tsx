"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DataStream = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 8000;

  const { positions, colors, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    
    const c1 = new THREE.Color('#00f0ff'); // Cyan
    const c2 = new THREE.Color('#b026ff'); // Purple

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100; // X
      pos[i * 3 + 1] = Math.random() * 100 - 50; // Y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;  // Z
      
      spd[i] = Math.random() * 0.2 + 0.05;

      const mixedColor = Math.random() > 0.5 ? c1 : c2;
      col[i * 3] = mixedColor.r; col[i * 3 + 1] = mixedColor.g; col[i * 3 + 2] = mixedColor.b;
    }
    return { positions: pos, colors: col, speeds: spd };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= speeds[i]; // Kay-ti7ou mn l-foq l-te7t b7al d-Data
      if (pos[i * 3 + 1] < -50) pos[i * 3 + 1] = 50;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} vertexColors transparent opacity={0.6} blending={THREE.AdditiveBlending} />
    </points>
  );
};

const GridFloor = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, -20]}>
      <planeGeometry args={[200, 200, 40, 40]} />
      <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.1} />
    </mesh>
  );
};

export default function QuantumDataGrid() {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, background: 'radial-gradient(circle at center, #0a0a1a 0%, #010205 100%)' }}>
      <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
        <DataStream />
        <GridFloor />
        <fog attach="fog" args={['#010205', 10, 60]} />
      </Canvas>
    </div>
  );
}