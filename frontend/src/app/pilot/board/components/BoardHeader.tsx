"use client";

import React from "react";
import { ShieldCheck, FolderKanban, Sparkles } from "lucide-react";
import LuxeDropdown, { LuxeOption } from "../ui/LuxeDropdown";
import styles from "../PilotBoard.module.css";

interface BoardHeaderProps {
  user: any;
  missionOptions: LuxeOption[];
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
          <ShieldCheck size={24} />
          <span className={styles.avatarGlow} />
        </div>
        <div>
          <div className={styles.pilotName}>
            <span>{user?.username || "PILOTE KYNTUS"}</span>
            <span className={styles.statusDot} title="Système Connecté & Actif" />
          </div>
          <div className={styles.pilotSub}>
            <span className={styles.roleBadge}>
              <Sparkles size={11} style={{ marginRight: 4 }} />
              PILOTAGE & ANALYSE EPS
            </span>
            <span className={styles.workspaceTag}>KYNTUS WORKFLOW OS</span>
          </div>
        </div>
      </div>

      {/* Right: Custom Luxe Mission Dropdown */}
      <div className={styles.selectorZone}>
        <LuxeDropdown
          variant="hero"
          align="right"
          minWidth={340}
          icon={<FolderKanban size={16} />}
          prefixLabel="MISSION"
          placeholder="SÉLECTIONNER UNE MISSION..."
          options={missionOptions}
          value={selectedTemplate}
          onChange={setSelectedTemplate}
          searchable={missionOptions.length > 4}
          searchPlaceholder="Chercher une mission..."
        />
      </div>
    </header>
  );
}