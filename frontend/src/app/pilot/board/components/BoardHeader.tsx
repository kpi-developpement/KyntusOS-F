"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
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
      <div className={styles.pilotInfo}>
        <div className={styles.pilotName}>
          <div className={styles.statusDot}></div>
          UNIT: {user?.username || "UNKNOWN"}
        </div>
        <span className={styles.roleBadge}>// AUTHORIZED_ACCESS_LEVEL_3</span>
      </div>
      <div className={styles.selectorZone}>
        <ArrowRight size={16} className={styles.arrowIcon} />
        <div style={{ width: 300 }}>
          <LuxSelect 
            label="" 
            options={missionOptions} 
            value={selectedTemplate} 
            onChange={setSelectedTemplate} 
            placeholder="[ LOAD CARTRIDGE ]" 
          />
        </div>
      </div>
    </header>
  );
}