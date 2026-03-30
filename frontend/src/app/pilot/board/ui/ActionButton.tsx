"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "cyan" | "purple" | "disabled";
}

export default function ActionButton({ icon: Icon, label, onClick, disabled = false, variant = "cyan" }: ActionButtonProps) {
  const isCyan = variant === "cyan" && !disabled;
  const isPurple = variant === "purple" && !disabled;
  const mainColor = isCyan ? "#00f2ea" : isPurple ? "#b026ff" : "#64748b";
  const bgColor = isCyan ? "rgba(0, 242, 234, 0.1)" : isPurple ? "rgba(176, 38, 255, 0.1)" : "rgba(255,255,255,0.05)";

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        background: bgColor,
        color: mainColor,
        border: "none",
        borderLeft: `3px solid ${mainColor}`, // L-khtit l-iisser
        padding: "8px 16px",
        fontFamily: "'Share Tech Mono', monospace", fontWeight: "bold", fontSize: "0.85rem", letterSpacing: "1px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s ease",
        // THE CYBERPUNK CUT (M-qte3 mn l-qent l-foqani w t-7tani)
        clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
        boxShadow: `0 0 15px ${bgColor}`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = mainColor;
          e.currentTarget.style.color = "#000";
          e.currentTarget.style.boxShadow = `0 0 20px ${mainColor}`;
          e.currentTarget.style.transform = "scale(1.02)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = bgColor;
          e.currentTarget.style.color = mainColor;
          e.currentTarget.style.boxShadow = `0 0 15px ${bgColor}`;
          e.currentTarget.style.transform = "scale(1)";
        }
      }}
    >
      <Icon size={16} /> {label}
    </button>
  );
}