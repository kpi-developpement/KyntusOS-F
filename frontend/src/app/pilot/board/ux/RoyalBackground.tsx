"use client";

import React, { useEffect, useState } from "react";
import styles from "./RoyalBackground.module.css";

export default function RoyalBackground() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.topBeam} />
      <div className={styles.sapphireOrbPrimary} />
      <div className={styles.sapphireOrbSecondary} />
      <div
        className={styles.interactiveAura}
        style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
      />
      <div className={styles.grid3d} />
    </div>
  );
}