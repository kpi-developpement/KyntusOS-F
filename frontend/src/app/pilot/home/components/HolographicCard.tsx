"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import styles from "../Home.module.css";

export type HomeModule = {
  id: string;
  title: string;
  path: string;
  icon: LucideIcon;
  color: string;
  desc: string;
  status: "ONLINE" | "SECURE" | "ARCHIVED" | "NEW";
  tag: string;
};

const STATUS_LABEL: Record<HomeModule["status"], string> = {
  ONLINE: "En ligne",
  SECURE: "Sécurisé",
  ARCHIVED: "Archive",
  NEW: "Nouveau",
};

/** Carte module : verre blanc, inclinaison 3D, halo qui suit le curseur. */
export default function HolographicCard({
  mod,
  index,
  onOpen,
}: {
  mod: HomeModule;
  index: number;
  onOpen: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const Icon = mod.icon;

  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 12}deg`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ duration: 0.55, delay: Math.min(index, 9) * 0.045, ease: [0.22, 1, 0.36, 1] }}
      className={styles.cardWrap}
    >
      <button
        ref={ref}
        type="button"
        className={styles.card}
        style={{ "--c": mod.color } as React.CSSProperties}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onClick={(e) => onOpen(e.clientX, e.clientY)}
        aria-label={`Ouvrir ${mod.title}`}
      >
        <span className={styles.cardSheen} aria-hidden="true" />
        <span className={styles.cardTop}>
          <span className={styles.cardIcon}>
            <Icon size={22} strokeWidth={2.2} />
          </span>
          <span className={`${styles.status} ${styles[`st_${mod.status}`]}`}>
            <span className={styles.statusDot} />
            {STATUS_LABEL[mod.status]}
          </span>
        </span>

        <span className={styles.cardBody}>
          <span className={styles.cardTag}>{String(index + 1).padStart(2, "0")} · {mod.tag}</span>
          <span className={styles.cardTitle}>{mod.title}</span>
          <span className={styles.cardDesc}>{mod.desc}</span>
        </span>

        <span className={styles.cardFoot}>
          <span>Ouvrir le module</span>
          <span className={styles.cardArrow}><ArrowUpRight size={16} strokeWidth={2.5} /></span>
        </span>
      </button>
    </motion.div>
  );
}
