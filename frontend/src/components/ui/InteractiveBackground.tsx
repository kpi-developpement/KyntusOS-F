"use client";

import { useEffect, useRef } from "react";
import styles from "./InteractiveBackground.module.css";

/**
 * KYNTUS AERO FIELD — fond interactif, version performante.
 *
 * Avant : chaque image redessinait 4 dégradés plein écran + ~2 600 points de grille
 * sur un canvas → main thread saturé, saccades au clic.
 *
 * Maintenant :
 *  - aurores, grille de points et halo du curseur = couches CSS composées par le GPU
 *    (seule une `transform` bouge, aucun repaint)
 *  - canvas réservé au petit réseau de particules (≤ 46), en DPR 1
 *  - la boucle s'arrête quand l'onglet est caché, et dort quand rien ne bouge
 */
export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const LINK = 130;
    const SPOT = 180;
    let w = 0, h = 0, raf = 0, running = false;
    const mouse = { x: -9999, y: -9999, active: false };

    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let parts: P[] = [];
    const ripples: { x: number; y: number; r: number; a: number }[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      const count = Math.round(Math.min(46, (w * h) / 34000));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.8,
      }));
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 0.8;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          const dx = q.x - p.x, dy = q.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.strokeStyle = `rgba(59,130,246,${((1 - Math.sqrt(d2) / LINK) * 0.2).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        if (mouse.active) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < SPOT * SPOT) {
            ctx.strokeStyle = `rgba(14,165,233,${((1 - Math.sqrt(d2) / SPOT) * 0.4).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(29,78,216,0.5)";
      for (const p of parts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.lineWidth = 1.5;
      for (const rp of ripples) {
        ctx.strokeStyle = `rgba(37,99,235,${rp.a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
      }
    };

    const step = () => {
      let moving = mouse.active || ripples.length > 0;
      for (const p of parts) {
        if (mouse.active) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 200 * 200 && d2 > 1) { const d = Math.sqrt(d2); p.vx += (dx / d) * 0.01; p.vy += (dy / d) * 0.01; }
        }
        p.vx *= 0.99; p.vy *= 0.99;
        const sp = Math.abs(p.vx) + Math.abs(p.vy);
        if (sp < 0.1) { p.vx += (Math.random() - 0.5) * 0.04; p.vy += (Math.random() - 0.5) * 0.04; }
        if (sp > 0.12) moving = true;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].r += 5; ripples[i].a *= 0.92;
        if (ripples[i].a < 0.02) ripples.splice(i, 1);
      }
      return moving;
    };

    // ~30 images/s suffisent à une dérive lente : la moitié du coût, imperceptible
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 32) return;
      last = t;
      step();
      draw();
    };
    const start = () => { if (!running && !reduced && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
      // Halo + parallaxe des aurores : transform uniquement (composé GPU)
      if (spotRef.current) spotRef.current.style.transform = `translate3d(${e.clientX - 260}px, ${e.clientY - 260}px, 0)`;
      if (layerRef.current) {
        const px = (e.clientX / w - 0.5) * 24, py = (e.clientY / h - 0.5) * 24;
        layerRef.current.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      }
      start();
    };
    const onLeave = () => { mouse.active = false; if (spotRef.current) spotRef.current.style.transform = "translate3d(-9999px,-9999px,0)"; };
    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      ripples.push({ x: e.clientX, y: e.clientY, r: 4, a: 0.4 });
      start();
    };
    const onVis = () => (document.hidden ? stop() : start());

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className={styles.root} aria-hidden="true">
      <div ref={layerRef} className={styles.auroras}>
        <span className={styles.a1} />
        <span className={styles.a2} />
        <span className={styles.a3} />
      </div>
      <div className={styles.grid} />
      <div ref={spotRef} className={styles.spot} />
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
