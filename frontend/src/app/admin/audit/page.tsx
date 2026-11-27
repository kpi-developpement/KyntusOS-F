"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Search, Flag, Trophy, User, Loader2 } from "lucide-react";
import { KxHeader, KxCard, KxAlert, KxEmpty } from "@/components/kx";
import styles from "./Audit.module.css";

type Task = { id: number; epsReference: string; status: string; flaggedError?: boolean; assignee?: { username: string }; dynamicData?: Record<string, unknown> };
type Pilot = { id: number; username: string; role: string; errorCount: number };

export default function AuditPage() {
  const [eps, setEps] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadStats = useCallback(() => {
    fetch("/api/admin/pilots-stats")
      .then((r) => r.json())
      .then((d) => setPilots(Array.isArray(d) ? d.filter((u: Pilot) => u.role === "PILOT").sort((a: Pilot, b: Pilot) => b.errorCount - a.errorCount) : []))
      .catch((e) => console.error(e));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
  useEffect(() => { loadStats(); }, [loadStats]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eps.trim()) return;
    setMsg(null); setTask(null); setConfirming(false); setSearching(true);
    try {
      const res = await fetch(`/api/admin/search?eps=${encodeURIComponent(eps.trim())}`);
      if (res.ok) setTask(await res.json());
      else setMsg({ tone: "bad", text: `Aucune tâche trouvée pour « ${eps.trim()} ».` });
    } catch {
      setMsg({ tone: "bad", text: "Serveur injoignable." });
    } finally {
      setSearching(false);
    }
  };

  const flag = async () => {
    if (!task) return;
    setConfirming(false);
    try {
      const res = await fetch(`/api/admin/flag-error/${task.id}`, { method: "POST" });
      if (res.ok) {
        setTask({ ...task, flaggedError: true });
        setMsg({ tone: "ok", text: `Erreur enregistrée sur ${task.epsReference}.` });
        loadStats();
      } else {
        setMsg({ tone: "bad", text: (await res.text()) || "Impossible d'enregistrer l'erreur." });
      }
    } catch {
      setMsg({ tone: "bad", text: "Serveur injoignable." });
    }
  };

  const maxErr = Math.max(1, ...pilots.map((p) => p.errorCount));

  return (
    <main className="kx-page">
      <KxHeader icon={ShieldAlert} eyebrow="Qualité" title={<>Audit &amp; <em>qualité</em></>} subtitle="Retrouvez une tâche par sa référence EPS et signalez une erreur au pilote concerné." />

      <div className={styles.grid}>
        <KxCard title="Recherche par EPS" icon={Search}>
          <form onSubmit={search} className={styles.searchRow}>
            <input className="kx-input" value={eps} onChange={(e) => setEps(e.target.value)} placeholder="EPS-0021045162" aria-label="Référence EPS" />
            <button type="submit" className="kx-btn" disabled={!eps.trim() || searching}>
              {searching ? <Loader2 size={16} className="kx-spin" /> : <Search size={16} />} Chercher
            </button>
          </form>

          {msg && <div className={styles.msg}><KxAlert tone={msg.tone}>{msg.text}</KxAlert></div>}

          <AnimatePresence mode="wait">
            {task && (
              <motion.div key={task.id} className={styles.result} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className={styles.resultHead}>
                  <span className="kx-mono">{task.epsReference}</span>
                  <span className={styles.status}>{task.status}</span>
                </div>
                <p className={styles.assignee}><User size={14} /> {task.assignee?.username || "Non assigné"}</p>
                {task.dynamicData && (
                  <dl className={styles.data}>
                    {Object.entries(task.dynamicData).map(([k, v]) => (
                      <div key={k}><dt>{k}</dt><dd>{String(v ?? "—")}</dd></div>
                    ))}
                  </dl>
                )}
                {task.flaggedError ? (
                  <div className={styles.flagged}><Flag size={15} /> Déjà signalée comme erreur</div>
                ) : confirming ? (
                  <div className={styles.confirm}>
                    <span>Ajouter +1 erreur à {task.assignee?.username || "ce pilote"} ?</span>
                    <button type="button" className="kx-btn kx-btn-danger kx-btn-sm" onClick={flag}><Flag size={14} /> Signaler {task.epsReference}</button>
                    <button type="button" className="kx-btn kx-btn-ghost kx-btn-sm" onClick={() => setConfirming(false)}>Annuler</button>
                  </div>
                ) : (
                  <button type="button" className="kx-btn kx-btn-danger" onClick={() => setConfirming(true)}><Flag size={16} /> Signaler une erreur</button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </KxCard>

        <KxCard title="Erreurs par pilote" icon={Trophy} count={pilots.length}>
          {pilots.length === 0 ? (
            <KxEmpty icon={Trophy} title="Aucun pilote"><span>Le suivi qualité apparaîtra ici.</span></KxEmpty>
          ) : (
            <ul className={styles.board}>
              {pilots.map((p, i) => (
                <motion.li key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
                  <span className={styles.avatar}>{p.username.slice(0, 2).toUpperCase()}</span>
                  <span className={styles.name}>{p.username}</span>
                  <span className={styles.bar}><span style={{ width: `${(p.errorCount / maxErr) * 100}%` }} /></span>
                  <b className={p.errorCount > 0 ? styles.bad : styles.good}>{p.errorCount}</b>
                </motion.li>
              ))}
            </ul>
          )}
        </KxCard>
      </div>
    </main>
  );
}
