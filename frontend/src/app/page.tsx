"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Clock, Zap, CheckCircle2, ShieldCheck, ChevronDown, Layers, Loader2, Wifi, WifiOff } from "lucide-react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import AuthGuard from "@/components/layout/AuthGuard";
import { KxHeader, KxStats, KxStat, KxCount, KxCard, KxEmpty } from "@/components/kx";
import { apiJsonOr } from "@/lib/api";
import styles from "./page.module.css";

type Project = { templateId: number; templateName: string; totalTasks: number; progress: number; countActive: number; countValid: number };
type Pilot = { pilotId: number; pilotName: string; completionRate: number; todoCount: number; inProgressCount: number; doneCount: number; validCount: number };
type Dashboard = { global?: { totalToDo?: number; totalInProgress?: number; totalDone?: number; totalValid?: number }; projects?: Project[] };

// Étapes ordonnées du flux : gris (pas commencé) puis bleus de plus en plus profonds
const STAGES = [
  { key: "totalToDo", label: "À faire", color: "#cbd5e1" },
  { key: "totalInProgress", label: "En cours", color: "#93c5fd" },
  { key: "totalDone", label: "Terminées", color: "#3b82f6" },
  { key: "totalValid", label: "Validées", color: "#1e40af" },
] as const;

export default function CommandPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pilots, setPilots] = useState<Record<number, Pilot[]>>({});
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const fetchPilots = useCallback(async (id: number) => {
    const d = await apiJsonOr<Pilot[]>(`/api/stats/template/${id}/pilots`, []);
    setPilots((p) => ({ ...p, [id]: Array.isArray(d) ? d : [] }));
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const d = await apiJsonOr<Dashboard | null>("/api/stats/dashboard-summary", null);
      if (d) { setData(d); setLastUpdate(new Date()); }
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS("/ws"),
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/workflow-events", (m) => { if (m.body === "TASK_UPDATE") fetchDashboard(); });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });
    client.activate();
    return () => { client.deactivate(); };
  }, [fetchDashboard]);

  useEffect(() => {
    if (expandedId !== null && lastUpdate) fetchPilots(expandedId);
  }, [lastUpdate, expandedId, fetchPilots]);

  const toggle = (id: number) => {
    if (expandedId === id) setExpandedId(null);
    else { setExpandedId(id); fetchPilots(id); }
  };

  const g = data?.global || {};
  const totals = STAGES.map((s) => ({ ...s, value: Number(g[s.key] || 0) }));
  const sum = totals.reduce((a, b) => a + b.value, 0);
  const projects = data?.projects || [];

  return (
    <AuthGuard>
      <main className="kx-page">
        <KxHeader
          icon={LayoutGrid}
          eyebrow="Administration"
          title={<>Centre de <em>commande</em></>}
          subtitle="Vue en direct de toutes les opérations, projet par projet."
          actions={
            <span className={`${styles.live} ${connected ? styles.liveOn : ""}`}>
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {connected ? "Temps réel" : "Reconnexion…"}
              {lastUpdate && <small>· {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small>}
            </span>
          }
        />

        <KxStats>
          <KxStat icon={Clock} label="À faire" value={loading ? "—" : <KxCount value={totals[0].value} />} tone="warn" />
          <KxStat icon={Zap} label="En cours" value={loading ? "—" : <KxCount value={totals[1].value} />} tone="sky" delay={0.05} />
          <KxStat icon={CheckCircle2} label="Terminées" value={loading ? "—" : <KxCount value={totals[2].value} />} delay={0.1} />
          <KxStat icon={ShieldCheck} label="Validées" value={loading ? "—" : <KxCount value={totals[3].value} />} tone="ok" delay={0.15} />
        </KxStats>

        {/* Répartition globale : barre segmentée + légende chiffrée */}
        <KxCard title="Répartition des tâches" icon={Layers} count={sum.toLocaleString("fr-FR")}>
          {sum === 0 ? (
            <p className={styles.muted}>{loading ? "Chargement…" : "Aucune tâche pour le moment."}</p>
          ) : (
            <>
              <div className={styles.stack} role="img" aria-label={totals.map((t) => `${t.label} ${t.value}`).join(", ")}>
                {totals.filter((t) => t.value > 0).map((t) => (
                  <motion.span
                    key={t.key}
                    className={`${styles.seg} ${hover && hover !== t.key ? styles.segDim : ""}`}
                    style={{ background: t.color }}
                    initial={{ flexGrow: 0 }}
                    animate={{ flexGrow: t.value }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    onPointerEnter={() => setHover(t.key)}
                    onPointerLeave={() => setHover(null)}
                  >
                    {hover === t.key && (
                      <span className={styles.tip}>
                        <b>{t.label}</b> {t.value.toLocaleString("fr-FR")} · {Math.round((t.value / sum) * 100)} %
                      </span>
                    )}
                  </motion.span>
                ))}
              </div>
              <ul className={styles.legend}>
                {totals.map((t) => (
                  <li key={t.key} onPointerEnter={() => setHover(t.key)} onPointerLeave={() => setHover(null)}>
                    <i style={{ background: t.color }} />
                    <span>{t.label}</span>
                    <b>{t.value.toLocaleString("fr-FR")}</b>
                    <small>{Math.round((t.value / sum) * 100)} %</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </KxCard>

        {/* Projets */}
        <section className={styles.projects}>
          <h2 className={styles.sectionTitle}>Opérations actives <span>{projects.length}</span></h2>
          {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className={`kx-skeleton ${styles.skel}`} />)}
          {!loading && projects.length === 0 && (
            <KxCard><KxEmpty icon={Layers} title="Aucune opération active"><span>Les projets apparaîtront ici dès qu&apos;une tâche sera dispatchée.</span></KxEmpty></KxCard>
          )}
          {projects.map((p, i) => {
            const open = expandedId === p.templateId;
            const list = pilots[p.templateId];
            return (
              <motion.article
                key={p.templateId}
                className={`${styles.project} ${open ? styles.projectOpen : ""}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <button type="button" className={styles.row} onClick={() => toggle(p.templateId)} aria-expanded={open}>
                  <span className={styles.ring} style={{ "--p": p.progress } as React.CSSProperties}>
                    <span>{p.progress}<small>%</small></span>
                  </span>
                  <span className={styles.pInfo}>
                    <b>{p.templateName}</b>
                    <small>{p.totalTasks.toLocaleString("fr-FR")} tâches · projet #{p.templateId}</small>
                  </span>
                  <span className={styles.meter} aria-hidden="true">
                    <motion.span initial={{ width: 0 }} animate={{ width: `${p.progress}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
                  </span>
                  <span className={styles.pills}>
                    <span className={styles.pill}><b>{p.countActive}</b> en cours</span>
                    <span className={`${styles.pill} ${styles.pillOk}`}><b>{p.countValid}</b> validées</span>
                  </span>
                  <ChevronDown size={18} className={styles.chev} />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      className={styles.panel}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className={styles.pilots}>
                        {!list && <div className={styles.muted}><Loader2 size={16} className="kx-spin" /> Chargement des pilotes…</div>}
                        {list && list.length === 0 && <div className={styles.muted}>Aucun pilote sur ce projet.</div>}
                        {list?.map((pl) => (
                          <div key={pl.pilotId} className={styles.pilot}>
                            <div className={styles.pilotHead}>
                              <span className={styles.avatar}>{pl.pilotName.slice(0, 2).toUpperCase()}</span>
                              <span><b>{pl.pilotName}</b><small>{pl.completionRate}% terminé</small></span>
                            </div>
                            <span className={styles.pilotMeter}><span style={{ width: `${pl.completionRate}%` }} /></span>
                            <dl className={styles.pilotStats}>
                              <div><dt>À faire</dt><dd>{pl.todoCount}</dd></div>
                              <div><dt>En cours</dt><dd>{pl.inProgressCount}</dd></div>
                              <div><dt>Terminées</dt><dd>{pl.doneCount}</dd></div>
                              <div><dt>Validées</dt><dd>{pl.validCount}</dd></div>
                            </dl>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </section>
      </main>
    </AuthGuard>
  );
}
