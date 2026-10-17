"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import styles from "../LiveBoard.module.css";

const API_URL = "/api";

interface PilotListProps {
  templateId: number;
  onSelect: (pilot: any) => void;
}

export default function PilotList({ templateId, onSelect }: PilotListProps) {
  const [pilotsStats, setPilotsStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On utilise l'endpoint existant qui ramène les stats des pilotes pour un template
    fetch(`${API_URL}/stats/template/${templateId}/pilots`)
      .then((res) => res.json())
      .then((data) => {
        // On filtre pour ne garder que les pilotes qui ont au moins 1 tâche dans cette mission
        const activePilots = Array.isArray(data) 
          ? data.filter(p => (p.todoCount + p.inProgressCount + p.doneCount + p.validCount + p.errorCount) > 0)
          : [];
        setPilotsStats(activePilots);
      })
      .catch((err) => console.error("Erreur stats pilotes:", err))
      .finally(() => setLoading(false));
  }, [templateId]);

  if (loading) {
    return (
      <div className={styles.loader}>
        <Loader2 size={40} className={styles.spin} />
        <h3>Analyse de l'équipe en cours...</h3>
      </div>
    );
  }

  if (pilotsStats.length === 0) {
    return (
      <div className={styles.loader} style={{ color: "#64748b" }}>
        <Users size={48} />
        <h3>Aucun pilote actif sur cette mission.</h3>
        <p>Assignez des tâches à des pilotes pour les voir apparaître ici.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {pilotsStats.map((pilot) => {
        const total = pilot.todoCount + pilot.inProgressCount + pilot.doneCount + pilot.validCount + pilot.errorCount;
        
        return (
          <div key={pilot.pilotId} className={styles.card} onClick={() => onSelect(pilot)}>
            <div className={styles.pilotHeader}>
              <div className={styles.pilotAvatar}>
                {pilot.pilotName ? pilot.pilotName.charAt(0).toUpperCase() : "P"}
              </div>
              <div>
                <div className={styles.pilotName}>{pilot.pilotName}</div>
                <div className={styles.pilotRate}>
                  Taux de complétion: {pilot.completionRate}%
                </div>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={`${styles.statBox} ${styles.todo}`}>
                <span className={styles.statLabel}>À Faire</span>
                <span className={styles.statValue}>{pilot.todoCount}</span>
              </div>
              <div className={`${styles.statBox} ${styles.progress}`}>
                <span className={styles.statLabel}>En Cours</span>
                <span className={styles.statValue}>{pilot.inProgressCount}</span>
              </div>
              <div className={`${styles.statBox} ${styles.done}`}>
                <span className={styles.statLabel}>Terminé (Pilote)</span>
                <span className={styles.statValue}>{pilot.doneCount}</span>
              </div>
              <div className={`${styles.statBox} ${styles.valid}`}>
                <span className={styles.statLabel}>Validé (Admin)</span>
                <span className={styles.statValue}>{pilot.validCount}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}