"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Layers, Activity, ShieldCheck, Eye, Calendar, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LuxSelect from "@/components/ui/LuxSelect";
import { KxHeader, KxStats, KxStat, KxCard, KxEmpty } from "@/components/kx";
import styles from "./PilotHistory.module.css";

type Task = {
  id: number;
  status: string;
  epsReference?: string;
  importedAt?: string;
  template?: { id: number; name: string };
  dynamicData?: Record<string, unknown>;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  VALIDE: { label: "Validé", cls: "ok" },
  REJETE: { label: "Rejeté", cls: "bad" },
  DONE: { label: "En attente", cls: "warn" },
};

const formatDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("fr-FR") + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

export default function PilotHistory() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("ALL");
  const [user, setUser] = useState<{ id?: number; username?: string; errorCount?: number } | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) {
      const u = JSON.parse(stored);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique au montage
      setUser(u);
      fetch(`/api/tasks?assigneeId=${u.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTasks(data.filter((t: Task) => ["VALIDE", "REJETE", "DONE"].includes(t.status)).reverse());
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setTemplates(d); })
      .catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const valid = tasks.filter((t) => t.status === "VALIDE").length;
    return {
      total: tasks.length,
      rate: tasks.length ? Math.round((valid / tasks.length) * 100) : 100,
      integrity: Math.max(0, 100 - (user?.errorCount || 0) * 5),
    };
  }, [tasks, user]);

  const filtered = useMemo(() => {
    const t = q.trim().toUpperCase();
    return tasks.filter((x) =>
      (selectedTemplate === "ALL" || x.template?.id?.toString() === selectedTemplate) &&
      (!t || String(x.epsReference || "").toUpperCase().includes(t) || String(x.template?.name || "").toUpperCase().includes(t)));
  }, [tasks, selectedTemplate, q]);

  const options = [{ value: "ALL", label: "Tous les projets" }, ...templates.map((t) => ({ value: t.id.toString(), label: t.name }))];
  const integrityTone = stats.integrity > 80 ? "ok" : stats.integrity > 50 ? "warn" : "bad";

  return (
    <main className="kx-page">
      <KxHeader
        icon={History}
        eyebrow="Archive"
        title={<>Historique des <em>missions</em></>}
        subtitle={`Pilote ${user?.username || "—"} · toutes les tâches terminées, validées ou rejetées.`}
      />

      <KxStats>
        <KxStat icon={Layers} label="Opérations terminées" value={stats.total.toLocaleString("fr-FR")} />
        <KxStat icon={Activity} label="Taux de validation" value={`${stats.rate}%`} tone="sky" delay={0.06} />
        <KxStat icon={ShieldCheck} label="Intégrité pilote" value={`${stats.integrity}%`} tone={integrityTone} delay={0.12} />
      </KxStats>

      <KxCard
        title="Missions"
        icon={Calendar}
        count={filtered.length}
        actions={
          <div className={styles.tools}>
            <label className={styles.search}>
              <Search size={15} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un EPS…" aria-label="Rechercher un EPS" />
            </label>
            <div className={styles.select}><LuxSelect options={options} value={selectedTemplate} onChange={setSelectedTemplate} /></div>
          </div>
        }
      >
        {loading ? (
          <div className={styles.skeletons}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 0.08}s` }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <KxEmpty icon={History} title="Aucune mission archivée">
            <span>Les tâches validées ou rejetées apparaîtront ici.</span>
          </KxEmpty>
        ) : (
          <div className={styles.list}>
            <div className={styles.listHead}>
              <span>Statut</span><span>Projet</span><span>Référence EPS</span><span>Importé le</span><span />
            </div>
            {filtered.map((t, i) => {
              const st = STATUS[t.status] || { label: t.status, cls: "warn" };
              return (
                <motion.button
                  type="button"
                  key={t.id}
                  className={styles.row}
                  onClick={() => setSelected(t)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 15) * 0.03, duration: 0.35 }}
                >
                  <span><span className={`${styles.badge} ${styles[st.cls]}`}>{st.label}</span></span>
                  <span className={styles.name}>{t.template?.name || "—"}</span>
                  <span className={styles.mono}>{t.epsReference || "—"}</span>
                  <span className={styles.date}>{formatDate(t.importedAt)}</span>
                  <span className={styles.eye}><Eye size={16} /></span>
                </motion.button>
              );
            })}
          </div>
        )}
      </KxCard>

      <AnimatePresence>
        {selected && (
          <motion.div className={styles.overlay} onClick={() => setSelected(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-label={`Détail ${selected.epsReference}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={styles.modalHead}>
                <div>
                  <span className={styles.modalEyebrow}>{selected.template?.name || "Mission"}</span>
                  <h2 className={styles.mono}>{selected.epsReference}</h2>
                </div>
                <button type="button" className={styles.close} onClick={() => setSelected(null)} aria-label="Fermer" autoFocus><X size={18} /></button>
              </div>
              <div className={styles.grid}>
                {selected.dynamicData && Object.entries(selected.dynamicData).map(([k, v]) => (
                  <div key={k} className={styles.field}>
                    <span className={styles.fieldLabel}>{k}</span>
                    <span className={styles.fieldValue}>{String(v ?? "—")}</span>
                  </div>
                ))}
              </div>
              <div className={styles.modalFoot}>Importé le {formatDate(selected.importedAt)}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
