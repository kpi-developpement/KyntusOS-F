"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * 120 FPS INTERACTIVE TISSUE AURORA CANVAS
 * Signature Emerald / Jade / Teal weave lattice over deep #02040a obsidian.
 * Visually distinct from Kyntus Nexus (Electric Blue) while matching its smoothness.
 */
const InteractiveTissueCanvas = React.memo(({ overlayRef }: { overlayRef: React.RefObject<HTMLDivElement | null> }) => {
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

    interface FiberNode {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
      pulsePhase: number;
    }

    interface RippleWave {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
    }

    // Luminous Emerald / Jade / Mint / Champagne-Teal palette
    const palette = ["#10b981", "#14b8a6", "#34d399", "#2dd4bf", "#059669", "#a7f3d0"];
    const nodeCount = Math.min(72, Math.floor((width * height) / 20000));
    const nodes: FiberNode[] = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.65,
      vy: (Math.random() - 0.5) * 0.65,
      radius: Math.random() * 2.3 + 1.1,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: Math.random() * 0.55 + 0.3,
      pulsePhase: Math.random() * Math.PI * 2
    }));

    const ripples: RippleWave[] = [];

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
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 6,
        maxRadius: 260,
        alpha: 0.55
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });

    let frame = 0;

    const render = () => {
      frame += 0.025;
      ctx.clearRect(0, 0, width, height);

      mouse.x += (mouse.targetX - mouse.x) * 0.11;
      mouse.y += (mouse.targetY - mouse.y) * 0.11;

      // 1. Ambient Emerald-Teal Aurora Spotlight
      const spotlight = ctx.createRadialGradient(mouse.x, mouse.y, 12, mouse.x, mouse.y, 480);
      spotlight.addColorStop(0, "rgba(16, 185, 129, 0.15)");
      spotlight.addColorStop(0.45, "rgba(20, 184, 166, 0.06)");
      spotlight.addColorStop(1, "rgba(2, 4, 10, 0)");
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);

      // 2. Interactive Woven Diamond Crosshairs around cursor
      const spacing = 54;
      const startX = Math.max(0, Math.floor((mouse.x - 270) / spacing) * spacing);
      const endX = Math.min(width, Math.ceil((mouse.x + 270) / spacing) * spacing);
      const startY = Math.max(0, Math.floor((mouse.y - 270) / spacing) * spacing);
      const endY = Math.min(height, Math.ceil((mouse.y + 270) / spacing) * spacing);

      for (let gx = startX; gx <= endX; gx += spacing) {
        for (let gy = startY; gy <= endY; gy += spacing) {
          const offsetX = (Math.floor(gy / spacing) % 2) * (spacing / 2);
          const px = gx + offsetX;
          const dx = px - mouse.x;
          const dy = gy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            const intensity = (1 - dist / 250) * 0.5;
            ctx.fillStyle = `rgba(52, 211, 153, ${intensity})`;
            ctx.beginPath();
            ctx.moveTo(px, gy - 2.2);
            ctx.lineTo(px + 2.2, gy);
            ctx.lineTo(px, gy + 2.2);
            ctx.lineTo(px - 2.2, gy);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // 3. Double-Ring Ripple Waves on Click
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.radius += 6;
        rp.alpha *= 0.935;
        ctx.strokeStyle = `rgba(52, 211, 153, ${rp.alpha})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (rp.radius > 22) {
          ctx.strokeStyle = `rgba(45, 212, 191, ${rp.alpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.radius - 18, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (rp.radius >= rp.maxRadius || rp.alpha < 0.01) {
          ripples.splice(i, 1);
        }
      }

      // 4. Organic Silk-Weave Constellation Nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        const dxMouse = mouse.x - n.x;
        const dyMouse = mouse.y - n.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < 230 && distMouse > 5) {
          const force = (230 - distMouse) / 230;
          ctx.strokeStyle = `rgba(45, 212, 191, ${force * 0.42})`;
          ctx.lineWidth = 1.15;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 145) {
            const lineAlpha = (1 - dist / 145) * 0.24;
            ctx.strokeStyle = `rgba(16, 185, 129, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        const pulse = 0.8 + 0.2 * Math.sin(frame + n.pulsePhase);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = n.alpha * pulse;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
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
      {/* Signature Diagonal Woven Texture + Emerald-Teal Aurora Gradients */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(at 10% 0%, rgba(16, 185, 129, 0.11) 0px, transparent 58%),
            radial-gradient(at 92% 15%, rgba(20, 184, 166, 0.08) 0px, transparent 52%),
            radial-gradient(at 50% 100%, rgba(5, 150, 105, 0.07) 0px, transparent 55%),
            repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.025) 0px, rgba(16, 185, 129, 0.025) 1px, transparent 1px, transparent 36px),
            repeating-linear-gradient(-45deg, rgba(20, 184, 166, 0.025) 0px, rgba(20, 184, 166, 0.025) 1px, transparent 1px, transparent 36px)
          `,
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

InteractiveTissueCanvas.displayName = "InteractiveTissueCanvas";

export default InteractiveTissueCanvas;
