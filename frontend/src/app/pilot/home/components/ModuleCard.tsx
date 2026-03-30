"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export default function ModuleCard({ mod, variants }: any) {
  const router = useRouter();
  const Icon = mod.icon;

  return (
    <motion.div 
      variants={variants}
      onClick={() => router.push(mod.path)}
      style={{
        background: "rgba(10, 15, 30, 0.6)",
        border: `1px solid rgba(255,255,255,0.05)`,
        borderLeft: `4px solid ${mod.color}`,
        borderRadius: "12px",
        padding: "2rem",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        backdropFilter: "blur(12px)",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "240px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-10px)";
        e.currentTarget.style.boxShadow = `0 20px 40px rgba(0,0,0,0.8), inset 0 0 20px ${mod.color}20`;
        e.currentTarget.style.borderColor = `${mod.color}80`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
      }}
    >
      {/* Background Glow */}
      <div style={{ position: "absolute", top: "-50%", right: "-50%", width: "100%", height: "100%", background: `radial-gradient(circle, ${mod.color}15 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }}></div>

      <div style={{ position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div style={{ padding: "12px", background: `${mod.color}15`, borderRadius: "12px", border: `1px solid ${mod.color}40`, boxShadow: `0 0 15px ${mod.color}30` }}>
            <Icon size={32} color={mod.color} style={{ filter: `drop-shadow(0 0 8px ${mod.color})` }} />
          </div>
          <span style={{ fontSize: "0.7rem", fontFamily: "monospace", fontWeight: "bold", padding: "4px 10px", background: `${mod.color}15`, color: mod.color, border: `1px solid ${mod.color}50`, borderRadius: "50px", letterSpacing: "1px", textShadow: `0 0 5px ${mod.color}` }}>
            {mod.status}
          </span>
        </div>

        <h2 style={{ color: "#fff", margin: "0 0 10px 0", fontSize: "1.5rem", fontFamily: "monospace", letterSpacing: "2px", fontWeight: "900", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>
          {mod.title}
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0, lineHeight: "1.5" }}>
          {mod.desc}
        </p>
      </div>

      <div style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", gap: "8px", marginTop: "1.5rem", color: mod.color, fontFamily: "monospace", fontWeight: "bold", fontSize: "0.9rem", letterSpacing: "1px" }}>
        <span>ACCESS CORE</span>
        <motion.div animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <ArrowRight size={18} />
        </motion.div>
      </div>
    </motion.div>
  );
}