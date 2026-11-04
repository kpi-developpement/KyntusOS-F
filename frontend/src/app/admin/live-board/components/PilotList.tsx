"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Users, Search, Radio } from "lucide-react";
import { trackSpotlight } from "./TemplateList";
import styles from "../LiveBoard.module.css";

const API_URL = "/api";
const REFRESH_MS = 10000;

interface PilotListProps {
  templateId: number;
  onSelect: (pilot: any) => void;
}

type SortKey = "ACTIVITY" | "PROGRESS" | "NAME";

const totalOf = (p: any) =>
  (p.todoCount || 0) + (p.inProgressCount || 0) + (p.doneCount || 0) + (p.validCount || 0) + (p.errorCount || 0);

export default function PilotList({ templateId, onSelect }: PilotListProps) {
  const [pilotsStats, setPilotsStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ACTIVITY");

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${API_URL}/stats/template/${templateId}/pilots`)
        .then((res) => res.json())
        .then((data) => {
          if (!alive) return;
          setPilotsStats(Array.isArray(data) ? data.filter((p) => totalOf(p) > 0) : []);
        })
        .catch((err) => console.error("Erreur stats pilotes:", err))
        .finally(() => alive && setLoading(false));

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [templateId]);

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? pilotsStats.filter((p) => String(p.pilotName || "").toLowerCase().includes(s)) : [...pilotsStats];
    const pct = (p: any) => {
      const t = totalOf(p);
      return t ? ((p.doneCount + p.validCount) / t) * 100 : 0;
    };
    list.sort((a, b) => {
      if (sortKey === "NAME") return String(a.pilotName).localeCompare(String(b.pilotName));
      if (sortKey === "PROGRESS") return pct(b) - pct(a);
      return (b.inProgressCount || 0) - (a.inProgressCount || 0) || (b.todoCount || 0) - (a.todoCount || 0);
    });
    return list;
  }, [pilotsStats, q, sortKey]);

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className={styles.loaderIcon}>
          <Loader2 size={30} className={styles.spin} />
        </div>
        <h3>Analyse de l&apos;équipe en cours...</h3>
      </div>
    );
  }

  if (pilotsStats.length === 0) {
    return (
      <div className={styles.loader}>
        <div className={styles.loaderIcon}>
          <Users size={30} />
        </div>
        <h3>Aucun pilote actif sur cette mission</h3>
        <p>Assignez des tâches à des pilotes pour les voir apparaître ici.</p>
      </div>
    );
  }

  const R = 23;
  const C = 2 * Math.PI * R;

  return (
    <>
      <div className={styles.listToolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input className={styles.searchInput} placeholder="Chercher un pilote..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className={styles.segmented}>
          {(
            [
              { id: "ACTIVITY", label: "Activité" },
              { id: "PROGRESS", label: "Progression" },
              { id: "NAME", label: "Nom" },
            ] as { id: SortKey; label: string }[]
          ).map((s) => (
            <button key={s.id} type="button" className={`${styles.segment} ${sortKey === s.id ? styles.segmentActive : ""}`} onClick={() => setSortKey(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {visible.map((pilot, i) => {
          const total = totalOf(pilot);
          const pct = total ? Math.round(((pilot.doneCount + pilot.validCount) / total) * 100) : 0;
          const working = (pilot.inProgressCount || 0) > 0;
          const initials = String(pilot.pilotName || "P")
            .split(/[\s._-]+/)
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={pilot.pilotId}
              className={styles.card}
              style={{ ["--i" as any]: i }}
              onMouseMove={trackSpotlight}
              onClick={() => onSelect(pilot)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onSelect(pilot)}
            >
              <div className={styles.pilotHeader}>
                <div className={styles.pilotAvatar}>
                  {initials}
                  <i className={`${styles.pilotLive} ${working ? "" : styles.pilotIdle}`} title={working ? "En activité" : "Aucune tâche en cours"} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.pilotName}>{pilot.pilotName}</div>
                  <div className={styles.pilotSub}>
                    {total} EPS · {working ? `${pilot.inProgressCount} en cours` : "aucune en cours"}
                  </div>
                </div>
                <div className={styles.pilotRing}>
                  <svg viewBox="0 0 58 58" width="58" height="58">
                    <circle cx="29" cy="29" r={R} className={styles.ringTrack} />
                    <circle cx="29" cy="29" r={R} className={styles.ringValue} strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} />
                  </svg>
                  <span className={styles.ringLabel}>{pct}%</span>
                </div>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>À faire</span>
                  <span className={styles.statValue}>{pilot.todoCount}</span>
                </div>
                <div className={`${styles.statBox} ${styles.statProgress}`}>
                  <span className={styles.statLabel}>En cours</span>
                  <span className={styles.statValue}>{pilot.inProgressCount}</span>
                </div>
                <div className={`${styles.statBox} ${styles.statDone}`}>
                  <span className={styles.statLabel}>Terminé</span>
                  <span className={styles.statValue}>{pilot.doneCount}</span>
                </div>
                <div className={`${styles.statBox} ${styles.statValid}`}>
                  <span className={styles.statLabel}>Validé</span>
                  <span className={styles.statValue}>{pilot.validCount}</span>
                </div>
              </div>

              <div className={styles.watchHint}>
                <Radio size={14} /> Observer en direct
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}