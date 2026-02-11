"use client";

import { useEffect, useRef } from "react";

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    
    // Configuration "Luxe" (Machi m3iy9a)
    const particleCount = 60; // 9llina l3adad bach tban n9iya
    const connectionDistance = 150;
    const mouseDistance = 200;

    // Souris
    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        // Vitesse btiii2a bzzaf (Smooth)
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.size = Math.random() * 1.5 + 0.5; // No9at sghar
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Rebondir 3la ljanb
        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        // Couleur Grise-Bleutée khfifa
        ctx.fillStyle = "rgba(100, 116, 139, 0.4)"; 
        ctx.fill();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Gradient Background Subtle (Noir -> Bleu Nuit Trés Foncé)
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0, 
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      gradient.addColorStop(0, "#0a101f"); // Centre (Dark Blue)
      gradient.addColorStop(1, "#02040a"); // Bords (Black)
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        p.update();
        p.draw();

        // 1. Connection entre particules (Network effect)
        for (let j = index; j < particles.length; j++) {
          const dx = particles[j].x - p.x;
          const dy = particles[j].y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            // Ligne r9i9a w transparente bzzaf
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.1 - distance/connectionDistance * 0.1})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        // 2. Interaction avec la souris (Cyan Glow)
        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < mouseDistance) {
            ctx.beginPath();
            // Ligne Cyan (Kyntus Color) mli t9rreb la souris
            const opacity = (1 - distMouse / mouseDistance) * 0.3;
            ctx.strokeStyle = `rgba(0, 243, 255, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    window.addEventListener("resize", init);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", init);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1, // Dima lor
        pointerEvents: "none", // Bach matblockich l click
      }}
    />
  );
}