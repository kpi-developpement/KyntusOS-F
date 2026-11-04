"use client";

import React, { useEffect, useRef } from "react";

// ============================================================================
// LIVE NETWORK BACKGROUND — interactive canvas (70% white / 30% blue)
// Particles drift, link to each other, and react to the mouse (attraction
// + glowing links). Pauses when the tab is hidden, respects reduced motion.
// ============================================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export default function LiveNetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const mouse = { x: -9999, y: -9999, active: false };
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.floor((w * h) / 16000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.8,
      }));
    };

    const LINK = 130;
    const MOUSE_R = 190;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // mouse glow
      if (mouse.active) {
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 260);
        g.addColorStop(0, "rgba(59,130,246,0.10)");
        g.addColorStop(1, "rgba(59,130,246,0)");
        ctx.fillStyle = g;
        ctx.fillRect(mouse.x - 260, mouse.y - 260, 520, 520);
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reduceMotion) {
          // gentle attraction to the mouse
          if (mouse.active) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d < MOUSE_R && d > 1) {
              p.vx += (dx / d) * 0.012;
              p.vy += (dy / d) * 0.012;
            }
          }
          p.vx *= 0.995;
          p.vy *= 0.995;
          const speed = Math.hypot(p.vx, p.vy);
          if (speed < 0.08) {
            p.vx += (Math.random() - 0.5) * 0.04;
            p.vy += (Math.random() - 0.5) * 0.04;
          }
          if (speed > 1.1) {
            p.vx *= 0.9;
            p.vy *= 0.9;
          }
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          if (p.y > h + 20) p.y = -20;
        }

        // links
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const a = 1 - Math.sqrt(d2) / LINK;
            ctx.strokeStyle = `rgba(37,99,235,${a * 0.18})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        // mouse links
        if (mouse.active) {
          const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (dm < MOUSE_R) {
            ctx.strokeStyle = `rgba(29,78,216,${(1 - dm / MOUSE_R) * 0.35})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = "rgba(37,99,235,0.55)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onLeave = () => {
      mouse.active = false;
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        background:
          "radial-gradient(1200px 600px at 85% -10%, rgba(59,130,246,0.14), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(37,99,235,0.10), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f4f7fc 100%)",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}