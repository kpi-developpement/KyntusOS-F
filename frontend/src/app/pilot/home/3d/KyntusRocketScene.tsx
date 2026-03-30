"use client";

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

const RocketModel = ({ isLaunching, targetColor }: any) => {
  const rocketRef = useRef<THREE.Group>(null);
  const exhaustRef = useRef<THREE.Mesh>(null);
  const engineGlowRef = useRef<THREE.PointLight>(null);
  
  const mainColor = targetColor || "#00f0ff";

  // L-Material dyal S-Saroukh (Byed Nqiii bash y-ban d-do w l-ktaba)
  const materials = useMemo(() => ({
    body: new THREE.MeshStandardMaterial({ color: "#f8fafc", metalness: 0.3, roughness: 0.2 }),
    nose: new THREE.MeshStandardMaterial({ color: mainColor, metalness: 0.6, roughness: 0.2 }),
    fins: new THREE.MeshStandardMaterial({ color: "#0f172a", metalness: 0.8, roughness: 0.2 }),
    exhaust: new THREE.MeshBasicMaterial({ color: "#00f0ff", transparent: true, blending: THREE.AdditiveBlending })
  }), [mainColor]);

  useFrame((state, delta) => {
    if (!rocketRef.current) return;
    
    if (!isLaunching) {
      // 🛸 IDLE MODE (Vertical)
      rocketRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.2 - 1.5;
      rocketRef.current.position.z = 0;
      rocketRef.current.rotation.y = state.clock.elapsedTime * 0.5; 
      rocketRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.05; 
      
      if (exhaustRef.current) {
        exhaustRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 20) * 0.2);
        materials.exhaust.opacity = 0.5;
        materials.exhaust.color.setHex(0xff3d00); // N-nar limouniya f' r-ra7a
      }
      if (engineGlowRef.current) {
        engineGlowRef.current.intensity = 5;
        engineGlowRef.current.color.setHex(0xff3d00);
      }

    } else {
      // 💥 LAUNCH MODE (Kay-myel l-qddam w kay-tir)
      rocketRef.current.rotation.x = THREE.MathUtils.lerp(rocketRef.current.rotation.x, -Math.PI / 2.2, 0.05); 
      rocketRef.current.position.z -= delta * 100; // Sor3a Khayaliya f' Z
      rocketRef.current.position.y += delta * 15;  // Kay-tle3 chwiya l-foq
      
      if (exhaustRef.current) {
        exhaustRef.current.scale.setScalar(4 + Math.random() * 3); 
        materials.exhaust.opacity = 1;
        materials.exhaust.color.setHex(0x00f0ff); // N-Nar kat-wlli zrqa
      }
      if (engineGlowRef.current) {
        engineGlowRef.current.intensity = 50;
        engineGlowRef.current.color.setHex(0x00f0ff);
      }
    }
  });

  return (
    <group ref={rocketRef} scale={[0.8, 0.8, 0.8]}>
      {/* L-Jism d-saroukh (Byed) */}
      <mesh position={[0, 0, 0]} material={materials.body}>
        <cylinderGeometry args={[1, 1.2, 6, 32]} />
      </mesh>

      {/* R-Rass (Neon Color) */}
      <mesh position={[0, 4, 0]} material={materials.nose}>
        <coneGeometry args={[1, 2, 32]} />
      </mesh>

      {/* L-Jnawe7 */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((rot, i) => (
        <mesh key={i} position={[0, -2, 0]} rotation={[0, rot, 0]} material={materials.fins}>
          <boxGeometry args={[3.5, 2, 0.1]} />
        </mesh>
      ))}

      {/* L-Mouteur w N-Nar */}
      <mesh position={[0, -3.3, 0]} material={materials.fins}>
        <cylinderGeometry args={[1.1, 0.8, 0.6, 32]} />
      </mesh>
      <mesh ref={exhaustRef} position={[0, -5, 0]} rotation={[Math.PI, 0, 0]} material={materials.exhaust}>
        <coneGeometry args={[0.9, 3.5, 16]} />
      </mesh>
      <pointLight ref={engineGlowRef} position={[0, -5.5, 0]} distance={20} />

      {/* ✍️ KYNTUS TEXT (K7el w Bayen 100%) */}
      <Suspense fallback={null}>
        <Text 
          position={[0, 0.2, 1.15]} 
          rotation={[0, 0, -Math.PI / 2]} 
          fontSize={1.2} 
          color="#020617" 
          fontWeight="bold"
          letterSpacing={0.2}
        >
          KYNTUS
        </Text>
        <Text 
          position={[0, 0.2, -1.15]} 
          rotation={[0, Math.PI, Math.PI / 2]} 
          fontSize={1.2} 
          color="#020617" 
          fontWeight="bold"
          letterSpacing={0.2}
        >
          KYNTUS
        </Text>
      </Suspense>
    </group>
  );
};

const WelcomeText3D = ({ username, isLaunching, targetColor }: any) => {
  const textRef = useRef<THREE.Group>(null);
  const color = targetColor || "#00f0ff";

  useFrame((state, delta) => {
    if (!textRef.current) return;
    if (isLaunching) {
      textRef.current.position.z += delta * 40; 
      textRef.current.scale.setScalar(THREE.MathUtils.lerp(textRef.current.scale.x, 0, 0.1)); 
    } else {
      textRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.1 + 4.5;
    }
  });

  return (
    <group ref={textRef} position={[0, 4.5, 0]}>
      <Suspense fallback={null}>
        <Text position={[0, 1.2, 0]} fontSize={0.6} color="#ffffff" letterSpacing={0.1} outlineWidth={0.02} outlineColor={color}>
          WELCOME COMMANDER
        </Text>
        <Text position={[0, 0, 0]} fontSize={1.8} color={color} fontWeight="bold" letterSpacing={0.1} outlineWidth={0.04} outlineColor="#ffffff">
          {username || "UNKNOWN"}
        </Text>
      </Suspense>
    </group>
  );
};

export default function KyntusRocketScene({ isLaunching, targetColor, username }: any) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none' }}>
      <Canvas camera={{ position: [0, 2, 14], fov: 45 }} dpr={[1, 1.5]}>
        
        {/* 🌟 ENVIRONMENT: Hada howa s-serr bash l-m3den y-ban 7qiqi w mashi k7el! */}
        <Environment preset="city" />
        
        <ambientLight intensity={1} color="#ffffff" />
        <directionalLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color={targetColor || "#b026ff"} />
        
        <WelcomeText3D username={username} isLaunching={isLaunching} targetColor={targetColor} />
        
        <Float speed={2} rotationIntensity={0.3} floatIntensity={1.2}>
          <RocketModel isLaunching={isLaunching} targetColor={targetColor} />
        </Float>
      </Canvas>
    </div>
  );
}