"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { BarChart3, Zap } from "lucide-react";
import { Experience } from "./Experience";
import styles from "./Chart3D.module.css";
import * as THREE from "three";

interface ProjectData {
  templateName: string;
  progress: number;
  templateId: number;
}

interface ProcessChart3DProps {
  projects: ProjectData[];
}

export default function ProcessChart3D({ projects }: ProcessChart3DProps) {
  return (
    <div className={styles.chartContainer}>
      
      {/* 1. HTML OVERLAY (Header 2D par dessus la 3D) */}
      <div className={styles.overlayHeader}>
        <div className={styles.titleBox}>
            <BarChart3 size={24} color="#00f2ea" />
            <h2 className={styles.title}>PERFORMANCE HOLOGRAPHIQUE</h2>
        </div>
        <div className={styles.metaBox}>
            <span className={styles.metaItem}><Zap size={14}/> LIVE RENDER</span>
        </div>
      </div>

      {/* 2. LE MONDE 3D */}
      <div className={styles.canvasWrapper}>
        <Canvas
            shadows
            camera={{ position: [5, 5, 10], fov: 35 }}
            gl={{ antialias: true, toneMapping: THREE.ReinhardToneMapping }}
            dpr={[1, 2]} // Optimisation Retina
        >
            <color attach="background" args={["#05080f"]} />
            <fog attach="fog" args={["#05080f", 5, 20]} />
            
            <Suspense fallback={null}>
                <Experience projects={projects} />
            </Suspense>
        </Canvas>
      </div>

    </div>
  );
}