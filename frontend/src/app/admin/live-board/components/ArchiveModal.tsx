"use client";

import React, { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Eye, Info, Search, CheckCircle2, Hand, Users } from "lucide-react";
import LuxeModal from "../../../pilot/board/ui/LuxeModal";
import { TemplateStats, EMPTY_TEMPLATE_STATS } from "./TemplateList";
import styles from "../LiveBoard.module.css";

interface ArchiveModalProps {
  open: boolean;
  onClose: () => void;
  templates: any[];
  stats: Record<string, TemplateStats>;
  /** "AUTO" = archivée car 100% terminée, "MANUAL" = archivée à la main */
  reasonOf: (template: any) => "AUTO" | "MANUAL";
  onRestore: (template: any) => void;
  onOpen: (template: any) => void;
}

export default function ArchiveModal({ open, onClose, templates, stats, reasonOf, onRestore, onOpen }: ArchiveModalProps) {
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? templates.filter((t) => String(t.name || "").toLowerCase().includes(s)) : templates;
  }, [templates, q]);

  return (
    <LuxeModal
      open={open}
      onClose={onClose}
      width={820}
      icon={<Archive size={20} />}
      title={`Archives des missions (${templates.length})`}
      subtitle="Missions terminées à 100 % ou archivées manuellement. Restaurez-les à tout moment."
    >
      <div className={styles.archiveBody}>
        <div className={styles.archiveInfo}>
          <Info size={16} />
          <span>
            Une mission passe automatiquement en archive quand tous ses EPS sont terminés ou validés. Vous pouvez aussi
            archiver / restaurer n&apos;importe quelle mission à la main.
          </span>
        </div>

        {templates.length > 4 && (
          <div className={styles.searchWrap} style={{ maxWidth: "none" }}>
            <Search size={16} />
            <input className={styles.searchInput} placeholder="Chercher une mission archivée..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        )}

        {visible.length === 0 ? (
          <div className={styles.archiveEmpty}>
            <Archive size={30} color="#93c5fd" />
            <b>{templates.length === 0 ? "Aucune mission archivée" : "Aucun résultat"}</b>
            <span>Les missions terminées apparaîtront ici automatiquement.</span>
          </div>
        ) : (
          <div className={styles.archiveList}>
            {visible.map((tpl, i) => {
              const s = stats[String(tpl.id)] || EMPTY_TEMPLATE_STATS;
              const reason = reasonOf(tpl);
              const pct = s.total ? Math.round(((s.done + s.valid) / s.total) * 100) : 0;
              return (
                <div key={tpl.id} className={styles.archiveItem} style={{ ["--i" as any]: i }}>
                  <div className={styles.archiveIcon}>
                    <Archive size={18} />
                  </div>
                  <div className={styles.archiveMain}>
                    <div className={styles.archiveName} title={tpl.name}>
                      {tpl.name || "Mission sans nom"}
                    </div>
                    <div className={styles.archiveMeta}>
                      {reason === "AUTO" ? (
                        <span className={`${styles.badge} ${styles.badgeOk}`}>
                          <CheckCircle2 size={12} /> Terminée 100%
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeArchive}`}>
                          <Hand size={12} /> Archivée à la main
                        </span>
                      )}
                      <span className={styles.badge}>
                        {s.done + s.valid} / {s.total} EPS · {pct}%
                      </span>
                      <span className={styles.badge}>
                        <Users size={12} /> {s.pilots}
                      </span>
                    </div>
                  </div>
                  <div className={styles.archiveActions}>
                    <button type="button" className={`${styles.smallBtn} ${styles.smallGhost}`} onClick={() => onOpen(tpl)} title="Voir l'équipe">
                      <Eye size={14} /> Voir
                    </button>
                    <button type="button" className={`${styles.smallBtn} ${styles.smallPrimary}`} onClick={() => onRestore(tpl)}>
                      <ArchiveRestore size={14} /> Restaurer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LuxeModal>
  );
}