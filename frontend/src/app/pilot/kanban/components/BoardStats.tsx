"use client";
import { Layers, Zap, ShieldCheck } from "lucide-react";
import styles from "../PilotKanban.module.css";

export default function BoardStats({ stats }: { stats: any }) {
  return (
    <div className={styles.hudContainer}>
      <div className={styles.hudItem}>
        <div className={styles.hudIcon}><Layers size={16} /></div>
        <div className={styles.hudData}>
            <span className={styles.hudLabel}>PENDING OPS</span>
            <span className={styles.hudValue}>{stats.todo}</span>
        </div>
      </div>

      <div className={`${styles.hudItem} ${styles.hudActive}`}>
        <div className={styles.hudIcon}><Zap size={16} color="#000" /></div>
        <div className={styles.hudData}>
            <span className={styles.hudLabel} style={{color:'#00f2ea'}}>ACTIVE THREATS</span>
            <span className={styles.hudValue} style={{color:'#00f2ea'}}>{stats.inProgress}</span>
        </div>
        <div className={styles.scanLine}></div>
      </div>

      <div className={styles.hudItem}>
        <div className={styles.hudIcon}><ShieldCheck size={16} color="#00ff88"/></div>
        <div className={styles.hudData}>
            <span className={styles.hudLabel} style={{color:'#00ff88'}}>SECURED</span>
            <span className={styles.hudValue} style={{color:'#00ff88'}}>{stats.done}</span>
        </div>
      </div>
    </div>
  );
}