"use client";
import { Play, Check, Hash, Activity, Shield } from "lucide-react";
import styles from "../PilotKanban.module.css";
import CardPlasma from "./ui/CardPlasma";

export default function TaskCard({ task, type, onAction, index }: any) {
  
  // Hash visual juste pour le decor
  const visualHash = "ID-" + task.id.toString().padStart(4, '0');

  return (
    <div 
        className={`${styles.card} ${type === "PROGRESS" ? styles.cardActive : ''} ${type === "DONE" ? styles.cardDone : ''}`}
        style={{ animationDelay: `${index * 0.05}s` }}
    >
        {/* BACKGROUND ANIMÉ (Plasma) */}
        <CardPlasma type={type} />

        {/* CONTENT */}
        <div className={styles.cardContent}>
            
            {/* 1. TOP BADGE : TEMPLATE NAME */}
            <div className={styles.cardTopBar}>
                <span className={styles.templateBadge}>
                    {task.template?.name || "MISSION"}
                </span>
                <span className={styles.idBadge}>{visualHash}</span>
            </div>

            {/* 2. CENTER : EPS REFERENCE (Big & Clear) */}
            <div className={styles.mainInfo}>
                <div className={styles.epsLabel}>EPS REFERENCE</div>
                <div className={styles.epsValue}>
                    <Hash size={14} color="#00f2ea" style={{marginRight:5}}/>
                    {task.epsReference}
                </div>
            </div>

            {/* 3. FOOTER : ACTION BUTTONS */}
            <div className={styles.cardFooter}>
                {type === "TODO" && (
                    <button className={styles.btnAction} onClick={() => onAction(task.id, "EN_COURS")}>
                        <Play size={14} /> <span>INITIALIZE</span>
                    </button>
                )}
                {type === "PROGRESS" && (
                    <button className={styles.btnSecure} onClick={() => onAction(task.id, "DONE")}>
                        <Activity size={14} className={styles.spin} /> <span>SECURE DATA</span>
                    </button>
                )}
                 {type === "DONE" && (
                    <div className={styles.stamp}>
                        <Shield size={12} /> ARCHIVED
                    </div>
                )}
            </div>
        </div>

        {/* DECORATION CORNERS */}
        <div className={styles.decorBarLeft}></div>
    </div>
  );
}