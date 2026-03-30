"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CoreGeometry = () => {
  const coreRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = t * 0.5;
      coreRef.current.rotation.x = t * 0.2;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2;
      ringRef.current.rotation.z = t * -0.3;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* L-Qelb L-M-glowi */}
      <mesh ref={coreRef} scale={[2, 2, 2]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#00f0ff" wireframe transparent opacity={0.6} />
      </mesh>

      {/* L-Khwitem Li kay-dour */}
      <mesh ref={ringRef} scale={[3.5, 3.5, 3.5]}>
        <torusGeometry args={[1, 0.02, 16, 100]} />
        <meshBasicMaterial color="#b026ff" transparent opacity={0.8} />
      </mesh>
      
      <pointLight position={[0, 0, 0]} intensity={50} color="#00f0ff" distance={10} />
    </group>
  );
};

export default function NexusCore() {
  return (
    <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '600px', height: '600px', zIndex: 0, opacity: 0.8, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={0.5} />
        <CoreGeometry />
      </Canvas>
    </div>
  );
}