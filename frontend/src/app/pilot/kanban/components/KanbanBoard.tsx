"use client";

import React from "react";
import KanbanCard from "./KanbanCard";
import styles from "../PilotKanban.module.css";

const COLUMNS_CONFIG = [
  { id: "A_FAIRE", title: "À FAIRE", color: "#00f2ea" },
  { id: "EN_COURS", title: "EN COURS", color: "#f59e0b" },
  { id: "DONE", title: "TERMINÉ", color: "#39ff14" },
  { id: "VALIDE", title: "VALIDÉ (COACH)", color: "#b026ff" },
  { id: "REJETE", title: "REJETÉ", color: "#ef4444" }
];

interface KanbanBoardProps {
  tasks: any[];
  onMoveTask: (taskId: number, newStatus: string) => void;
}

export default function KanbanBoard({ tasks, onMoveTask }: KanbanBoardProps) {
  return (
    <div className={styles.boardContainer}>
      {COLUMNS_CONFIG.map((col, colIndex) => {
        const columnTasks = tasks.filter(t => t.status === col.id);
        const prevStatus = colIndex > 0 ? COLUMNS_CONFIG[colIndex - 1].id : null;
        const nextStatus = colIndex < COLUMNS_CONFIG.length - 1 ? COLUMNS_CONFIG[colIndex + 1].id : null;

        return (
          <div key={col.id} className={styles.kanbanColumn}>
            {/* L-Header dyal L-Colonne */}
            <div className={styles.columnHeader} style={{ borderBottomColor: col.color }}>
              <div className={styles.columnTitle} style={{ color: col.color, textShadow: `0 0 10px ${col.color}80` }}>
                {col.title}
              </div>
              <div className={styles.columnBadge} style={{ backgroundColor: `${col.color}20`, color: col.color, border: `1px solid ${col.color}` }}>
                {columnTasks.length}
              </div>
            </div>

            {/* L-Tâches L-dakhel */}
            <div className={styles.columnBody}>
              {columnTasks.map(task => (
                <KanbanCard 
                  key={task.id} 
                  task={task} 
                  color={col.color} 
                  onMove={onMoveTask} 
                  prevStatus={prevStatus} 
                  nextStatus={nextStatus} 
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}