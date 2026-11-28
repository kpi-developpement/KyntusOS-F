"use client";

import { useEffect, useRef } from "react";
import styles from "./InteractiveBackground.module.css";

/**
 * KYNTUS AERO FIELD — fond 100 % CSS composité par le GPU.
 * Aucun canvas, aucune boucle par image : le JS ne fait que déplacer deux
 * couches (transform) au mouvement de la souris et poser une onde au clic.
 */
const SPARKS = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 37 + 11) % 100,
  size: 3 + (i % 4),
  dur: 14 + (i % 7) * 3,
  delay: -(i * 1.7),
}));

export default function InteractiveBackground() {
  const spotRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0, mx = -9999, my = -9999;
    const apply = () => {
      raf = 0;
      if (spotRef.current) spotRef.current.style.transform = `translate3d(${mx - 300}px, ${my - 300}px, 0)`;
      if (layerRef.current) {
        const px = (mx / window.innerWidth - 0.5) * 28, py = (my / window.innerHeight - 0.5) * 28;
        layerRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
    };
    const onMove = (e: PointerEvent) => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(apply); };
    const onLeave = () => { mx = my = -9999; if (!raf) raf = requestAnimationFrame(apply); };
    const onDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const r = document.createElement("span");
      r.className = styles.ripple;
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      root.appendChild(r);
      r.addEventListener("animationend", () => r.remove(), { once: true });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <div ref={layerRef} className={styles.auroras}>
        <span className={styles.a1} />
        <span className={styles.a2} />
        <span className={styles.a3} />
        <span className={styles.a4} />
      </div>
      <div className={styles.beams}>
        <span /><span /><span />
      </div>
      <div className={styles.grid} />
      <div className={styles.sparks}>
        {SPARKS.map((s, i) => (
          <i key={i} style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
        ))}
      </div>
      <div ref={spotRef} className={styles.spot} />
      <div className={styles.vignette} />
    </div>
  );
}
