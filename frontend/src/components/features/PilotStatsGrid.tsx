"use client";

import { useEffect, useState } from "react";
import { 
  RefreshCw, Crown, Shield, Clock, Gavel, Loader2, ShieldCheck, 
  Info, X, Activity, TrendingUp 
} from "lucide-react";
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
      const res = await fetch("http://localhost:8080/api/stats/leaderboard");
      if(res.ok) {
        const data = await res.json();
        setStats(data || []);
      }
    } catch (err) {
      console.error(err);
      toast({ message: "Erreur connexion", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleVarSubmit = async (points: number, reason: string) => {
    if (!selectedPilotForVar) return;
    try {
        await fetch("http://localhost:8080/api/admin/points", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pilotId: selectedPilotForVar.id, points, reason })
        });
        toast({ message: "VAR Update Success", type: "success" });
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

  if (loading) return (
    <div style={{height:"60vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#333", letterSpacing:3}}>
        SYSTEM INITIALIZATION...
    </div>
  );

  return (
    <div className={styles.container}>
      
      {/* HEADER */}
      <div className={styles.headerTitle}>
          <div className={styles.titleGroup}>
              <h2 className={styles.titleMain}>LEAGUE STANDINGS</h2>
              <div className={styles.rulesTrigger}>
                  <Info size={18} className={styles.infoIcon}/>
                  <div className={styles.rulesPopup}>
                      <h4>RULES OF ENGAGEMENT</h4>
                      <ul>
                          <li><strong>+100 PTS</strong> par Tâche (Base)</li>
                          <li><strong>-0.5 PTS</strong> par Minute</li>
                          <li><strong>MULTIPLICATEUR</strong> de Qualité</li>
                      </ul>
                      <div className={styles.formula}>SCORE = (BASE - TEMPS) × QUALITÉ %</div>
                  </div>
              </div>
          </div>
          <button className={styles.refreshBtn} onClick={fetchStats}><RefreshCw size={20}/></button>
      </div>

      {/* TOP 3 PODIUM */}
      {stats.length > 0 && (
        <div className={styles.podiumGrid}>
            <div style={{marginTop: 40}}>
                {stats[1] && <PilotMonolith pilot={stats[1]} rank={2} openVar={openVar} onClick={() => setViewingProfile(stats[1])} formatTime={formatTime} />}
            </div>
            <div style={{zIndex: 10}}>
                {stats[0] && <PilotMonolith pilot={stats[0]} rank={1} openVar={openVar} onClick={() => setViewingProfile(stats[0])} formatTime={formatTime} />}
            </div>
            <div style={{marginTop: 60}}>
                {stats[2] && <PilotMonolith pilot={stats[2]} rank={3} openVar={openVar} onClick={() => setViewingProfile(stats[2])} formatTime={formatTime} />}
            </div>
        </div>
      )}

      {/* SQUAD LIST (LE CLEAN DATA STRIP) */}
      {stats.length > 3 && (
        <>
            <div className={styles.divider}><span>OPERATORS RANK 4+</span></div>
            <div className={styles.squadList}>
                {stats.slice(3).map((pilot, index) => {
                    
                    // --- 🔥 CALCUL DE COULEUR (Fade Blue -> Grey) 🔥 ---
                    const squadCount = stats.length - 3;
                    const progress = squadCount > 1 ? index / (squadCount - 1) : 0;
                    
                    // Saturation: 100% -> 0%
                    const sat = Math.round(90 - (progress * 90));
                    // Lightness: 50% -> 30% (pour que ça reste visible)
                    const light = Math.round(50 - (progress * 20));
                    // Opacity: 1 -> 0.4
                    const alpha = 1 - (progress * 0.5);

                    // Couleur calculée (ex: hsla(210, 90%, 50%, 1))
                    const dynamicColor = `hsla(210, ${sat}%, ${light}%, ${alpha})`;

                    return (
                        <div 
                            key={pilot.id} 
                            className={styles.squadCard} 
                            onClick={() => setViewingProfile(pilot)}
                            style={{ "--card-color": dynamicColor } as React.CSSProperties} // Passe la variable au CSS
                        >
                            <div className={styles.rankNumber}>{index + 4}</div>
                            
                            <div className={styles.squadInfo}>
                                <div className={styles.squadName}>{pilot.username}</div>
                                <div className={styles.miniMetrics}>
                                    <div className={styles.metricItem}>
                                        <ShieldCheck size={12} color={dynamicColor}/> 
                                        {(pilot.qualityScore || 0).toFixed(0)}%
                                    </div>
                                    <div className={styles.metricItem}>
                                        <Clock size={12} color={dynamicColor}/> 
                                        {formatTime(pilot.avgTimeSeconds)}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.squadScore}>
                                <span className={styles.scoreVal}>{(pilot.leaguePoints || 0).toFixed(0)}</span>
                                <span className={styles.scoreUnit}>PTS</span>
                            </div>

                            <button onClick={(e) => openVar(e, pilot)} className={styles.miniVarBtn} title="VAR Action">
                                <Gavel size={16}/>
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
      )}

      <VarModal 
        isOpen={isVarOpen} 
        onClose={() => setIsVarOpen(false)} 
        pilotName={selectedPilotForVar?.name || ""} 
        onSubmit={handleVarSubmit} 
      />

      {/* PROFIL MODAL */}
      {viewingProfile && (
        <div className={styles.profileOverlay} onClick={() => setViewingProfile(null)}>
            <div className={styles.profileModal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeProfile} onClick={() => setViewingProfile(null)}><X size={20}/></button>
                
                <div className={styles.profileHeader}>
                    <div className={styles.bigAvatar}>{viewingProfile.username.substring(0,2).toUpperCase()}</div>
                    <div>
                        <h2 style={{margin:0, color:"white"}}>{viewingProfile.username}</h2>
                        <span style={{color:"#00f2ea", fontSize:"0.7rem", letterSpacing:1, fontFamily:"monospace"}}>
                            OPERATOR TIER {Math.floor((viewingProfile.leaguePoints || 0) / 100) + 1}
                        </span>
                    </div>
                    <div className={styles.profileScore}>
                        {(viewingProfile.leaguePoints || 0).toFixed(0)}
                        <span style={{fontSize:"0.8rem", color:"#666", display:"block"}}>POINTS</span>
                    </div>
                </div>

                <div className={styles.profileGrid}>
                    <div className={styles.pCard}>
                        <label>TÂCHES</label>
                        <div className={styles.pValue}>{viewingProfile.totalTasks || 0}</div>
                        <Activity size={20} className={styles.pIcon}/>
                    </div>
                    <div className={styles.pCard}>
                        <label>VALIDÉES</label>
                        <div className={styles.pValue} style={{color:"#39ff14"}}>{viewingProfile.validatedTasks || 0}</div>
                        <ShieldCheck size={20} className={styles.pIcon}/>
                    </div>
                    <div className={styles.pCard}>
                        <label>REJETÉES</label>
                        <div className={styles.pValue} style={{color:"#ff0055"}}>{viewingProfile.rejectedTasks || 0}</div>
                        <Shield size={20} className={styles.pIcon}/>
                    </div>
                    <div className={styles.pCard}>
                        <label>TEMPS MOYEN</label>
                        <div className={styles.pValue}>{formatTime(viewingProfile.avgTimeSeconds)}</div>
                        <Clock size={20} className={styles.pIcon}/>
                    </div>
                </div>

                <div className={styles.varHistory}>
                    <div className={styles.varRow}>
                        <span>Solde Points Admin :</span>
                        <strong style={{color: (viewingProfile.manualPoints || 0) >= 0 ? "#39ff14" : "#ff0055"}}>
                            {viewingProfile.manualPoints || 0} pts
                        </strong>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// Le Composant "Monolith Card" (Podium)
function PilotMonolith({ pilot, rank, openVar, onClick, formatTime }: any) {
    const rankClass = rank === 1 ? styles.rank1 : rank === 2 ? styles.rank2 : styles.rank3;
    const color = rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32";
    
    return (
        <div className={`${styles.podiumCard} ${rankClass}`} onClick={onClick}>
            {rank === 1 && <div className={styles.crownContainer}><Crown size={40} /></div>}
            
            <div className={styles.avatarBox} style={{borderColor: color, boxShadow: `0 0 20px ${color}40`}}>
                {pilot.username.substring(0,2).toUpperCase()}
            </div>
            
            <div className={styles.pilotName}>{pilot.username}</div>
            
            <div className={styles.bigScore} style={{color: color, textShadow: `0 0 30px ${color}40`}}>
                {(pilot.leaguePoints || 0).toFixed(0)}
            </div>
            <div className={styles.scoreLabel}>LEAGUE POINTS</div>

            <div className={styles.statsRow}>
                <div className={styles.statItem}>
                    <span className={styles.statVal}>{(pilot.qualityScore || 0).toFixed(0)}%</span>
                    QUALITY
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statVal}>{formatTime(pilot.avgTimeSeconds)}</span>
                    SPEED
                </div>
            </div>

            <button className={styles.varAction} onClick={(e) => openVar(e, pilot)}>
                <Gavel size={14}/> JUGER (VAR)
            </button>
        </div>
    );
}