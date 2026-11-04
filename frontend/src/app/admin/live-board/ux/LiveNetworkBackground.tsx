"use client";

import React, { useEffect, useRef } from "react";

// ============================================================================
// LIVE NETWORK BACKGROUND — interactive canvas (70% white / 30% blue)
// Particles drift, link to each other and are attracted by the mouse.
// Perf: capped frame rate, links batched in 4 alpha buckets (4 strokes per
// frame instead of hundreds), pre-rendered glow sprite, DPR 1, paused when the
// tab is hidden. `calm` = fewer particles + lower FPS (used behind the table).
// ============================================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Props {
  calm?: boolean;
}

const LINK = 130;
const MOUSE_R = 180;
const BUCKETS = 4;

export default function LiveNetworkBackground({ calm = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calmRef = useRef(calm);

  useEffect(() => {
    calmRef.current = calm;
  }, [calm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mouse = { x: -9999, y: -9999, active: false };
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;

    // glow sprite rendered once
    const glow = document.createElement("canvas");
    glow.width = glow.height = 520;
    const g = glow.getContext("2d")!;
    const grad = g.createRadialGradient(260, 260, 0, 260, 260, 260);
    grad.addColorStop(0, "rgba(59,130,246,0.11)");
    grad.addColorStop(1, "rgba(59,130,246,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 520, 520);

    const targetCount = () => {
      const base = Math.floor((w * h) / 18000);
      return Math.max(24, Math.min(calmRef.current ? 45 : 85, base));
    };

    const spawn = (): Particle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.6 + 0.8,
    });

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      particles = Array.from({ length: targetCount() }, spawn);
    };

    const paths: Path2D[] = [];

    const draw = (time: number) => {
      raf = requestAnimationFrame(draw);
      const minDelta = calmRef.current ? 1000 / 24 : 1000 / 45;
      if (time - last < minDelta) return;
      last = time;

      // adapt particle count when switching calm mode
      const want = targetCount();
      if (particles.length > want) particles.length = want;
      else while (particles.length < want) particles.push(spawn());

      ctx.clearRect(0, 0, w, h);
      if (mouse.active) ctx.drawImage(glow, mouse.x - 260, mouse.y - 260);

      for (let b = 0; b < BUCKETS; b++) paths[b] = new Path2D();
      const mousePath = new Path2D();
      const dots = new Path2D();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reduceMotion) {
          if (mouse.active) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d < MOUSE_R && d > 1) {
              p.vx += (dx / d) * 0.014;
              p.vy += (dy / d) * 0.014;
            }
          }
          p.vx *= 0.995;
          p.vy *= 0.995;
          const speed = Math.hypot(p.vx, p.vy);
          if (speed < 0.08) {
            p.vx += (Math.random() - 0.5) * 0.05;
            p.vy += (Math.random() - 0.5) * 0.05;
          } else if (speed > 1.2) {
            p.vx *= 0.9;
            p.vy *= 0.9;
          }
          p.x += p.vx * 1.4;
          p.y += p.vy * 1.4;
          if (p.x < -20) p.x = w + 20;
          else if (p.x > w + 20) p.x = -20;
          if (p.y < -20) p.y = h + 20;
          else if (p.y > h + 20) p.y = -20;
        }

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          if (dx > LINK || dx < -LINK) continue;
          const dy = p.y - q.y;
          if (dy > LINK || dy < -LINK) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const a = 1 - Math.sqrt(d2) / LINK;
            const bucket = Math.min(BUCKETS - 1, Math.floor(a * BUCKETS));
            paths[bucket].moveTo(p.x, p.y);
            paths[bucket].lineTo(q.x, q.y);
          }
        }

        if (mouse.active) {
          const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          if (dm < MOUSE_R) {
            mousePath.moveTo(p.x, p.y);
            mousePath.lineTo(mouse.x, mouse.y);
          }
        }

        dots.moveTo(p.x + p.r, p.y);
        dots.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      }

      ctx.lineWidth = 1;
      for (let b = 0; b < BUCKETS; b++) {
        ctx.strokeStyle = `rgba(37,99,235,${((b + 0.5) / BUCKETS) * 0.2})`;
        ctx.stroke(paths[b]);
      }
      if (mouse.active) {
        ctx.strokeStyle = "rgba(29,78,216,0.16)";
        ctx.stroke(mousePath);
      }
      ctx.fillStyle = "rgba(37,99,235,0.5)";
      ctx.fill(dots);
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
    window.addEventListener("mousemove", onMove, { passive: true });
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
        contain: "strict",
        background:
          "radial-gradient(1200px 600px at 85% -10%, rgba(59,130,246,0.14), transparent 60%), radial-gradient(900px 500px at -10% 110%, rgba(37,99,235,0.10), transparent 60%), linear-gradient(180deg, #ffffff 0%, #f4f7fc 100%)",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}