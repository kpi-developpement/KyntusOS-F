"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * 🔥 120 FPS INTERACTIVE DARK-MODE CANVAS 🔥
 * Specifically tuned to blend with the parent's `#02040a` deep black background.
 * Uses a deep Midnight Blue gradient and Electric Cyan interactive nodes.
 */
const InteractiveDarkCanvas = React.memo(({ overlayRef }: { overlayRef: React.RefObject<HTMLDivElement | null> }) => {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      active: false
    };

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
    }

    interface Shockwave {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
    }

    // High-contrast neon palette for dark mode
    const palette = ["#0ea5e9", "#0284c7", "#38bdf8", "#7dd3fc", "#0369a1"];
    const particleCount = Math.min(65, Math.floor((width * height) / 22000));
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.75,
      vy: (Math.random() - 0.5) * 0.75,
      radius: Math.random() * 2.2 + 1.2,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: Math.random() * 0.6 + 0.3
    }));

    const shockwaves: Shockwave[] = [];

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseDown = (e: MouseEvent) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 4,
        maxRadius: 240,
        alpha: 0.55
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      // 1. Ambient Cursor Spotlight (Electric Blue Glow on Deep Black)
      const spotlight = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 450);
      spotlight.addColorStop(0, "rgba(2, 132, 199, 0.15)");
      spotlight.addColorStop(0.45, "rgba(14, 165, 233, 0.05)");
      spotlight.addColorStop(1, "rgba(2, 4, 10, 0)"); // Matches your PilotLayout background
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);

      // 2. Interactive Dot Matrix
      const gridSpacing = 48;
      const startX = Math.max(0, Math.floor((mouse.x - 280) / gridSpacing) * gridSpacing);
      const endX = Math.min(width, Math.ceil((mouse.x + 280) / gridSpacing) * gridSpacing);
      const startY = Math.max(0, Math.floor((mouse.y - 280) / gridSpacing) * gridSpacing);
      const endY = Math.min(height, Math.ceil((mouse.y + 280) / gridSpacing) * gridSpacing);

      for (let gx = startX; gx <= endX; gx += gridSpacing) {
        for (let gy = startY; gy <= endY; gy += gridSpacing) {
          const dx = gx - mouse.x;
          const dy = gy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 260) {
            const intensity = (1 - dist / 260) * 0.55;
            ctx.fillStyle = `rgba(56, 189, 248, ${intensity})`;
            ctx.beginPath();
            ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 6.5;
        sw.alpha *= 0.93;
        ctx.strokeStyle = `rgba(56, 189, 248, ${sw.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        if (sw.radius >= sw.maxRadius || sw.alpha < 0.01) {
          shockwaves.splice(i, 1);
        }
      }

      // 4. Constellation Nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < 220 && distMouse > 5) {
          const force = (220 - distMouse) / 220;
          ctx.strokeStyle = `rgba(14, 165, 233, ${force * 0.4})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const lineAlpha = (1 - dist / 140) * 0.25;
            ctx.strokeStyle = `rgba(2, 132, 199, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [mounted]);

  if (!mounted) return null;

  // Render directly into the page layer (not via portal) to respect the layout bounds
  return (
    <div 
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: -1, 
        pointerEvents: "none", 
        overflow: "hidden"
      }}
    >
      {/* Base Architectural Gradient matching parent #02040a */}
      <div 
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(at 0% 0%, rgba(2, 132, 199, 0.08) 0px, transparent 60%),
            radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.06) 0px, transparent 60%),
            linear-gradient(to right, rgba(15, 23, 42, 0.8) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
          zIndex: 1
        }}
      />
      <div 
        ref={overlayRef} 
        style={{ 
          position: "absolute", 
          inset: 0, 
          backgroundColor: "transparent", 
          transition: "background-color 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 2
        }} 
      />
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: "absolute", 
          inset: 0, 
          width: "100%", 
          height: "100%",
          zIndex: 3 
        }} 
      />
    </div>
  );
});

InteractiveDarkCanvas.displayName = "InteractiveDarkCanvas";

export default InteractiveDarkCanvas;
