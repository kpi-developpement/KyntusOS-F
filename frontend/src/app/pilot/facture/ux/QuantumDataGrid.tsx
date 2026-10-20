"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  uniform float uTime;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;

  void main() {
    vColor = aColor;
    vec3 pos = position;
    // Calcul dyal l-mewja nichan f' la carte graphique (GPU)
    pos.y += sin(uTime * 0.6 + pos.x * 0.08 + aPhase) * 1.8 + cos(uTime * 0.4 + pos.z * 0.08) * 1.2;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 4.5 * (24.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    gl_FragColor = vec4(vColor, 0.55);
  }
`;

const SapphireWaveParticles = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const count = 4500;

  const { positions, colors, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const phs = new Float32Array(count);

    const royalBlue = new THREE.Color('#0052FF');
    const electricAzure = new THREE.Color('#0EA5E9');
    const deepSapphire = new THREE.Color('#1E40AF');

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 45;
      phs[i] = Math.random() * Math.PI * 2;

      const rand = Math.random();
      const chosen = rand > 0.6 ? royalBlue : rand > 0.25 ? electricAzure : deepSapphire;
      col[i * 3] = chosen.r;
      col[i * 3 + 1] = chosen.g;
      col[i * 3 + 2] = chosen.b;
    }

    return { positions: pos, colors: col, phases: phs };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 }
  }), []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.05) * 0.08;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-aColor" count={count} array={colors} itemSize={3} />
        {/* @ts-ignore */}
        <bufferAttribute attach="attributes-aPhase" count={count} array={phases} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
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
        <planeGeometry args={[180, 180, 24, 24]} />
        <meshBasicMaterial color="#0052FF" wireframe transparent opacity={0.07} />
      </mesh>
      <mesh position={[0, 0, 2]}>
        <ringGeometry args={[14, 14.15, 48]} />
        <meshBasicMaterial color="#0EA5E9" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 4]}>
        <ringGeometry args={[24, 24.1, 48]} />
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
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: '45vw',
          height: '45vw',
          background: 'radial-gradient(circle, rgba(0, 82, 255, 0.09) 0%, transparent 70%)',
          filter: 'blur(60px)'
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
          filter: 'blur(60px)'
        }}
      />

      <Canvas
        camera={{ position: [0, 2, 24], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <SapphireWaveParticles />
        <LuxuryArchitecturalRings />
        <fog attach="fog" args={['#F8FAFC', 18, 65]} />
      </Canvas>
    </div>
  );
}