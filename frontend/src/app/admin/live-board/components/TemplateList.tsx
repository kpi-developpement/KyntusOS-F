"use client";

import React, { useEffect, useState } from "react";
import { FolderKanban, Layers, Cpu, Loader2 } from "lucide-react";
import styles from "../LiveBoard.module.css";

const API_URL = "/api";

interface TemplateListProps {
  onSelect: (template: any) => void;
}

export default function TemplateList({ onSelect }: TemplateListProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/templates`)
      .then((res) => res.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Erreur templates:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={styles.loader}>
        <Loader2 size={40} className={styles.spin} />
        <h3>Chargement des missions...</h3>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {templates.map((tpl) => (
        <div key={tpl.id} className={styles.card} onClick={() => onSelect(tpl)}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>{tpl.name || "Mission Sans Nom"}</div>
              <div className={styles.cardDesc}>
                {tpl.description || "Aucune description fournie pour cette mission."}
              </div>
            </div>
            <div className={styles.cardIcon}>
              <FolderKanban size={20} />
            </div>
          </div>
          <div className={styles.cardFooter}>
            <span className={styles.badge}>
              <Layers size={14} />
              {tpl.fields?.length || 0} Colonnes
            </span>
            <span className={styles.badge}>
              <Cpu size={14} />
              Complexité: {tpl.complexity || 1}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}