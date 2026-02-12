"use client";
import styles from "../PilotKanban.module.css";
import TaskCard from "./TaskCard";

export default function KanbanColumn({ title, tasks, type, onAction, loading }: any) {
  return (
    <div className={`${styles.column} ${type === "PROGRESS" ? styles.colActive : ''}`}>
      {/* HEADER FIXE */}
      <div className={styles.colHeader}>
        <div className={styles.headerTitleBlock}>
            <div className={styles.colTitle}>{title}</div>
            <div className={styles.colSubtitle}>SECTOR {type}</div>
        </div>
        <div className={styles.colCount}>{tasks.length}</div>
      </div>
      
      {/* SCROLLABLE AREA */}
      <div className={styles.scrollContainer}>
        <div className={styles.taskList}>
            {loading ? (
                <div className={styles.loader}>SYSTEM SCANNING...</div>
            ) : tasks.length === 0 ? (
                <div className={styles.emptyState}>
                    <span>SECTOR CLEAR</span>
                    <div className={styles.emptyLine}></div>
                </div>
            ) : (
                tasks.map((task:any, i:number) => (
                    <TaskCard key={task.id} task={task} type={type} onAction={onAction} index={i} />
                ))
            )}
        </div>
      </div>
      
      {/* FOOTER DECO */}
      <div className={styles.colFooter}></div>
    </div>
  );
}