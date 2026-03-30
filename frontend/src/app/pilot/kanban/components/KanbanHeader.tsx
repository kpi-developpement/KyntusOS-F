"use client";

import React from "react";
import { ArrowRight, Radar } from "lucide-react";
import LuxSelect from "@/components/ui/LuxSelect";
import styles from "../PilotKanban.module.css";

interface KanbanHeaderProps {
  user: any;
  missionOptions: { value: string, label: string }[];
  selectedTemplate: string;
  setSelectedTemplate: (val: string) => void;
  tasksCount: number;
}

export default function KanbanHeader({ user, missionOptions, selectedTemplate, setSelectedTemplate, tasksCount }: KanbanHeaderProps) {
  return (
    <header className={styles.headerHud}>
      <div className={styles.pilotInfo}>
        <div className={styles.pilotName}>
          <div className={styles.statusDot}></div>
          TACTICAL_UNIT: {user?.username || "UNKNOWN"}
        </div>
        <span className={styles.roleBadge}>// KANBAN_OVERVIEW</span>
      </div>
      
      <div className={styles.centerStats}>
        <Radar size={20} color="#39ff14" />
        <span>{tasksCount} TÂCHES ACTIVES</span>
      </div>

      <div className={styles.selectorZone}>
        <ArrowRight size={16} className={styles.arrowIcon} />
        <div style={{ width: 300 }}>
          <LuxSelect 
            label="" 
            options={missionOptions} 
            value={selectedTemplate} 
            onChange={setSelectedTemplate} 
            placeholder="[ LOAD MISSION CARTRIDGE ]" 
          />
        </div>
      </div>
    </header>
  );
}