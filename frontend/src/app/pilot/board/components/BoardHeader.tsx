"use client";

import React from "react";
import { FolderKanban, CircleDot, Clock, CheckCircle2, ShieldCheck, Layers } from "lucide-react";
import LuxeDropdown, { LuxeOption } from "../ui/LuxeDropdown";
import styles from "../PilotBoard.module.css";

export interface BoardStats {
  total: number;
  todo: number;
  progress: number;
  done: number;
  validated: number;
}

interface BoardHeaderProps {
  user: any;
  missionOptions: LuxeOption[];
  selectedTemplate: string;
  setSelectedTemplate: (val: string) => void;
  missionName?: string | null;
  stats?: BoardStats;
  statusFilter?: string;
  onStatusClick?: (status: string) => void;
}

const EMPTY_STATS: BoardStats = { total: 0, todo: 0, progress: 0, done: 0, validated: 0 };

export default function BoardHeader({
  user,
  missionOptions,
  selectedTemplate,
  setSelectedTemplate,
  missionName,
  stats = EMPTY_STATS,
  statusFilter = "ALL",
  onStatusClick = () => {},
}: BoardHeaderProps) {
  const name: string = user?.username || "PILOTE KYNTUS";
  const initials = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "PK";
  const finished = stats.done + stats.validated;
  const pct = stats.total ? Math.round((finished / stats.total) * 100) : 0;
  const R = 26;
  const C = 2 * Math.PI * R;

  const tiles = [
    { id: "A_FAIRE", label: "À faire", value: stats.todo, icon: <CircleDot size={15} />, tone: styles.kpiTodo },
    { id: "EN_COURS", label: "En cours", value: stats.progress, icon: <Clock size={15} />, tone: styles.kpiProgress },
    { id: "DONE", label: "Terminé", value: stats.done, icon: <CheckCircle2 size={15} />, tone: styles.kpiDone },
    { id: "VALIDATED", label: "Validé admin", value: stats.validated, icon: <ShieldCheck size={15} />, tone: styles.kpiValidated },
  ];

  return (
    <header className={styles.heroHeader}>
      <div className={styles.heroStripe} />

      {/* IDENTITY */}
      <div className={styles.heroIdentity}>
        <div className={styles.heroAvatar}>
          <span>{initials}</span>
          <i className={styles.heroLive} title="Connecté" />
        </div>
        <div className={styles.heroIdText}>
          <span className={styles.heroKicker}>Pilotage & analyse EPS</span>
          <strong className={styles.heroName}>{name}</strong>
          <span className={styles.heroMission} title={missionName || ""}>
            <Layers size={12} /> {missionName || "Aucune mission"}
          </span>
        </div>
      </div>

      {/* KPI */}
      <div className={styles.heroKpis}>
        <div className={styles.heroRing} title={`${finished} / ${stats.total} traités`}>
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r={R} className={styles.ringTrack} />
            <circle
              cx="32"
              cy="32"
              r={R}
              className={styles.ringValue}
              strokeDasharray={C}
              strokeDashoffset={C - (C * pct) / 100}
            />
          </svg>
          <div className={styles.ringLabel}>
            <b>{pct}%</b>
            <small>traité</small>
          </div>
        </div>

        {tiles.map((t) => {
          const active = statusFilter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`${styles.kpiTile} ${t.tone} ${active ? styles.kpiTileActive : ""}`}
              onClick={() => onStatusClick(active ? "ALL" : t.id)}
              title={active ? "Retirer ce filtre" : `Afficher : ${t.label}`}
            >
              <span className={styles.kpiIcon}>{t.icon}</span>
              <span className={styles.kpiText}>
                <b>{t.value}</b>
                <small>{t.label}</small>
              </span>
            </button>
          );
        })}
      </div>

      {/* MISSION SELECTOR */}
      <div className={styles.selectorZone}>
        <LuxeDropdown
          variant="hero"
          align="right"
          minWidth={300}
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