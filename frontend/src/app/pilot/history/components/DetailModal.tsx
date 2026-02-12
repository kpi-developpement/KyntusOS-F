"use client";
import { X, Zap } from "lucide-react";
import styles from "../PilotHistory.module.css";

export default function DetailModal({ task, onClose }: any) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.holoModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalScanner}></div>
            <button className={styles.closeBtn} onClick={onClose}><X size={24}/></button>
            
            <div className={styles.modalHeader}>
                <div className={styles.hexIcon}>
                    <Zap size={30} color="#00f2ea" />
                </div>
                <div>
                    <h2>FRAGMENT DECRYPTED</h2>
                    <p className={styles.codeFont}>{task.epsReference}</p>
                </div>
            </div>

            <div className={styles.modalGrid}>
                {task.dynamicData && Object.entries(task.dynamicData).map(([key, value]) => (
                    <div key={key} className={styles.dataPoint}>
                        <span className={styles.dataLabel}>{key}</span>
                        <span className={styles.dataValue}>{String(value)}</span>
                    </div>
                ))}
            </div>

            <div className={styles.modalFooter}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span>TIMESTAMP: {task.importedAt ? new Date(task.importedAt).toLocaleString() : "UNKNOWN"}</span>
                </div>
            </div>
        </div>
    </div>
  );
}