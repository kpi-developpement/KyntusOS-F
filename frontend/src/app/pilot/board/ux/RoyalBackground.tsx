"use client";

import React, { useEffect, useRef } from "react";
import styles from "./RoyalBackground.module.css";

export default function RoyalBackground() {
  const auraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let targetX = -1000;
    let targetY = -1000;

    const updatePosition = () => {
      if (auraRef.current) {
        auraRef.current.style.transform = `translate3d(${targetX - 260}px, ${targetY - 260}px, 0)`;
      }
      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updatePosition);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.topBeam} />
      <div className={styles.sapphireOrbPrimary} />
      <div className={styles.sapphireOrbSecondary} />
      <div ref={auraRef} className={styles.interactiveAura} />
      <div className={styles.grid3d} />
    </div>
  );
}