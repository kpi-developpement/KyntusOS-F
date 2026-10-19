"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SapphireWaveParticles = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 7000;

  const { positions, initialY, colors, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const initY = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const phs = new Float32Array(count);

    const royalBlue = new THREE.Color('#0052FF');
    const electricAzure = new THREE.Color('#0EA5E9');
    const deepSapphire = new THREE.Color('#1E40AF');

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 90;
      const y = (Math.random() - 0.5) * 35;
      const z = (Math.random() - 0.5) * 45;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      initY[i] = y;
      phs[i] = Math.random() * Math.PI * 2;

      const rand = Math.random();
      const chosen = rand > 0.6 ? royalBlue : rand > 0.25 ? electricAzure : deepSapphire;
      col[i * 3] = chosen.r;
      col[i * 3 + 1] = chosen.g;
      col[i * 3 + 2] = chosen.b;
    }

    return { positions: pos, initialY: initY, colors: col, phases: phs };
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const x = pos[i * 3];
      const z = pos[i * 3 + 2];
      pos[i * 3 + 1] = initialY[i] + Math.sin(t * 0.6 + x * 0.08 + phases[i]) * 1.8 + Math.cos(t * 0.4 + z * 0.08) * 1.2;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.rotation.y = Math.sin(t * 0.05) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.18}
        vertexColors={true}
        transparent
        opacity={0.55}
      />
    </points>
  );
};

const LuxuryArchitecturalRings = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.z = t * 0.04;
    groupRef.current.rotation.x = -Math.PI / 2.6 + Math.sin(t * 0.2) * 0.05;
  });

  return (
    <group ref={groupRef} position={[0, -10, -18]}>
      <mesh>
        <planeGeometry args={[180, 180, 36, 36]} />
        <meshBasicMaterial color="#0052FF" wireframe transparent opacity={0.07} />
      </mesh>
      <mesh position={[0, 0, 2]}>
        <ringGeometry args={[14, 14.15, 64]} />
        <meshBasicMaterial color="#0EA5E9" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 4]}>
        <ringGeometry args={[24, 24.1, 64]} />
        <meshBasicMaterial color="#0052FF" transparent opacity={0.14} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default function QuantumDataGrid() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'radial-gradient(circle at 50% 0%, #EFF6FF 0%, #F8FAFC 55%, #FFFFFF 100%)',
        overflow: 'hidden'
      }}
    >
      {/* Ambient Luxury Sapphire Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: '45vw',
          height: '45vw',
          background: 'radial-gradient(circle, rgba(0, 82, 255, 0.09) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '5%',
          width: '40vw',
          height: '40vw',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none'
        }}
      />

      <Canvas camera={{ position: [0, 2, 24], fov: 55 }}>
        <SapphireWaveParticles />
        <LuxuryArchitecturalRings />
        <fog attach="fog" args={['#F8FAFC', 18, 65]} />
      </Canvas>
    </div>
  );
}