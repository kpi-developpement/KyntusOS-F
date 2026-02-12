"use client";
import { useEffect, useRef } from "react";

export default function GlobalWarp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    
    const stars: any[] = [];
    const numStars = 200;
    const speed = 2; // Sor3a

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * width, 
        o: '0.'+Math.floor(Math.random() * 99) + 1
      });
    }

    const animate = () => {
      ctx.fillStyle = "#050a10"; // Dark Blue/Black Background
      ctx.fillRect(0, 0, width, height);

      stars.forEach((star) => {
        star.z -= speed;
        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width;
          star.y = Math.random() * height;
        }

        const x = (star.x - width / 2) * (width / star.z);
        const y = (star.y - height / 2) * (width / star.z);
        const s = 1.5 * (width / star.z);

        ctx.beginPath();
        ctx.fillStyle = "rgba(0, 242, 234, " + star.o + ")";
        ctx.arc(x + width / 2, y + height / 2, s, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: -1 }} />;
}