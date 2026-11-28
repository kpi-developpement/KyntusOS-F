"use client";

/**
 * Scène de connexion : un blob « métal liquide » qui ondule (shader de distorsion),
 * entouré de petites perles de verre, qui suit doucement le pointeur.
 * Éclairage 100 % local (Lightformers) : rien n'est téléchargé.
 */
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function Blob({ excited }: { excited: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshPhysicalMaterial & { distort: number; speed: number }>(null);
  useFrame((state, dt) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.y += dt * 0.25;
    m.position.x = THREE.MathUtils.lerp(m.position.x, state.pointer.x * 0.35 + 1.45, 0.04);
    m.position.y = THREE.MathUtils.lerp(m.position.y, state.pointer.y * 0.25 + 1.05, 0.04);
    if (mat.current) {
      mat.current.distort = THREE.MathUtils.lerp(mat.current.distort, excited ? 0.62 : 0.4, 0.05);
      mat.current.speed = excited ? 4 : 1.6;
    }
  });
  return (
    <mesh ref={ref} scale={1.05} position={[1.45, 1.05, 0]}>
      <icosahedronGeometry args={[1, 20]} />
      <MeshDistortMaterial
        ref={mat as never}
        color="#dbeafe"
        roughness={0.08}
        metalness={0.25}
        clearcoat={1}
        clearcoatRoughness={0.05}
        iridescence={0.8}
        iridescenceIOR={1.4}
        distort={0.4}
        speed={1.6}
      />
    </mesh>
  );
}

function Pearls() {
  const pearls = [
    { p: [-0.4, 1.9, -0.5], s: 0.26, c: "#ffffff" },
    { p: [2.4, -1.4, 0.2], s: 0.22, c: "#bae6fd" },
    { p: [0.9, -1.9, 0.4], s: 0.18, c: "#c7d2fe" },
    { p: [2.2, 1.7, -0.8], s: 0.4, c: "#dbeafe" },
    { p: [-2.8, -0.2, -1], s: 0.14, c: "#ffffff" },
  ] as const;
  return (
    <>
      {pearls.map((b, i) => (
        <Float key={i} speed={1.5 + i * 0.3} rotationIntensity={0.6} floatIntensity={1.4}>
          <mesh position={b.p as unknown as [number, number, number]} scale={b.s}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshPhysicalMaterial color={b.c} roughness={0.05} metalness={0.2} clearcoat={1} transparent opacity={0.72} iridescence={0.6} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

export default function LiquidScene({ excited = false }: { excited?: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 40 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ position: "absolute", inset: 0 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Blob excited={excited} />
      <Pearls />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 5, 2]} scale={[10, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={3} position={[-5, 0, 1]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} color="#93c5fd" />
        <Lightformer form="rect" intensity={2.5} position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} color="#a5b4fc" />
        <Lightformer form="ring" intensity={2} position={[0, -4, 3]} scale={3} color="#e0f2fe" />
        {/* Fond de l'environnement : un bleu clair, pour que les reflets ne soient jamais noirs */}
        <mesh scale={30}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#60a5fa" side={THREE.BackSide} />
        </mesh>
      </Environment>
    </Canvas>
  );
}
