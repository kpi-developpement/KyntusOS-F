"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import s from "./OrbGlyph.module.css";

/**
 * Illustration de module 100 % CSS (remplace les modèles 3D) :
 * tuile en relief, anneaux en orbite, satellite et reflet.
 * Seules `transform` et `opacity` sont animées → composité par le GPU, aucun repaint.
 */
export default function OrbGlyph({ icon: Icon, color, active, locked }: { icon: LucideIcon; color: string; active?: boolean; locked?: boolean }) {
  return (
    <span
      className={`${s.orb} ${active ? s.active : ""} ${locked ? s.locked : ""}`}
      style={{ "--c": locked ? "#94a3b8" : color } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className={s.halo} />
      <span className={s.ring1} />
      <span className={s.ring2} />
      <span className={s.orbit}><i /></span>
      <span className={s.orbit2}><i /></span>
      <span className={s.core}>
        <span className={s.coreShine} />
        <Icon size={30} strokeWidth={2.1} />
      </span>
      <span className={s.shadow} />
    </span>
  );
}
