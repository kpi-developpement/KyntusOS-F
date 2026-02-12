"use client";
import { Layers, Activity, ShieldAlert } from "lucide-react";
import styles from "../PilotHistory.module.css";

export default function CyberStats({ stats }: { stats: any }) {
  
  // Couleur dynamique pour l'intégrité (Vert > Jaune > Rouge)
  const integrityColor = stats.pilotIntegrity > 80 ? "#00ff88" : stats.pilotIntegrity > 50 ? "#ffb400" : "#ff0055";

  return (
    <div className={styles.kpiContainer}>
        {/* CARD 1: VOLUME */}
        <div className={styles.holoCard}>
            <div className={styles.cardContent}>
                <div className={styles.cardIcon}><Layers size={24} color="#00f2ea"/></div>
                <div className={styles.cardData}>
                    <span className={styles.cardLabel}>TOTAL OPS</span>
                    <span className={styles.cardValue}>{stats.total}</span>
                </div>
                <div className={styles.hologramDeco}></div>
            </div>
        </div>

        {/* CARD 2: SUCCESS RATE */}
        <div className={styles.holoCard} style={{animationDelay: '0.2s'}}>
            <div className={styles.cardContent}>
                <div className={styles.cardIcon}><Activity size={24} color="#bd00ff"/></div>
                <div className={styles.cardData}>
                    <span className={styles.cardLabel}>SYNC RATE</span>
                    <span className={styles.cardValue} style={{color:'#bd00ff'}}>{stats.successRate}%</span>
                </div>
                <div className={styles.hologramDeco} style={{background: 'linear-gradient(transparent, #bd00ff)'}}></div>
            </div>
        </div>

        {/* CARD 3: INTEGRITY (Error Based) */}
        <div className={styles.holoCard} style={{animationDelay: '0.4s'}}>
            <div className={styles.cardContent}>
                <div className={styles.cardIcon}>
                    <ShieldAlert size={24} color={integrityColor}/>
                </div>
                <div className={styles.cardData}>
                    <span className={styles.cardLabel}>INTEGRITY</span>
                    <span className={styles.cardValue} style={{color: integrityColor}}>
                        {stats.pilotIntegrity}%
                    </span>
                </div>
                <div className={styles.hologramDeco} style={{background: `linear-gradient(transparent, ${integrityColor})`}}></div>
            </div>
        </div>
    </div>
  );
}