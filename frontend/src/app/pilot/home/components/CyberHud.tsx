"use client";

import React, { useEffect, useRef } from "react";
import gsap from "sc"; // Wait, it's just "gsap"
import { gsap as gsapCore } from "gsap";

export default function CyberHud({ activeColor }: { activeColor: string | null }) {
  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);
  const ring3Ref = useRef<HTMLDivElement>(null);
  
  const color = activeColor || "#00f0ff";

  useEffect(() => {
    // GSAP Infinite Rotations
    gsapCore.to(ring1Ref.current, { rotation: 360, duration: 20, repeat: -1, ease: "linear" });
    gsapCore.to(ring2Ref.current, { rotation: -360, duration: 15, repeat: -1, ease: "linear" });
    gsapCore.to(ring3Ref.current, { rotation: 360, duration: 10, repeat: -1, ease: "linear" });
  }, []);

  return (
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "600px", height: "600px", pointerEvents: "none", zIndex: 0, opacity: 0.15, transition: "opacity 0.5s ease" }}>
      
      {/* 🔮 Center Glow */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "150px", height: "150px", borderRadius: "50%", background: color, filter: "blur(60px)", transition: "background 0.5s ease" }} />

      {/* ⚙️ Outer Ring (Dashed) */}
      <div ref={ring1Ref} style={{ position: "absolute", inset: "0", borderRadius: "50%", border: `2px dashed ${color}`, transition: "border-color 0.5s ease", opacity: 0.3 }} />
      
      {/* ⚙️ Middle Ring (Dotted) */}
      <div ref={ring2Ref} style={{ position: "absolute", inset: "100px", borderRadius: "50%", border: `4px dotted ${color}`, transition: "border-color 0.5s ease", opacity: 0.5 }} />
      
      {/* ⚙️ Inner Ring (Solid segments) */}
      <div ref={ring3Ref} style={{ position: "absolute", inset: "180px", borderRadius: "50%", borderTop: `4px solid ${color}`, borderBottom: `4px solid ${color}`, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", transition: "border-color 0.5s ease", opacity: 0.8 }} />

      {/* 🎯 Crosshairs */}
      <div style={{ position: "absolute", top: "50%", left: "0", right: "0", height: "1px", background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.5, transition: "background 0.5s ease" }} />
      <div style={{ position: "absolute", left: "50%", top: "0", bottom: "0", width: "1px", background: `linear-gradient(180deg, transparent, ${color}, transparent)`, opacity: 0.5, transition: "background 0.5s ease" }} />
      
    </div>
  );
}