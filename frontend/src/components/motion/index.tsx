"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { resolvePendingTransition } from "@/lib/transition";
import s from "./Motion.module.css";

/** À monter une fois par layout : termine la View Transition quand la nouvelle route est rendue. */
export function TransitionResolver() {
  const pathname = usePathname();
  useEffect(() => { resolvePendingTransition(); }, [pathname]);
  return null;
}

/* ==========================================================================
   Curseur : anneau qui suit la souris avec inertie (ressort), grossit sur les
   éléments cliquables et affiche un libellé via data-cursor="Ouvrir".
   Le curseur natif reste visible (tableaux, saisie) : l'anneau est un accent.
   ========================================================================== */
export function KxCursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    let x = -100, y = -100, rx = -100, ry = -100, vx = 0, vy = 0, raf = 0;
    let mode = "";

    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      const t = e.target as HTMLElement | null;
      const labelled = t?.closest?.("[data-cursor]") as HTMLElement | null;
      const interactive = t?.closest?.("a, button, [role='button'], [role='tab'], [role='option'], [role='switch'], label, summary, select");
      const typing = t?.closest?.("input, textarea, [contenteditable='true']");
      const next = labelled ? "label" : typing ? "text" : interactive ? "hover" : "";
      if (next !== mode) {
        mode = next;
        ring.current?.setAttribute("data-mode", mode);
        setLabel(labelled?.dataset.cursor || "");
      }
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    const down = () => ring.current?.setAttribute("data-down", "1");
    const up = () => ring.current?.removeAttribute("data-down");
    const leave = () => ring.current?.setAttribute("data-hidden", "1");
    const enter = () => ring.current?.removeAttribute("data-hidden");

    // Ressort amorti (raideur / amortissement) plutôt qu'un easing linéaire
    const tick = () => {
      const k = 0.18, d = 0.62;
      vx = (vx + (x - rx) * k) * d;
      vy = (vy + (y - ry) * k) * d;
      rx += vx; ry += vy;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leave);
    document.documentElement.addEventListener("pointerenter", enter);
    document.documentElement.classList.add("kx-has-cursor");
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
      document.documentElement.removeEventListener("pointerenter", enter);
      document.documentElement.classList.remove("kx-has-cursor");
    };
  }, []);

  return (
    <>
      <div ref={ring} className={s.ring} aria-hidden="true"><span className={s.ringLabel}>{label}</span></div>
      <div ref={dot} className={s.dot} aria-hidden="true" />
    </>
  );
}

/* ==========================================================================
   Magnétique : l'enfant se laisse attirer vers le curseur (et revient en ressort).
   ========================================================================== */
export function Magnetic({ children, strength = 0.32, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
    };
    const leave = () => { el.style.transform = ""; };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [strength]);
  return <span ref={ref} className={`${s.magnetic} ${className || ""}`}>{children}</span>;
}

/* ==========================================================================
   Typographie cinétique : chaque lettre gagne en graisse (police variable Geist)
   et se soulève selon sa distance au curseur.
   ========================================================================== */
export function KineticText({ text, className, radius = 140, min = 500, max = 850 }: { text: string; className?: string; radius?: number; min?: number; max?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const letters = Array.from(el.querySelectorAll<HTMLSpanElement>("[data-l]"));
    let raf = 0, px = -9999, py = -9999;
    const apply = () => {
      raf = 0;
      for (const l of letters) {
        const r = l.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const k = Math.max(0, 1 - d / radius);
        const e = k * k * (3 - 2 * k); // smoothstep
        l.style.fontWeight = String(Math.round(min + (max - min) * e));
        l.style.transform = `translateY(${(-e * 6).toFixed(2)}px)`;
      }
    };
    const move = (ev: PointerEvent) => { px = ev.clientX; py = ev.clientY; if (!raf) raf = requestAnimationFrame(apply); };
    const leave = () => { px = py = -9999; if (!raf) raf = requestAnimationFrame(apply); };
    window.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [radius, min, max]);

  return (
    <span ref={ref} className={`${s.kinetic} ${className || ""}`} aria-label={text}>
      {text.split(/(\s+)/).map((word, wi) =>
        /^\s+$/.test(word) ? <span key={wi}> </span> : (
          <span key={wi} className={s.word} aria-hidden="true">
            {Array.from(word).map((ch, ci) => (
              <span key={ci} data-l="" className={s.letter} style={{ fontWeight: min, animationDelay: `${(wi * 4 + ci) * 0.025}s` }}>{ch}</span>
            ))}
          </span>
        )
      )}
    </span>
  );
}

/* ==========================================================================
   Révélation au scroll : la section se dévoile par un masque (clip-path) quand
   elle entre à l'écran.
   ========================================================================== */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${s.reveal} ${shown ? s.revealOn : ""} ${className || ""}`} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/* ==========================================================================
   Défilement à inertie (Lenis) — à activer sur les pages vitrines.
   Les zones scrollables internes (tableaux, listes) gardent leur scroll natif.
   ========================================================================== */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lenis: { destroy: () => void } | null = null;
    let cancelled = false;
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ autoRaf: true, lerp: 0.09, smoothWheel: true, allowNestedScroll: true });
    });
    return () => { cancelled = true; lenis?.destroy(); };
  }, []);
  return null;
}
