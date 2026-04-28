"use client";

import React from "react";
import { ArrowRight, Activity } from "lucide-react";
import LuxSelect from "@/components/ui/LuxSelect";
import styles from "../PilotBoard.module.css";

interface BoardHeaderProps {
  user: any;
  missionOptions: { value: string, label: string }[];
  selectedTemplate: string;
  setSelectedTemplate: (val: string) => void;
}

export default function BoardHeader({ user, missionOptions, selectedTemplate, setSelectedTemplate }: BoardHeaderProps) {
  return (
    <header className={styles.headerHud}>
      
      {/* L-Partie dyal l-Pilote (L-issr) */}
      <div className={styles.pilotInfo}>
        <div className={styles.pilotName}>
          <div className={styles.statusDot}></div>
          <span>PILOT // {user?.username || "UNKNOWN"}</span>
        </div>
        <span className={styles.roleBadge}>SYS.ADMIN_LEVEL</span>
      </div>

      {/* L-Partie dyal s-Sélection (L-imen) */}
      <div className={styles.selectorZone}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
          <Activity size={14} /> ACTIVE_CARTRIDGE
        </div>
        <ArrowRight size={16} className={styles.arrowIcon} />
        
        <div style={{ width: 280 }}>
          <LuxSelect 
            options={missionOptions || []} 
            value={selectedTemplate} 
            onChange={setSelectedTemplate} 
            placeholder="SELECT MISSION..." 
          />
        </div>
      </div>
      
    </header>
  );
}