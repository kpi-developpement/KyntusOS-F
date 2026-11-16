"use client";

import { useEffect, useRef } from "react";
import styles from "./Tracer.module.css";

// ============================================================================
// 🌊 TRACER BACKGROUND — white canvas, blue data-nodes that react to the cursor
//    · hover  : nodes get attracted + linked to the cursor
//    · click  : ripple wave that pushes nodes away
//    · pulse  : `pulseKey` change (ex: new search) fires a wave from center
// ============================================================================

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Ripple {
  x: number;
  y: number;
  t: number;
}

export default function TracerBackground({ pulseKey = 0 }: { pulseKey?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);

  useEffect(() => {
    if (pulseKey === 0) return;
    ripplesRef.current.push({ x: window.innerWidth / 2, y: window.innerHeight / 3, t: 0 });
  }, [pulseKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let nodes: Node[] = [];
    const mouse = { x: -9999, y: -9999, active: false };
    let raf = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(110, (w * h) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.2 + Math.random() * 2.2,
      }));
    };

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget) return; // still inside the window
      mouse.active = false;
      mouse.x = mouse.y = -9999;
    };
    const onClick = (e: MouseEvent) => {
      ripplesRef.current.push({ x: e.clientX, y: e.clientY, t: 0 });
    };

    const LINK = 130;
    const MOUSE_R = 190;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Ripples
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.t += 1;
        const radius = rp.t * 9;
        const alpha = Math.max(0, 0.35 - rp.t / 160);
        if (alpha <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      for (const n of nodes) {
        // cursor attraction
        if (mouse.active) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_R && d > 1) {
            const f = (1 - d / MOUSE_R) * 0.025;
            n.vx += (dx / d) * f;
            n.vy += (dy / d) * f;
          }
        }
        // ripple push
        for (const rp of ripples) {
          const dx = n.x - rp.x;
          const dy = n.y - rp.y;
          const d = Math.hypot(dx, dy);
          const front = rp.t * 9;
          if (Math.abs(d - front) < 30 && d > 1) {
            n.vx += (dx / d) * 0.6;
            n.vy += (dy / d) * 0.6;
          }
        }

        n.vx *= 0.985;
        n.vy *= 0.985;
        // keep a minimum drift
        if (Math.abs(n.vx) < 0.05) n.vx += (Math.random() - 0.5) * 0.04;
        if (Math.abs(n.vy) < 0.05) n.vy += (Math.random() - 0.5) * 0.04;
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }

      // links
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const al = (1 - Math.sqrt(d2) / LINK) * 0.22;
            ctx.strokeStyle = `rgba(59, 130, 246, ${al})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        if (mouse.active) {
          const d = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (d < MOUSE_R) {
            ctx.strokeStyle = `rgba(23, 70, 196, ${(1 - d / MOUSE_R) * 0.45})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const near = mouse.active && Math.hypot(n.x - mouse.x, n.y - mouse.y) < MOUSE_R;
        ctx.beginPath();
        ctx.arc(n.x, n.y, near ? n.r + 1.2 : n.r, 0, Math.PI * 2);
        ctx.fillStyle = near ? "rgba(23, 70, 196, 0.9)" : "rgba(59, 130, 246, 0.55)";
        ctx.fill();
      }

      // cursor halo
      if (mouse.active) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_R);
        g.addColorStop(0, "rgba(59, 130, 246, 0.10)");
        g.addColorStop(1, "rgba(59, 130, 246, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, MOUSE_R, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    window.addEventListener("mousedown", onClick);
    document.addEventListener("visibilitychange", onVisibility);
    if (reduce) {
      draw();
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("mousedown", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className={styles.bg} aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  );
}
