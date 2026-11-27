"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import KanbanCard from "./KanbanCard";
import styles from "../PilotKanban.module.css";

export type KanbanTask = { id: number; status: string; epsReference?: string; dynamicData?: Record<string, unknown> };

const COLUMNS = [
  { id: "A_FAIRE", title: "À faire", color: "#64748b" },
  { id: "EN_COURS", title: "En cours", color: "#2563eb" },
  { id: "DONE", title: "Terminé", color: "#0ea5e9" },
  { id: "VALIDE", title: "Validé (coach)", color: "#059669" },
  { id: "REJETE", title: "Rejeté", color: "#e11d48" },
];

export default function KanbanBoard({ tasks, onMoveTask }: { tasks: KanbanTask[]; onMoveTask: (id: number, s: string) => void }) {
  return (
    <div className={styles.board}>
      {COLUMNS.map((col, i) => {
        const list = tasks.filter((t) => t.status === col.id);
        const prev = i > 0 ? COLUMNS[i - 1] : null;
        const next = i < COLUMNS.length - 1 ? COLUMNS[i + 1] : null;
        return (
          <section key={col.id} className={styles.column} style={{ "--c": col.color, animationDelay: `${i * 0.06}s` } as React.CSSProperties}>
            <header className={styles.columnHead}>
              <span className={styles.columnDot} />
              <h2>{col.title}</h2>
              <span className={styles.columnCount}>{list.length}</span>
            </header>
            <div className={styles.columnBody}>
              <AnimatePresence mode="popLayout">
                {list.map((t) => (
                  <KanbanCard key={t.id} task={t} color={col.color} onMove={onMoveTask} prev={prev} next={next} />
                ))}
              </AnimatePresence>
              {list.length === 0 && <div className={styles.columnEmpty}>Aucune tâche</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
