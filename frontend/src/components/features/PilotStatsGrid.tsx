"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Crown, Shield, Clock, Gavel, ShieldCheck, Info, X, Activity, UsersRound, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { KxHeader, KxCount, KxEmpty } from "@/components/kx";
import styles from "./PilotStatsGrid.module.css";
import VarModal from "./VarModal";
import { toast } from "../ui/Toaster";

interface PilotStats {
  id: number;
  username: string;
  totalTasks?: number;
  validatedTasks?: number;
  rejectedTasks?: number;
  qualityScore?: number;
  manualPoints?: number;
  avgTimeSeconds?: number;
  leaguePoints?: number;
}

export default function PilotStatsGrid() {
  const [stats, setStats] = useState<PilotStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVarOpen, setIsVarOpen] = useState(false);
  const [selectedPilotForVar, setSelectedPilotForVar] = useState<{id: number, name: string} | null>(null);
  const [viewingProfile, setViewingProfile] = useState<PilotStats | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats/leaderboard");
      if(res.ok) {
        const data = await res.json();
        setStats(data || []);
      }
    } catch (err) {
      console.error(err);
      toast({ message: "Impossible de charger le classement", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
  useEffect(() => { fetchStats(); }, []);

  const handleVarSubmit = async (points: number, reason: string) => {
    if (!selectedPilotForVar) return;
    try {
        await fetch("/api/admin/points", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pilotId: selectedPilotForVar.id, points, reason })
        });
        toast({ message: "Points mis à jour", type: "success" });
        fetchStats();
    } catch (e) { console.error(e); }
  };

  const openVar = (e: React.MouseEvent, pilot: PilotStats) => {
      e.stopPropagation();
      setSelectedPilotForVar({ id: pilot.id, name: pilot.username });
      setIsVarOpen(true);
  };

  const formatTime = (sec?: number) => {
      if (!sec) return "0s";
      if (sec < 60) return `${Math.round(sec)}s`;
      return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  };

  const top = Math.max(1, ...stats.map((s) => s.leaguePoints || 0));
  const podium = [stats[1], stats[0], stats[2]];

  return (
    <div className={styles.container}>
      <KxHeader
        icon={UsersRound}
        eyebrow="Équipe"
        title={<>Classement des <em>pilotes</em></>}
        subtitle="Points de ligue calculés à partir du volume, du temps passé et de la qualité."
        actions={
          <>
            <span className={styles.rules} tabIndex={0}>
              <Info size={16} /> Règles
              <span className={styles.rulesPopup} role="tooltip">
                <b>Calcul du score</b>
                <span>+100 pts par tâche</span>
                <span>−0,5 pt par minute passée</span>
                <span>× taux de qualité</span>
                <code>score = (base − temps) × qualité %</code>
              </span>
            </span>
            <button type="button" className="kx-btn kx-btn-ghost" onClick={fetchStats} disabled={loading}>
              <RefreshCw size={16} className={loading ? "kx-spin" : ""} /> Actualiser
            </button>
          </>
        }
      />

      {loading && stats.length === 0 ? (
        <div className={styles.skels}>{[0, 1, 2].map((i) => <div key={i} className="kx-skeleton" style={{ height: 280, borderRadius: 24 }} />)}</div>
      ) : stats.length === 0 ? (
        <div className={styles.emptyCard}><KxEmpty icon={Trophy} title="Aucun pilote classé"><span>Le classement apparaîtra dès les premières tâches validées.</span></KxEmpty></div>
      ) : (
        <>
          <div className={styles.podium}>
            {podium.map((p, i) => p && (
              <PilotMonolith key={p.id} pilot={p} rank={i === 1 ? 1 : i === 0 ? 2 : 3} openVar={openVar} onClick={() => setViewingProfile(p)} formatTime={formatTime} />
            ))}
          </div>

          {stats.length > 3 && (
            <section className={styles.list}>
              <h3 className={styles.listTitle}>Suite du classement</h3>
              {stats.slice(3).map((pilot, index) => (
                <motion.div
                  key={pilot.id}
                  className={styles.row}
                  onClick={() => setViewingProfile(pilot)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index, 12) * 0.03 }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") setViewingProfile(pilot); }}
                >
                  <span className={styles.rank}>{index + 4}</span>
                  <span className={styles.avatar}>{pilot.username.slice(0, 2).toUpperCase()}</span>
                  <span className={styles.who}>
                    <b>{pilot.username}</b>
                    <small><ShieldCheck size={12} /> {(pilot.qualityScore || 0).toFixed(0)} % · <Clock size={12} /> {formatTime(pilot.avgTimeSeconds)}</small>
                  </span>
                  <span className={styles.track}><span style={{ width: `${((pilot.leaguePoints || 0) / top) * 100}%` }} /></span>
                  <span className={styles.pts}>{(pilot.leaguePoints || 0).toFixed(0)}<small>pts</small></span>
                  <button type="button" onClick={(e) => openVar(e, pilot)} className={styles.varBtn} aria-label={`Ajuster les points de ${pilot.username}`} title="Ajuster les points">
                    <Gavel size={15} />
                  </button>
                </motion.div>
              ))}
            </section>
          )}
        </>
      )}

      <VarModal isOpen={isVarOpen} onClose={() => setIsVarOpen(false)} pilotName={selectedPilotForVar?.name || ""} onSubmit={handleVarSubmit} />

      <AnimatePresence>
        {viewingProfile && (
          <motion.div className={styles.overlay} onClick={() => setViewingProfile(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className={styles.profile}
              role="dialog"
              aria-modal="true"
              aria-label={`Profil de ${viewingProfile.username}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <button type="button" className={styles.close} onClick={() => setViewingProfile(null)} aria-label="Fermer"><X size={18} /></button>
              <div className={styles.profileHead}>
                <span className={styles.bigAvatar}>{viewingProfile.username.slice(0, 2).toUpperCase()}</span>
                <div>
                  <h2>{viewingProfile.username}</h2>
                  <span className={styles.tier}>Niveau {Math.floor((viewingProfile.leaguePoints || 0) / 100) + 1}</span>
                </div>
                <div className={styles.profileScore}><KxCount value={Math.round(viewingProfile.leaguePoints || 0)} /><small>points</small></div>
              </div>
              <div className={styles.profileGrid}>
                <div><Activity size={16} /><small>Tâches</small><b>{viewingProfile.totalTasks || 0}</b></div>
                <div><ShieldCheck size={16} /><small>Validées</small><b className={styles.okTxt}>{viewingProfile.validatedTasks || 0}</b></div>
                <div><Shield size={16} /><small>Rejetées</small><b className={styles.badTxt}>{viewingProfile.rejectedTasks || 0}</b></div>
                <div><Clock size={16} /><small>Temps moyen</small><b>{formatTime(viewingProfile.avgTimeSeconds)}</b></div>
              </div>
              <div className={styles.balance}>
                <span>Solde des ajustements admin</span>
                <b className={(viewingProfile.manualPoints || 0) >= 0 ? styles.okTxt : styles.badTxt}>{viewingProfile.manualPoints || 0} pts</b>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PilotMonolith({ pilot, rank, openVar, onClick, formatTime }: {
  pilot: PilotStats; rank: 1 | 2 | 3; openVar: (e: React.MouseEvent, p: PilotStats) => void; onClick: () => void; formatTime: (s?: number) => string;
}) {
  const medal = rank === 1 ? styles.gold : rank === 2 ? styles.silver : styles.bronze;
  return (
    <motion.div
      className={`${styles.mono} ${medal} ${rank === 1 ? "kx-ring kx-ring-on" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: rank === 1 ? 0.05 : rank === 2 ? 0.15 : 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className={styles.rankBadge}>{rank === 1 ? <Crown size={16} /> : `#${rank}`}</span>
      <span className={styles.monoAvatar}>{pilot.username.slice(0, 2).toUpperCase()}</span>
      <b className={styles.monoName}>{pilot.username}</b>
      <span className={styles.monoScore}><KxCount value={Math.round(pilot.leaguePoints || 0)} /></span>
      <small className={styles.monoLabel}>points de ligue</small>
      <div className={styles.monoStats}>
        <span><b>{(pilot.qualityScore || 0).toFixed(0)} %</b>qualité</span>
        <span><b>{formatTime(pilot.avgTimeSeconds)}</b>temps moyen</span>
      </div>
      <button type="button" className={styles.monoVar} onClick={(e) => openVar(e, pilot)}>
        <Gavel size={14} /> Ajuster les points
      </button>
    </motion.div>
  );
}
