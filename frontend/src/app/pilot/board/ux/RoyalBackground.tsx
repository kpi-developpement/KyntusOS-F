"use client";

import React, { useEffect, useRef, useState } from "react";
import styles from "./RoyalBackground.module.css";

// Light interactive background: a glow follows the mouse (1 transform per
// frame max, passive listener), orbs float slowly, all paused when hidden.
export default function RoyalBackground() {
  const auraRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let rafId: number | null = null;
    let x = -1000;
    let y = -1000;

    const apply = () => {
      if (auraRef.current) auraRef.current.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
      rafId = null;
    };
    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (rafId === null) rafId = requestAnimationFrame(apply);
    };
    const onVisibility = () => setPaused(document.hidden);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className={`${styles.container} ${paused ? styles.paused : ""}`} aria-hidden>
      <div className={styles.topBeam} />
      <div className={`${styles.orb} ${styles.sapphireOrbPrimary}`} />
      <div className={`${styles.orb} ${styles.sapphireOrbSecondary}`} />
      <div ref={auraRef} className={styles.interactiveAura} />
      <div className={styles.grid3d} />
    </div>
  );
}