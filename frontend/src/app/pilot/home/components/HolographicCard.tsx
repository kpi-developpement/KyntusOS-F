"use client";

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export default function HolographicCard({ mod, index, onHoverStart, onHoverEnd, onClick }: any) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const Icon = mod.icon;

  // L-Mouteur d-l-Mayaan (3D Tilt Effect) - Real 3D Math
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotation 3D (Inversée pour suivre la souris naturellement)
    const rotateX = ((y - centerY) / centerY) * -12; 
    const rotateY = ((x - centerX) / centerX) * 12;

    cardRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onHoverEnd) onHoverEnd();
    if (!cardRef.current) return;
    cardRef.current.style.transform = `rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onHoverStart) onHoverStart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 30 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, type: "spring" }}
      style={{ perspective: "1500px", zIndex: isHovered ? 50 : 1 }} // Perspective D-BSA7
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          width: "100%",
          minHeight: "260px",
          position: "relative",
          cursor: "pointer",
          transformStyle: "preserve-3d", // Hadchi li kaykhelli l-elements y-banou 3D
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* 🤖 TRANSFORMER PART 1: L-BASE (L-Lour) 🤖 */}
        <div style={{
          position: "absolute", inset: 0,
          background: isHovered ? "rgba(6, 10, 20, 0.9)" : "rgba(10, 15, 30, 0.6)",
          border: `1px solid ${isHovered ? mod.color : 'rgba(255,255,255,0.05)'}`,
          borderRadius: "16px",
          backdropFilter: "blur(20px)",
          transform: "translateZ(0px)", // Base à 0px
          boxShadow: isHovered 
            ? `0 30px 60px rgba(0,0,0,0.9), 0 0 40px ${mod.color}30, inset 0 0 20px ${mod.color}20` 
            : "0 10px 30px rgba(0,0,0,0.5)",
          transition: "all 0.4s ease"
        }}>
          {/* L-Khotout d-l-Grid */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${mod.color}15 1px, transparent 1px), linear-gradient(90deg, ${mod.color}15 1px, transparent 1px)`, backgroundSize: "20px 20px", opacity: isHovered ? 1 : 0.2, transition: "opacity 0.4s ease", borderRadius: "16px" }}></div>
        </div>

        {/* 🤖 TRANSFORMER PART 2: TOP MECHA FLAP (Kay-t7ell l-foq) 🤖 */}
        <div style={{
          position: "absolute", top: "-10px", left: "10%", right: "10%", height: "20px",
          background: mod.color,
          clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0% 100%)",
          transform: isHovered ? "translateZ(30px) translateY(-15px) rotateX(20deg)" : "translateZ(0px) translateY(10px) rotateX(0deg)",
          opacity: isHovered ? 0.8 : 0,
          transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          boxShadow: `0 0 15px ${mod.color}`
        }} />

        {/* 🤖 TRANSFORMER PART 3: BOTTOM MECHA FLAP (Kay-t7ell l-te7t) 🤖 */}
        <div style={{
          position: "absolute", bottom: "-10px", left: "10%", right: "10%", height: "20px",
          background: mod.color,
          clipPath: "polygon(0 0, 100% 0, 90% 100%, 10% 100%)",
          transform: isHovered ? "translateZ(30px) translateY(15px) rotateX(-20deg)" : "translateZ(0px) translateY(-10px) rotateX(0deg)",
          opacity: isHovered ? 0.8 : 0,
          transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          boxShadow: `0 0 15px ${mod.color}`
        }} />

        {/* 🚀 L-ICONE HOLOGRAPHIQUE (Kat-khrej l-Gddam b-zaaaaf) 🚀 */}
        <div style={{ 
          position: "absolute", top: "1.5rem", right: "1.5rem", 
          transform: isHovered ? "translateZ(90px) rotateY(-15deg)" : "translateZ(10px) rotateY(0deg)",
          transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          filter: isHovered ? `drop-shadow(0 0 25px ${mod.color})` : "none"
        }}>
          <Icon size={isHovered ? 80 : 50} color={mod.color} style={{ opacity: isHovered ? 0.9 : 0.2, transition: "all 0.5s" }} />
        </div>

        {/* 📄 L-CONTENU (Textes w status) Kat-khrej chwia l-Gddam 📄 */}
        <div style={{ 
          position: "absolute", inset: 0, padding: "2rem",
          display: "flex", flexDirection: "column",
          transform: isHovered ? "translateZ(50px)" : "translateZ(20px)",
          transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          pointerEvents: "none"
        }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
            <span style={{ fontSize: "0.75rem", fontFamily: "monospace", fontWeight: "900", padding: "6px 12px", background: isHovered ? `${mod.color}20` : "rgba(255,255,255,0.05)", color: isHovered ? mod.color : "#94a3b8", borderRadius: "4px", letterSpacing: "2px", border: `1px solid ${isHovered ? mod.color : 'transparent'}`, textShadow: isHovered ? `0 0 5px ${mod.color}` : "none", transition: "all 0.3s" }}>
              {mod.model}
            </span>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: mod.status === "ONLINE" || mod.status === "SECURE" ? "#39ff14" : "#f59e0b", boxShadow: `0 0 10px ${mod.status === "ONLINE" || mod.status === "SECURE" ? "#39ff14" : "#f59e0b"}` }}></div>
          </div>

          <h2 style={{ color: "#fff", margin: "0 0 10px 0", fontSize: "1.8rem", fontFamily: "monospace", letterSpacing: "2px", fontWeight: "900", textShadow: isHovered ? `0 0 20px ${mod.color}` : "none", transition: "all 0.3s ease" }}>
            {mod.title}
          </h2>
          <p style={{ color: isHovered ? "#f8fafc" : "#64748b", fontSize: "0.95rem", margin: 0, lineHeight: "1.6", fontFamily: "sans-serif", maxWidth: "85%", transition: "all 0.3s ease" }}>
            {mod.desc}
          </p>

          {/* BOUTON FLOTTANT L-TE7T */}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: "10px", color: isHovered ? mod.color : "#475569", fontFamily: "monospace", fontWeight: "900", fontSize: "1.1rem", letterSpacing: "2px", transition: "all 0.3s ease", transform: isHovered ? "translateZ(20px)" : "translateZ(0px)" }}>
            <span>{isHovered ? "ENGAGE PROTOCOL" : "STANDBY"}</span>
            <motion.div animate={{ x: isHovered ? [0, 10, 0] : 0 }} transition={{ repeat: Infinity, duration: 1 }}>
              <ArrowUpRight size={22} style={{ filter: isHovered ? `drop-shadow(0 0 8px ${mod.color})` : "none" }} />
            </motion.div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}