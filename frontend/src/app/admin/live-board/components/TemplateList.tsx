"use client";

import React from "react";
import { FolderKanban, Layers, Cpu, Archive, CheckCircle2, Users, ChevronRight } from "lucide-react";
import styles from "../LiveBoard.module.css";

export interface TemplateStats {
  total: number;
  todo: number;
  progress: number;
  done: number;
  valid: number;
  error: number;
  pilots: number;
}

export const EMPTY_TEMPLATE_STATS: TemplateStats = { total: 0, todo: 0, progress: 0, done: 0, valid: 0, error: 0, pilots: 0 };

/** Mission terminée = au moins 1 EPS et plus rien à faire / en cours / en erreur. */
export function isTemplateCompleted(s?: TemplateStats): boolean {
  return !!s && s.total > 0 && s.todo + s.progress + s.error === 0;
}

interface TemplateListProps {
  templates: any[];
  stats: Record<string, TemplateStats>;
  statsLoading: boolean;
  onSelect: (template: any) => void;
  onArchive: (template: any) => void;
  emptyLabel?: string;
}

/** Spotlight effect: mouse position → CSS vars used by .card::after */
export const trackSpotlight = (e: React.MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

export default function TemplateList({ templates, stats, statsLoading, onSelect, onArchive, emptyLabel }: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className={styles.loader}>
        <div className={styles.loaderIcon}>
          <FolderKanban size={30} />
        </div>
        <h3>{emptyLabel || "Aucune mission active"}</h3>
        <p>Les missions terminées sont rangées dans les archives.</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {templates.map((tpl, i) => {
        const s = stats[String(tpl.id)] || EMPTY_TEMPLATE_STATS;
        const finished = s.done + s.valid;
        const pct = s.total ? Math.round((finished / s.total) * 100) : 0;
        const w = (n: number) => `${s.total ? (n / s.total) * 100 : 0}%`;
        const completed = isTemplateCompleted(s);

        return (
          <div
            key={tpl.id}
            className={styles.card}
            style={{ ["--i" as any]: i }}
            onMouseMove={trackSpotlight}
            onClick={() => onSelect(tpl)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onSelect(tpl)}
          >
            <div className={styles.cardHeader}>
              <div style={{ minWidth: 0 }}>
                <div className={styles.cardTitle}>{tpl.name || "Mission sans nom"}</div>
                <div className={styles.cardDesc}>{tpl.description || "Aucune description fournie pour cette mission."}</div>
              </div>
              <div className={styles.cardIcon}>
                <FolderKanban size={20} />
              </div>
            </div>

            <div className={styles.progressBlock}>
              <div className={styles.progressTop}>
                <span>{statsLoading && !stats[String(tpl.id)] ? "Calcul..." : `${finished} / ${s.total} EPS traités`}</span>
                <b>{pct}%</b>
              </div>
              <div className={styles.progressBar}>
                <i className={styles.segValid} style={{ width: w(s.valid) }} />
                <i className={styles.segDone} style={{ width: w(s.done) }} />
                <i className={styles.segProgress} style={{ width: w(s.progress) }} />
              </div>
              <div className={styles.progressLegend}>
                <span><em className={styles.segValid} /> Validé {s.valid}</span>
                <span><em className={styles.segDone} /> Terminé {s.done}</span>
                <span><em className={styles.segProgress} /> En cours {s.progress}</span>
                <span><em style={{ background: "#dbeafe" }} /> À faire {s.todo}</span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <div className={styles.badges}>
                <span className={styles.badge}>
                  <Users size={13} /> {s.pilots} pilote(s)
                </span>
                <span className={styles.badge}>
                  <Layers size={13} /> {tpl.fields?.length || 0} col.
                </span>
                <span className={styles.badge}>
                  <Cpu size={13} /> {tpl.complexity || 1}
                </span>
                {completed && (
                  <span className={`${styles.badge} ${styles.badgeOk}`}>
                    <CheckCircle2 size={13} /> 100%
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className={`${styles.iconAction} ${styles.iconActionWarn}`}
                  title="Envoyer aux archives"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(tpl);
                  }}
                >
                  <Archive size={15} />
                </button>
                <span className={styles.iconAction} aria-hidden>
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}