"use client";

import React from "react";
import { ShieldCheck, Sparkles, FolderKanban, ChevronDown } from "lucide-react";
import styles from "../PilotBoard.module.css";

interface BoardHeaderProps {
  user: any;
  missionOptions: { value: string; label: string }[];
  selectedTemplate: string;
  setSelectedTemplate: (val: string) => void;
}

export default function BoardHeader({
  user,
  missionOptions,
  selectedTemplate,
  setSelectedTemplate,
}: BoardHeaderProps) {
  return (
    <header className={styles.headerHud}>
      {/* Left: Pilot Executive Identity */}
      <div className={styles.pilotInfo}>
        <div className={styles.avatarBadge}>
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className={styles.pilotName}>
            <span>{user?.username || "PILOTE KYNTUS"}</span>
            <span className={styles.statusDot} title="Système Connecté" />
          </div>
          <div className={styles.pilotSub}>
            <span className={styles.roleBadge}>PILOTAGE & ANALYSE EPS</span>
            <span className={styles.workspaceTag}>KYNTUS WORKFLOW OS</span>
          </div>
        </div>
      </div>

      {/* Right: Mission Selector */}
      <div className={styles.selectorZone}>
        <div className={styles.selectorLabel}>
          <FolderKanban size={15} />
          <span>MISSION ACTIVE</span>
        </div>

        <div className={styles.selectWrapper}>
          <select
            className={styles.luxeSelect}
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            <option value="">— SÉLECTIONNER UNE MISSION —</option>
            {missionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className={styles.selectArrow} />
        </div>
      </div>
    </header>
  );
}