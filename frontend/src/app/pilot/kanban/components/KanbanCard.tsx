"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Hash } from "lucide-react";
import styles from "../PilotKanban.module.css";
import type { KanbanTask } from "./KanbanBoard";

type Col = { id: string; title: string } | null;

export default function KanbanCard({
  task, color, onMove, prev, next,
}: { task: KanbanTask; color: string; onMove: (id: number, s: string) => void; prev: Col; next: Col }) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={styles.card}
      style={{ "--c": color } as React.CSSProperties}
    >
      <span className={styles.eps}><Hash size={12} /> {task.epsReference || "Sans référence"}</span>
      {task.dynamicData && (
        <dl className={styles.data}>
          {Object.keys(task.dynamicData).slice(0, 2).map((k) => (
            <div key={k}><dt>{k}</dt><dd>{String(task.dynamicData?.[k] ?? "—")}</dd></div>
          ))}
        </dl>
      )}
      <div className={styles.actions}>
        <button type="button" disabled={!prev} onClick={() => prev && onMove(task.id, prev.id)} aria-label={prev ? `Reculer vers ${prev.title}` : "Première colonne"} title={prev?.title}>
          <ChevronLeft size={16} />
        </button>
        <span className={styles.track} />
        <button type="button" disabled={!next} onClick={() => next && onMove(task.id, next.id)} aria-label={next ? `Avancer vers ${next.title}` : "Dernière colonne"} title={next?.title}>
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.article>
  );
}
