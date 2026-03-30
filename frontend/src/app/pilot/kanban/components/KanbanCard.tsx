"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Hash } from "lucide-react";
import styles from "../PilotKanban.module.css";

interface KanbanCardProps {
  task: any;
  color: string;
  onMove: (taskId: number, newStatus: string) => void;
  prevStatus: string | null;
  nextStatus: string | null;
}

export default function KanbanCard({ task, color, onMove, prevStatus, nextStatus }: KanbanCardProps) {
  return (
    <motion.div 
      layout // 👈 THE MAGIC: Kay-kheliha t-tir mlli kat-beddel blassetha!
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={styles.cyberCard}
      style={{ borderLeftColor: color, boxShadow: `0 4px 15px ${color}15` }}
    >
      <div className={styles.cardHeader}>
        <span className={styles.epsBadge} style={{ color: color, backgroundColor: `${color}15`, border: `1px solid ${color}40` }}>
          <Hash size={12} /> {task.epsReference || "NO_REF"}
        </span>
      </div>

      <div className={styles.cardBody}>
        {/* N-beynou chwiya dyal l-Data Dynamique */}
        {task.dynamicData && Object.keys(task.dynamicData).slice(0, 2).map(k => (
          <div key={k} className={styles.dataRow}>
            <span className={styles.dataKey}>{k}:</span>
            <span className={styles.dataValue}>{task.dynamicData[k] || "-"}</span>
          </div>
        ))}
      </div>

      <div className={styles.cardActions}>
        <button 
          disabled={!prevStatus} 
          onClick={() => prevStatus && onMove(task.id, prevStatus)}
          className={styles.moveBtn}
        >
          <ChevronLeft size={16} />
        </button>
        <div className={styles.glowLine} style={{ background: color }}></div>
        <button 
          disabled={!nextStatus} 
          onClick={() => nextStatus && onMove(task.id, nextStatus)}
          className={styles.moveBtn}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}