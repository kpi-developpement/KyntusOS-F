"use client";
import { Eye, Calendar, Hash } from "lucide-react";
import styles from "../PilotHistory.module.css";

export default function HoloList({ tasks, loading, onSelect }: any) {
    if (tasks.length === 0 && !loading) {
        return (
            <div className={styles.listWrapper}>
                <div className={styles.emptyState}>
                    <Hash size={60} className={styles.emptyIcon}/>
                    <span>DATA VOID // NO FRAGMENTS</span>
                </div>
            </div>
        );
    }

    // Format Date Real (Data Backend)
    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        const d = new Date(dateString);
        return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
    };

    return (
        <div className={styles.listWrapper}>
            <div className={styles.gridList}>
                <div className={styles.listHeader}>
                    <span>STATUS</span>
                    <span>PROTOCOL</span>
                    <span>EPS REF</span>
                    <span>DATE IMPORT</span>
                    <span style={{textAlign:'right'}}>INSPECT</span>
                </div>

                <div className={styles.scrollArea}>
                    {tasks.map((task: any, index: number) => (
                        <div 
                            key={task.id} 
                            className={styles.taskRow}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {/* STATUS */}
                            <div className={styles.statusCol}>
                                {task.status === "VALIDE" && <span className={`${styles.badge} ${styles.badgeSuccess}`}>SECURE</span>}
                                {task.status === "REJETE" && <span className={`${styles.badge} ${styles.badgeError}`}>ERROR</span>}
                                {task.status === "DONE" && <span className={`${styles.badge} ${styles.badgeWarn}`}>PENDING</span>}
                            </div>
                            
                            {/* TEMPLATE NAME */}
                            <div className={styles.nameCol}>
                                <span className={styles.glowText}>{task.template?.name || "UNKNOWN"}</span>
                            </div>

                            {/* EPS REF */}
                            <div className={styles.refCol}>
                                <span className={styles.codeFont}>{task.epsReference}</span>
                            </div>

                            {/* DATE REELLE (Backend Data) */}
                            <div className={styles.dateCol}>
                                <Calendar size={12} style={{marginRight:6, color:'#556677'}}/>
                                <span className={styles.tinyHex}>
                                    {formatDate(task.importedAt)}
                                </span>
                            </div>

                            {/* ACTION */}
                            <div className={styles.actionCol}>
                                <button className={styles.neonBtn} onClick={() => onSelect(task)}>
                                    <Eye size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}