"use client";

import React, { useState, useEffect } from "react";
import { 
  RefreshCw, Globe, Cpu, ShieldCheck, AlertTriangle, 
  Layers, Radio, Construction 
} from "lucide-react";
import Workflow3DChart from "@/components/3d/Workflow3DChart";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import styles from "./Strategic.module.css";
import { toast } from "@/components/ui/Toaster";

export default function StrategicPage() {
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"NOMINAL" | "SCANNING" | "BETA">("BETA");

  // Initial Boot Sequence
  useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString());
    // Simulate system health check
    const boot = setTimeout(() => {
        setStatus("BETA");
        toast({ message: "WARNING: BETA ENVIRONMENT DETECTED", type: "info" });
    }, 1000);
    return () => clearTimeout(boot);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    // Force re-render
    setTimeout(() => {
      setLastUpdate(new Date().toLocaleTimeString());
      setLoading(false);
      toast({ message: "TOPOLOGY RESCANNED // DATA SYNCED", type: "success" });
    }, 1500);
  };

  return (
    <div className={styles.container}>
      
      {/* 1. Background Layer */}
      <div className={styles.bgLayer}>
        <InteractiveBackground />
      </div>

      {/* --- \ud83d\udea7 WORK IN PROGRESS BANNER \ud83d\udea7 --- */}
      <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "40px",
          background: "repeating-linear-gradient(45deg, #ffd700, #ffd700 10px, #ffffff 10px, #ffffff 20px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, boxShadow: "0 5px 20px rgba(15, 30, 61, 0.18)",
          opacity: 0.9
      }}>
          <div style={{
              background: "#ffffff", color: "#0f1e3d", padding: "4px 20px", 
              fontWeight: "900", letterSpacing: "3px", fontSize: "0.8rem",
              border: "1px solid #ffd700", borderRadius: "4px", display: "flex", alignItems: "center", gap: 10
          }}>
              <Construction size={16} /> PROTOTYPE VERSION // WORK IN PROGRESS <Construction size={16} />
          </div>
      </div>

      {/* 2. HUD HEADER (D\u00e9cal\u00e9 chwia lta7t 3la 9bl l banner) */}
      <div className={styles.hudHeader} style={{marginTop: "40px"}}>
        <div className={styles.titleGroup}>
            <div className={styles.iconWrapper}>
                <Globe size={28} className={styles.globeIcon} />
                <div className={styles.pulseRing}></div>
            </div>
            <div>
                <h1 className={styles.title}>STRATEGIC MAP <span className={styles.vTag}>v4.0-BETA</span></h1>
                <div className={styles.subtitle}>
                  GLOBAL WORKFLOW TOPOLOGY // <span style={{color:"#0f1e3d"}}>EXPERIMENTAL</span>
                </div>
            </div>
        </div>

        <div className={styles.statsGroup}>
            {/* Status Indicator */}
            <div className={styles.statBox}>
                <span className={styles.label}>SYSTEM INTEGRITY</span>
                <span className={`${styles.value}`} style={{color: "#0f1e3d", textShadow: "0 0 10px transparent"}}>
                    <AlertTriangle size={16}/> UNSTABLE
                </span>
            </div>

            {/* Time Indicator */}
            <div className={styles.statBox}>
                <span className={styles.label}>LAST SYNC</span>
                <span className={styles.value}>{lastUpdate}</span>
            </div>

            {/* Action Button */}
            <button 
              className={`${styles.refreshBtn} ${loading ? styles.spin : ''}`} 
              onClick={handleRefresh}
              title="FORCE RESCAN"
            >
                <RefreshCw size={20} />
            </button>
        </div>
      </div>

      {/* 3. 3D VIEWPORT */}
      <div className={styles.viewport}>
          <div className={styles.scanline}></div>
          <div className={styles.vignette}></div>
          <div className={`${styles.bracket} ${styles.tl}`}></div>
          <div className={`${styles.bracket} ${styles.tr}`}></div>
          <div className={`${styles.bracket} ${styles.bl}`}></div>
          <div className={`${styles.bracket} ${styles.br}`}></div>

          {/* THE 3D CANVAS */}
          <Workflow3DChart key={lastUpdate} />
      </div>

      {/* 4. LEGEND FOOTER */}
      <div className={styles.footer}>
          <div className={styles.legendGroup}>
              <div className={styles.legendItem}>
                  <div className={styles.colorBox} style={{background:"#ff2d55", boxShadow:"0 0 10px rgba(255, 45, 85, 0.25)"}}></div>
                  <span>X: IDENTITY</span>
              </div>
              <div className={styles.legendItem}>
                  <div className={styles.colorBox} style={{background:"#10b981", boxShadow:"0 0 10px rgba(16, 185, 129, 0.25)"}}></div>
                  <span>Y: TIME LOAD</span>
              </div>
              <div className={styles.legendItem}>
                  <div className={styles.colorBox} style={{background:"#2563eb", boxShadow:"0 0 10px rgba(37, 99, 235, 0.25)"}}></div>
                  <span>Z: COMPLEXITY</span>
              </div>
          </div>

          <div className={styles.controlsGroup}>
             <div className={styles.controlBadge}>
                <Radio size={14} className={styles.blink} /> LIVE
             </div>
             <div className={styles.controlBadge} style={{borderColor: "#ffd700", color: "#0f1e3d"}}>
                <AlertTriangle size={14} /> DEBUG MODE
             </div>
          </div>
      </div>

    </div>
  );
}