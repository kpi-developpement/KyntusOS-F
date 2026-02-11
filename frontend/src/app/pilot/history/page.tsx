"use client";

import { useEffect, useState } from "react";
import { Filter, Eye, Clock, Trophy, X, Activity, Layers, Zap } from "lucide-react";
import styles from "./PilotHistory.module.css";
import anims from "./Animations.module.css"; // ✅ IMPORT DES ANIMATIONS
import LuxSelect from "@/components/ui/LuxSelect";
import InteractiveBackground from "@/components/ui/InteractiveBackground";

export default function PilotHistory() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("ALL");
  const [user, setUser] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        fetchTasks(u.id);
    }
    
    fetch("http://localhost:8080/api/templates")
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setTemplates(data); });
  }, []);

  const fetchTasks = (userId: number) => {
      fetch(`http://localhost:8080/api/tasks?assigneeId=${userId}`)
        .then(res => res.json())
        .then(data => {
            if(Array.isArray(data)) {
                const finished = data.filter(t => ["VALIDE", "REJETE", "DONE"].includes(t.status));
                setTasks(finished.reverse());
            }
        });
  };

  const filteredTasks = selectedTemplate === "ALL" 
      ? tasks 
      : tasks.filter(t => t.template?.id.toString() === selectedTemplate);

  const totalPoints = filteredTasks.reduce((acc, t) => acc + calculateScore(t.cumulativeTimeSeconds), 0);
  const totalTime = filteredTasks.reduce((acc, t) => acc + (t.cumulativeTimeSeconds || 0), 0);

  function calculateScore(seconds: number) {
    if (!seconds) return 100;
    const minutes = seconds / 60;
    const score = 100 - (minutes * 0.5);
    return Math.floor(Math.max(10, score));
  }

  function formatTime(sec: number) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m ${s}s`;
  }

  const filterOptions = [
      { value: "ALL", label: "TOUTES LES MISSIONS" },
      ...templates.map(t => ({ value: t.id.toString(), label: t.name.toUpperCase() }))
  ];

  return (
    <div className={styles.container}>
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:-1, opacity: 0.4, pointerEvents:'none'}}>
            <InteractiveBackground />
        </div>

        {/* HEADER */}
        <div className={styles.headerControl}>
            <div className={`${styles.titleBlock} ${anims.textReveal}`}>
                <h1>HALL OF FAME</h1>
                <p>// ARCHIVES TACTIQUES & PERFORMANCES</p>
            </div>
            <div className={`${styles.filterZone} ${anims.textReveal}`} style={{animationDelay: "0.2s"}}>
                <Filter size={18} color="#00f2ea" />
                <div style={{width: 250}}>
                    <LuxSelect 
                        label="" 
                        options={filterOptions} 
                        value={selectedTemplate} 
                        onChange={setSelectedTemplate} 
                    />
                </div>
            </div>
        </div>

        {/* KPI CARDS (AVEC FLOAT ANIMATION) */}
        <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${anims.cardEnter} ${anims.floating1}`} style={{animationDelay: "0.1s"}}>
                <span className={styles.kpiLabel}><Layers size={14}/> VOLUMÉTRIE</span>
                <div className={styles.kpiValue}>
                    {filteredTasks.length} <small>MISSIONS</small>
                </div>
            </div>
            
            <div className={`${styles.kpiCard} ${anims.cardEnter} ${anims.floating2}`} style={{animationDelay: "0.3s"}}>
                <span className={styles.kpiLabel}><Trophy size={14}/> SCORE PERFORMANCE</span>
                <div className={styles.kpiValue} style={{color:"#ffd700"}}>
                    {totalPoints} <small>PTS</small>
                </div>
            </div>
            
            <div className={`${styles.kpiCard} ${anims.cardEnter} ${anims.floating3}`} style={{animationDelay: "0.5s"}}>
                <span className={styles.kpiLabel}><Activity size={14}/> TEMPS OPÉRATIONNEL</span>
                <div className={styles.kpiValue} style={{color:"#00f2ea"}}>
                    {formatTime(totalTime)}
                </div>
            </div>
        </div>

        {/* TABLE GRILLE */}
        {filteredTasks.length === 0 ? (
            <div style={{height: 300, display:"flex", flexDirection:"column", gap:20, alignItems:"center", justifyContent:"center", opacity:0.5}}>
                <Zap size={40} color="#666"/>
                <span style={{color:"#666", letterSpacing:3, fontFamily:"monospace"}}>AUCUNE ARCHIVE DISPONIBLE</span>
            </div>
        ) : (
            <div className={`${styles.tableContainer} ${anims.cardEnter}`} style={{animationDelay: "0.6s"}}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ÉTAT</th>
                            <th>TYPE DE MISSION</th>
                            <th>RÉFÉRENCE EPS</th>
                            <th><Clock size={12} style={{marginRight:5, display:'inline'}}/> DURÉE</th>
                            <th><Trophy size={12} style={{marginRight:5, display:'inline'}}/> SCORE</th>
                            <th>DÉTAILS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.map((task, index) => {
                            const score = calculateScore(task.cumulativeTimeSeconds);
                            // Animation en cascade pour les lignes
                            return (
                                <tr 
                                    key={task.id} 
                                    className={anims.textReveal}
                                    style={{ animationDelay: `${0.8 + (index * 0.1)}s` }} 
                                >
                                    <td>
                                        {task.status === "VALIDE" && <span className={`${styles.statusBadge} ${styles.valide}`}><div className={styles.statusDot}></div> VALIDÉ</span>}
                                        {task.status === "REJETE" && <span className={`${styles.statusBadge} ${styles.rejete}`}><div className={styles.statusDot}></div> REJETÉ</span>}
                                        {task.status === "DONE" && <span className={`${styles.statusBadge} ${styles.attente}`}><div className={styles.statusDot}></div> EN ATTENTE</span>}
                                    </td>
                                    
                                    <td className={styles.missionType}>{task.template?.name || "N/A"}</td>
                                    <td className={styles.refText}>{task.epsReference}</td>
                                    <td className={styles.timeText}>{formatTime(task.cumulativeTimeSeconds || 0)}</td>
                                    <td className={styles.scoreText}>{score} PTS</td>
                                    
                                    <td>
                                        <button className={styles.viewBtn} onClick={() => setSelectedTask(task)} title="Inspecter">
                                            <Eye size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}

        {/* MODAL */}
        {selectedTask && (
            <div className={styles.modalOverlay} onClick={() => setSelectedTask(null)}>
                <div className={`${styles.modalContent} ${anims.cardEnter}`} onClick={e => e.stopPropagation()}>
                    <button className={styles.closeModal} onClick={() => setSelectedTask(null)}><X size={20}/></button>
                    
                    <div style={{display:'flex', alignItems:'center', gap:15, marginBottom:20}}>
                        <div style={{width:50, height:50, background:'rgba(0,242,234,0.1)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center'}}>
                            <Zap size={24} color="#00f2ea"/>
                        </div>
                        <div>
                            <h3 style={{color:"white", margin:0, fontSize:"1.2rem", textTransform:"uppercase", letterSpacing:1}}>Rapport de Mission</h3>
                            <div style={{color:"#00f2ea", fontSize:"0.8rem", fontFamily:"monospace", marginTop:5}}>REF: {selectedTask.epsReference}</div>
                        </div>
                    </div>

                    <div className={styles.detailGrid}>
                        {selectedTask.dynamicData && Object.entries(selectedTask.dynamicData).map(([key, value]) => (
                            <div key={key} className={styles.detailItem}>
                                <span className={styles.detailLabel}>{key}</span>
                                <span className={styles.detailValue}>{String(value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}