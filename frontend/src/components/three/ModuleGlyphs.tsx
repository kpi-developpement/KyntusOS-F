"use client";

/**
 * Glyphes 3D des modules : un seul <Canvas> pour toute la page, et une
 * <View> drei par carte (le canvas ne dessine que dans la zone de chaque carte).
 * Matériaux « verre émaillé » (clearcoat + iridescence), lumière 100 % locale
 * (Lightformers) : aucun fichier HDR téléchargé.
 */
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { View, Environment, Lightformer, Float, RoundedBox, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

export type GlyphKind =
  | "analyse" | "tableau" | "facture" | "contestation" | "api" | "terrain" | "tissue"
  | "ventilation" | "parametrage" | "history" | "home" | "dispatch" | "live" | "inspect" | "map" | "team";

function GlassMaterial({ color, locked }: { color: string; locked?: boolean }) {
  return (
    <meshPhysicalMaterial
      color={locked ? "#cbd5e1" : color}
      roughness={locked ? 0.6 : 0.12}
      metalness={0.15}
      clearcoat={1}
      clearcoatRoughness={0.08}
      iridescence={locked ? 0 : 0.55}
      iridescenceIOR={1.35}
      sheen={0.4}
      sheenColor="#ffffff"
    />
  );
}

function Shape({ kind, color, locked }: { kind: GlyphKind; color: string; locked?: boolean }) {
  const m = <GlassMaterial color={color} locked={locked} />;
  switch (kind) {
    case "analyse":
      return <mesh>{m}<torusKnotGeometry args={[0.62, 0.22, 160, 24]} /></mesh>;
    case "tableau":
    case "dispatch":
      return (
        <group>
          {[-0.62, 0, 0.62].map((x, i) => (
            <RoundedBox key={x} args={[0.48, 0.9 - i * 0.18, 0.48]} radius={0.12} position={[x, -i * 0.09, 0]}>{m}</RoundedBox>
          ))}
        </group>
      );
    case "facture":
      return (
        <group rotation={[0.4, 0, 0]}>
          {[0, 1, 2, 3].map((i) => <mesh key={i} position={[0, i * 0.2 - 0.3, 0]}>{m}<cylinderGeometry args={[0.72, 0.72, 0.14, 48]} /></mesh>)}
        </group>
      );
    case "contestation":
      return (
        <group>
          <mesh>{m}<octahedronGeometry args={[0.9, 0]} /></mesh>
        </group>
      );
    case "api":
    case "live":
      return (
        <group>
          <mesh>{m}<sphereGeometry args={[0.6, 48, 48]} /></mesh>
          <mesh rotation={[1.2, 0.3, 0]}>{m}<torusGeometry args={[1, 0.05, 16, 100]} /></mesh>
        </group>
      );
    case "terrain":
      return (
        <group>
          {[0, 1, 2].map((i) => <mesh key={i} position={[0, i * 0.42 - 0.42, 0]}>{m}<cylinderGeometry args={[0.7, 0.7, 0.3, 48]} /></mesh>)}
        </group>
      );
    case "tissue":
      return <mesh>{m}<icosahedronGeometry args={[0.95, 0]} /></mesh>;
    case "ventilation":
      return (
        <group>
          {[0.5, 1.1, 0.8, 1.4].map((h, i) => (
            <RoundedBox key={i} args={[0.32, h, 0.32]} radius={0.08} position={[i * 0.42 - 0.63, h / 2 - 0.6, 0]}>{m}</RoundedBox>
          ))}
        </group>
      );
    case "parametrage":
      return <mesh>{m}<torusGeometry args={[0.7, 0.28, 24, 8]} /></mesh>;
    case "history":
      return <mesh>{m}<dodecahedronGeometry args={[0.9, 0]} /></mesh>;
    case "inspect":
      return (
        <group>
          <mesh position={[-0.15, 0.15, 0]}>{m}<torusGeometry args={[0.5, 0.14, 24, 64]} /></mesh>
          <RoundedBox args={[0.2, 0.7, 0.2]} radius={0.08} position={[0.45, -0.45, 0]} rotation={[0, 0, 0.8]}>{m}</RoundedBox>
        </group>
      );
    case "map":
      return <mesh>{m}<sphereGeometry args={[0.85, 12, 8]} /></mesh>;
    case "team":
      return (
        <group>
          {[-0.5, 0, 0.5].map((x, i) => <mesh key={x} position={[x, i === 1 ? 0.15 : -0.1, i === 1 ? 0.2 : 0]}>{m}<sphereGeometry args={[0.36, 32, 32]} /></mesh>)}
        </group>
      );
    default:
      return <RoundedBox args={[1.2, 1.2, 1.2]} radius={0.25}>{m}</RoundedBox>;
  }
}

function Spinner({ kind, color, active, locked }: { kind: GlyphKind; color: string; active: boolean; locked?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const speed = locked ? 0 : active ? 1.8 : 0.35;
    g.rotation.y += dt * speed;
    const target = active && !locked ? 1.12 : 1;
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, target, 0.12));
    // Suit légèrement le pointeur
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, locked ? 0.2 : state.pointer.y * -0.35 + 0.15, 0.06);
  });
  return (
    <Float speed={locked ? 0 : 2.2} rotationIntensity={locked ? 0 : 0.35} floatIntensity={locked ? 0 : 0.6}>
      <group ref={ref}><Shape kind={kind} color={color} locked={locked} /></group>
    </Float>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={2} position={[-4, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#bfdbfe" />
        <Lightformer form="ring" intensity={1.5} position={[4, 1, 1]} scale={2} color="#93c5fd" />
        <Lightformer form="rect" intensity={1} position={[0, -3, 2]} scale={[6, 1, 1]} color="#e0e7ff" />
      </Environment>
    </>
  );
}

/** Une vue 3D, placée dans la carte (prend la taille de son conteneur). */
export function GlyphView({ kind, color, active, locked, className }: { kind: GlyphKind; color: string; active: boolean; locked?: boolean; className?: string }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 0, 4.2]} fov={35} />
      <Lights />
      <Spinner kind={kind} color={color} active={active} locked={locked} />
    </View>
  );
}

/**
 * Les View ne nettoient que leur propre zone : on efface tout le canvas en début
 * de frame, sinon certains GPU affichent un contenu indéfini hors des cartes.
 */
function ClearAll() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
  }, -1);
  return null;
}

/** Le canvas partagé : à rendre une fois par page qui utilise des GlyphView. */
export function GlyphCanvas() {
  return (
    <Canvas
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 30 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ClearAll />
      <View.Port />
    </Canvas>
  );
}
