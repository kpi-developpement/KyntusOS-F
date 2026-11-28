"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Lock } from "lucide-react";
import type { PilotModule } from "@/lib/modules";
import OrbGlyph from "@/components/motion/OrbGlyph";
import styles from "../Home.module.css";


/** Carte module : objet 3D vivant, inclinaison au survol, verrou si l'admin n'a pas ouvert le module. */
export default function HolographicCard({
  mod, index, locked, onOpen,
}: { mod: PilotModule; index: number; locked: boolean; onOpen: (x: number, y: number, iconEl: HTMLElement | null) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  const [denied, setDenied] = useState(0);
  const Icon = mod.icon;

  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || locked) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - py) * 9}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 11}deg`);
  };
  const onLeave = () => {
    setHover(false);
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: Math.min(index, 9) * 0.045 }}
      className={styles.cardWrap}
    >
      <motion.button
        ref={ref}
        type="button"
        className={`${styles.card} ${locked ? styles.cardLocked : ""}`}
        style={{ "--c": mod.color } as React.CSSProperties}
        data-cursor={locked ? "Verrouillé" : "Ouvrir"}
        aria-disabled={locked}
        aria-label={locked ? `${mod.title} : accès non autorisé` : `Ouvrir ${mod.title}`}
        onPointerEnter={() => setHover(true)}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        animate={denied ? { x: [0, -8, 7, -4, 2, 0] } : undefined}
        transition={{ duration: 0.4 }}
        onClick={(e) => {
          if (locked) { setDenied((n) => n + 1); return; }
          onOpen(e.clientX, e.clientY, iconRef.current);
        }}
      >
        <span className={styles.cardSheen} aria-hidden="true" />
        <span className={styles.stage} aria-hidden="true">
          <span className={styles.stageGlow} />
          <span className={styles.glyph}><OrbGlyph icon={mod.icon} color={mod.color} active={hover} locked={locked} /></span>
          <span className={`${styles.status} ${locked ? styles.stLocked : mod.key === "contestation" ? styles.stNew : styles.stOn}`}>
            {locked ? <><Lock size={11} strokeWidth={2.6} /> Verrouillé</> : <><span className={styles.statusDot} />{mod.key === "contestation" ? "Nouveau" : "Disponible"}</>}
          </span>
        </span>

        <span className={styles.cardBody}>
          <span className={styles.cardMeta}>
            <span ref={iconRef} className={styles.cardIcon}><Icon size={16} strokeWidth={2.3} /></span>
            <span className={styles.cardTag}>{String(index + 1).padStart(2, "0")} · {mod.tag}</span>
          </span>
          <span className={styles.cardTitle}>{mod.title}</span>
          <span className={styles.cardDesc}>{locked ? "Ce module n'est pas ouvert pour votre compte." : mod.hint}</span>
        </span>

        <span className={styles.cardFoot}>
          <span>{locked ? "Demander l'accès à un admin" : "Ouvrir le module"}</span>
          <span className={styles.cardArrow}>{locked ? <Lock size={14} /> : <ArrowUpRight size={16} strokeWidth={2.5} />}</span>
        </span>
      </motion.button>
    </motion.div>
  );
}
