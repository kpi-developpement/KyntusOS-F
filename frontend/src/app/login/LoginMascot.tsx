"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Petite mascotte « K-bot » à états (inspiration Rive) :
 *  watch   → ses yeux suivent le pointeur
 *  shy     → elle se cache les yeux pendant la saisie du mot de passe
 *  peek    → elle jette un œil quand le mot de passe est affiché
 *  error   → elle secoue la tête, bouche triste
 *  success → yeux plissés, grand sourire
 */
export type MascotMood = "watch" | "shy" | "peek" | "error" | "success" | "busy";

export default function LoginMascot({ mood }: { mood: MascotMood }) {
  const left = useRef<SVGCircleElement>(null);
  const right = useRef<SVGCircleElement>(null);
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const svg = root.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 260);
      const ox = (dx / d) * 3.2 * k;
      const oy = (dy / d) * 3 * k;
      left.current?.setAttribute("transform", `translate(${ox} ${oy})`);
      right.current?.setAttribute("transform", `translate(${ox} ${oy})`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const closed = mood === "shy" || mood === "success";
  const mouth =
    mood === "error" ? "M23 41 Q30 36 37 41" :
    mood === "success" ? "M21 37 Q30 47 39 37" :
    mood === "busy" ? "M26 40 Q30 40 34 40" :
    "M24 38 Q30 43 36 38";

  return (
    <motion.svg
      ref={root}
      viewBox="0 0 60 60"
      width="58"
      height="58"
      aria-hidden="true"
      animate={
        mood === "error" ? { rotate: [0, -12, 10, -6, 3, 0] } :
        mood === "success" ? { y: [0, -8, 0], scale: [1, 1.08, 1] } :
        mood === "busy" ? { rotate: [0, 360] } : { rotate: 0, y: 0, scale: 1 }
      }
      transition={mood === "busy" ? { duration: 1.2, repeat: Infinity, ease: "linear" } : { duration: 0.55 }}
      style={{ overflow: "visible", filter: "drop-shadow(0 12px 18px rgba(29, 78, 216, 0.45))" }}
    >
      <defs>
        <linearGradient id="kbot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="0.55" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="52" height="52" rx="17" fill="url(#kbot)" />
      <rect x="9" y="7" width="30" height="8" rx="4" fill="#fff" opacity="0.25" />
      <line x1="30" y1="4" x2="30" y2="-2" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="30" cy="-3" r="2.6" fill={mood === "error" ? "#fb7185" : mood === "success" ? "#34d399" : "#93c5fd"} />

      {/* yeux */}
      <g>
        <ellipse cx="21" cy="26" rx="6.5" ry={closed ? 1.4 : 7} fill="#fff" style={{ transition: "ry 0.2s ease" }} />
        <ellipse cx="39" cy="26" rx="6.5" ry={closed ? 1.4 : mood === "peek" ? 7 : 7} fill="#fff" style={{ transition: "ry 0.2s ease" }} />
        {!closed && <circle ref={left} cx="21" cy="26" r="3" fill="#0b1f4d" />}
        {!closed && <circle ref={right} cx="39" cy="26" r="3" fill="#0b1f4d" />}
      </g>

      {/* mains qui cachent les yeux */}
      <motion.g
        initial={false}
        animate={mood === "shy" ? { y: 0, opacity: 1 } : mood === "peek" ? { y: 4, opacity: 1 } : { y: 22, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
      >
        <rect x="11" y="20" width="18" height="12" rx="6" fill="#bfdbfe" stroke="#fff" strokeWidth="1.5" />
        <motion.rect
          x="31" width="18" height="12" rx="6" fill="#bfdbfe" stroke="#fff" strokeWidth="1.5"
          initial={false}
          animate={{ y: mood === "peek" ? 28 : 20 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        />
      </motion.g>

      <path d={mouth} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" style={{ transition: "d 0.25s ease" }} />
    </motion.svg>
  );
}
