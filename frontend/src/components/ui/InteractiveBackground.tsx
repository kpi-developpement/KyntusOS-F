"use client";

import { useEffect, useRef } from "react";

/**
 * KYNTUS AERO FIELD — fond interactif clair (60% blanc / 40% bleu).
 *
 *  1. Aurores bleues qui dérivent lentement et se penchent vers le curseur
 *  2. Grille de points qui s'allume en halo autour du curseur
 *  3. Réseau de particules bleues, aimanté par la souris
 *  4. Ondes au clic
 *
 * Pause quand l'onglet est caché, une seule image fixe si l'utilisateur
 * préfère les animations réduites.
 */
export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const GRID = 30;
    const SPOT = 200;
    const LINK = 140;

    let w = 0, h = 0, dpr = 1, raf = 0, t = 0;
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };

    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let parts: P[] = [];
    const ripples: { x: number; y: number; r: number; a: number }[] = [];

    const blobs = [
      { x: 0.15, y: 0.2, r: 0.42, c: "59,130,246", a: 0.16, sp: 0.00021, ph: 0 },
      { x: 0.85, y: 0.15, r: 0.38, c: "14,165,233", a: 0.13, sp: 0.00017, ph: 2 },
      { x: 0.7, y: 0.85, r: 0.46, c: "37,99,235", a: 0.12, sp: 0.00013, ph: 4 },
      { x: 0.2, y: 0.9, r: 0.34, c: "99,102,241", a: 0.08, sp: 0.00019, ph: 1 },
    ];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(70, (w * h) / 26000));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.8,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Lissage du curseur (inertie douce)
      if (mouse.active) {
        mouse.sx += (mouse.x - mouse.sx) * 0.12;
        mouse.sy += (mouse.y - mouse.sy) * 0.12;
      }
      const mx = mouse.active ? mouse.sx / w - 0.5 : 0;
      const my = mouse.active ? mouse.sy / h - 0.5 : 0;

      // 1. Aurores
      for (const b of blobs) {
        const bx = (b.x + Math.sin(t * b.sp * 60 + b.ph) * 0.06 + mx * 0.06) * w;
        const by = (b.y + Math.cos(t * b.sp * 50 + b.ph) * 0.06 + my * 0.06) * h;
        const br = b.r * Math.max(w, h);
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, `rgba(${b.c},${b.a})`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // 2. Grille de points + halo curseur
      const ox = (t * 0.15) % GRID;
      for (let x = -GRID + ox; x < w + GRID; x += GRID) {
        for (let y = 0; y < h + GRID; y += GRID) {
          let a = 0.13, r = 1;
          if (mouse.active) {
            const dx = x - mouse.sx, dy = y - mouse.sy;
            const d2 = dx * dx + dy * dy;
            if (d2 < SPOT * SPOT) {
              const k = 1 - Math.sqrt(d2) / SPOT;
              a += k * 0.55;
              r += k * 1.4;
            }
          }
          ctx.fillStyle = `rgba(37,99,235,${a})`;
          ctx.fillRect(x - r / 2, y - r / 2, r, r);
        }
      }

      // 3. Particules
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (!reduced) {
          if (mouse.active) {
            const dx = mouse.sx - p.x, dy = mouse.sy - p.y;
            const d = Math.hypot(dx, dy);
            if (d < 220 && d > 1) {
              p.vx += (dx / d) * 0.012;
              p.vy += (dy / d) * 0.012;
            }
          }
          p.vx *= 0.992; p.vy *= 0.992;
          if (Math.hypot(p.vx, p.vy) < 0.08) { p.vx += (Math.random() - 0.5) * 0.05; p.vy += (Math.random() - 0.5) * 0.05; }
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        }

        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j];
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(59,130,246,${(1 - d / LINK) * 0.22})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        if (mouse.active) {
          const d = Math.hypot(mouse.sx - p.x, mouse.sy - p.y);
          if (d < SPOT) {
            ctx.strokeStyle = `rgba(14,165,233,${(1 - d / SPOT) * 0.45})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.sx, mouse.sy); ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(29,78,216,0.55)";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }

      // Lueur du curseur
      if (mouse.active) {
        const g = ctx.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, 160);
        g.addColorStop(0, "rgba(255,255,255,0.55)");
        g.addColorStop(0.4, "rgba(147,197,253,0.18)");
        g.addColorStop(1, "rgba(147,197,253,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mouse.sx, mouse.sy, 160, 0, Math.PI * 2); ctx.fill();
      }

      // 4. Ondes au clic
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 4.5; rp.a *= 0.94;
        ctx.strokeStyle = `rgba(37,99,235,${rp.a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
        if (rp.a < 0.02) ripples.splice(i, 1);
      }
    };

    const loop = () => {
      t++;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      if (!mouse.active) { mouse.sx = e.clientX; mouse.sy = e.clientY; }
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
      if (reduced) draw();
    };
    const onLeave = () => { mouse.active = false; if (reduced) draw(); };
    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      ripples.push({ x: e.clientX, y: e.clientY, r: 4, a: 0.45 });
      for (const p of parts) {
        const dx = p.x - e.clientX, dy = p.y - e.clientY;
        const d = Math.hypot(dx, dy);
        if (d < 180 && d > 1) { p.vx += (dx / d) * 2.2; p.vy += (dy / d) * 2.2; }
      }
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(loop);
    };

    resize();
    if (reduced) draw(); else raf = requestAnimationFrame(loop);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        background: "linear-gradient(160deg, #ffffff 0%, #f5f9ff 45%, #e8f1ff 100%)",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
