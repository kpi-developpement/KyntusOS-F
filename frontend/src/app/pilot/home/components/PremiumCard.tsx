"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function PremiumCard({ mod, onClick, onHoverStart, onHoverEnd }: any) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const Icon = mod.icon;

  // 🖱️ L-Mouteur dyal d-do li kay-tba3 s-souris
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // ⌨️ Ila l-Pilote kheddam b' l-Clavier (Accessibility)
  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(1);
    if (onHoverStart) onHoverStart();
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
    if (onHoverEnd) onHoverEnd();
  };

  // 🖱️ Mlli kat-dkhel s-souris
  const handleMouseEnter = () => {
    setOpacity(1);
    if (onHoverStart) onHoverStart(); // 👈 Kay-3yyt l-Home Page bash t-beddel loun l-Fada2 w l-HUD
  };

  // 🖱️ Mlli kat-khrej s-souris
  const handleMouseLeave = () => {
    setOpacity(0);
    if (onHoverEnd) onHoverEnd(); // 👈 Kay-rje3 l-loun l-asli
  };

  return (
    <div
      ref={divRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "260px",
        padding: "2rem",
        borderRadius: "16px",
        backgroundColor: "rgba(15, 23, 42, 0.4)", // Dark slate nqiiii (Glassmorphism)
        border: "1px solid rgba(255, 255, 255, 0.05)",
        cursor: "pointer",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        // 💎 Custom Easing Curve bash y-t-hz b-slasa (Apple Style)
        transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s ease, box-shadow 0.4s ease",
        transform: opacity === 1 ? "translateY(-6px)" : "translateY(0px)",
        boxShadow: opacity === 1 ? `0 20px 40px rgba(0,0,0,0.4), 0 0 30px ${mod.color}15` : "0 10px 30px rgba(0,0,0,0.2)",
      }}
    >
      {/* 🔦 SPOTLIGHT EFFECT (D-do kay-tba3 s-souris f' l-Background) 🔦 */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          opacity: opacity, transition: "opacity 0.4s ease", pointerEvents: "none",
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${mod.color}25, transparent 40%)`,
        }}
      />
      {/* 🔦 BORDER SPOTLIGHT (Kay-dwi ghir l-7washi mlli kat-dowez s-souris) 🔦 */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 0,
          opacity: opacity, transition: "opacity 0.4s ease", pointerEvents: "none",
          borderRadius: "16px", padding: "1px",
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${mod.color}80, transparent 40%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* 📄 CONTENU DYAL L-CARTE (Z-index foq mn d-do) 📄 */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          
          {/* L-Icone */}
          <div style={{ 
            padding: "12px", borderRadius: "12px", 
            backgroundColor: opacity === 1 ? `${mod.color}20` : "rgba(255, 255, 255, 0.03)", 
            border: `1px solid ${opacity === 1 ? `${mod.color}50` : 'rgba(255,255,255,0.05)'}`,
            transition: "all 0.4s ease"
          }}>
            <Icon size={28} color={opacity === 1 ? mod.color : "#94a3b8"} style={{ transition: "color 0.4s ease" }} />
          </div>

          {/* L-Badge dyal l-Status */}
          <span style={{ 
            fontSize: "0.7rem", fontFamily: "monospace", fontWeight: "bold", padding: "4px 10px", 
            backgroundColor: opacity === 1 ? `${mod.color}15` : "rgba(255, 255, 255, 0.05)", 
            color: opacity === 1 ? mod.color : "#64748b", 
            borderRadius: "50px", letterSpacing: "1px",
            border: `1px solid ${opacity === 1 ? `${mod.color}40` : 'transparent'}`,
            transition: "all 0.4s ease"
          }}>
            {mod.status}
          </span>
        </div>

        <h2 style={{ color: "#f8fafc", margin: "0 0 8px 0", fontSize: "1.4rem", fontFamily: "monospace", letterSpacing: "1.5px", fontWeight: "800" }}>
          {mod.title}
        </h2>
        <p style={{ color: opacity === 1 ? "#cbd5e1" : "#64748b", fontSize: "0.9rem", margin: 0, lineHeight: "1.5", transition: "color 0.4s ease" }}>
          {mod.desc}
        </p>
      </div>

      {/* 🏹 BOUTON L-TE7T (Kay-t-7erk l-sshem f' L-Hover) 🏹 */}
      <div style={{ position: "relative", zIndex: 10, marginTop: "auto", display: "flex", alignItems: "center", gap: "8px", fontFamily: "monospace", fontWeight: "bold", fontSize: "0.9rem", letterSpacing: "1px", color: opacity === 1 ? mod.color : "#475569", transition: "color 0.4s ease" }}>
        <span>INITIALIZE</span>
        <motion.div animate={{ x: opacity === 1 ? [0, 5, 0] : 0 }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
          <ArrowUpRight size={18} />
        </motion.div>
      </div>
    </div>
  );
}