"use client";

import { useEffect, useState } from "react";
import { 
  Layers, ArrowRight, ArrowLeft, CheckCircle, Clock, 
  AlertCircle, Shield, Zap, Database 
} from "lucide-react";
import styles from "./TacticalKanban.module.css";
import LuxSelect from "@/components/ui/LuxSelect";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import SystemIdle from "@/components/ui/SystemIdle";
import { toast } from "@/components/ui/Toaster";
import LiveTimer from "@/components/ui/LiveTimer"; // Réutilisation du Timer

export default function PilotKanban() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
    }
    fetch("http://localhost:8080/api/templates")
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setTemplates(data); });
  }, []);

  const fetchTasks = () => {
    if (!user || !selectedTemplate) return;
    fetch(`http://localhost:8080/api/tasks?assigneeId=${user.id}&templateId=${selectedTemplate}`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setTasks(data); else setTasks([]); });
  };

  useEffect(() => { fetchTasks(); }, [user, selectedTemplate]);

  // 🔥 TACTICAL MOVE LOGIC 🔥
  const handleMove = async (task: any, direction: 'NEXT' | 'PREV') => {
      let newStatus = "";

      if (direction === 'NEXT') {
          if (task.status === "A_FAIRE") newStatus = "EN_COURS"; // Start Timer
          else if (task.status === "EN_COURS") newStatus = "DONE"; // Stop Timer
      } else {
          if (task.status === "EN_COURS") newStatus = "A_FAIRE"; // Pause/Reset
          else if (task.status === "DONE") newStatus = "EN_COURS"; // Reopen
      }

      if (!newStatus) return;

      // Optimistic UI
      const now = new Date().toISOString();
      setTasks(prev => prev.map(t => {
          if (t.id === task.id) {
              return { 
                  ...t, 
                  status: newStatus,
                  lastStartedAt: newStatus === "EN_COURS" ? now : (newStatus === "A_FAIRE" ? null : t.lastStartedAt)
              };
          }
          return t;
      }));

      // API Call
      try {
          await fetch(`http://localhost:8080/api/tasks/${task.id}/status`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus })
          });
          
          if(newStatus === "EN_COURS") toast({message: "UNIT ACTIVE // TIMER STARTED", type: "info"});
          if(newStatus === "DONE") toast({message: "UNIT SECURED // ARCHIVING", type: "success"});
      } catch(e) {
          console.error(e);
          toast({message: "TRANSFER FAILED", type: "error"});
          fetchTasks();
      }
  };

  // Grouping
  const pendingTasks = tasks.filter(t => t.status === "A_FAIRE");
  const activeTasks = tasks.filter(t => t.status === "EN_COURS");
  const doneTasks = tasks.filter(t => ["DONE", "VALIDE", "REJETE"].includes(t.status));

  const missionOptions = templates.map(t => ({ value: t.id.toString(), label: `OP: ${t.name.toUpperCase()}` }));

  return (
    <div className={styles.container}>
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:-1, opacity: 0.5, pointerEvents:'none'}}>
            <InteractiveBackground />
        </div>

        {/* HEADER */}
        <div className={styles.headerControl}>
            <div className={styles.titleBlock}>
                <h1>TACTICAL BOARD</h1>
                <p>// WORKFLOW VISUALIZATION & CONTROL</p>
            </div>
            <div style={{width: 300}}>
                <LuxSelect 
                    label="" 
                    options={missionOptions} 
                    value={selectedTemplate} 
                    onChange={setSelectedTemplate} 
                    placeholder="[ SELECT OPERATION ]"
                />
            </div>
        </div>

        {!selectedTemplate ? (
            <SystemIdle />
        ) : (
            <div className={styles.kanbanGrid}>
                
                {/* 1. PENDING COLUMN */}
                <div className={`${styles.column} ${styles.colPending}`} style={{animationDelay: "0.1s"}}>
                    <div className={styles.colHeader}>
                        <div className={styles.colTitle}><Clock size={16}/> PENDING</div>
                        <span className={styles.countBadge}>{pendingTasks.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {pendingTasks.map(task => (
                            <TacticalCard key={task.id} task={task} status="PENDING" onMove={handleMove} />
                        ))}
                        {pendingTasks.length === 0 && <div className={styles.emptySlot}>[ NO PENDING UNITS ]</div>}
                    </div>
                </div>

                {/* 2. ACTIVE COLUMN */}
                <div className={`${styles.column} ${styles.colActive}`} style={{animationDelay: "0.2s"}}>
                    <div className={styles.colHeader}>
                        <div className={styles.colTitle}><Zap size={16}/> ACTIVE PROCESSING</div>
                        <span className={styles.countBadge}>{activeTasks.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {activeTasks.map(task => (
                            <TacticalCard key={task.id} task={task} status="ACTIVE" onMove={handleMove} />
                        ))}
                        {activeTasks.length === 0 && <div className={styles.emptySlot} style={{borderColor:'#00f2ea30'}}>[ AWAITING INPUT ]</div>}
                    </div>
                </div>

                {/* 3. SECURED COLUMN */}
                <div className={`${styles.column} ${styles.colDone}`} style={{animationDelay: "0.3s"}}>
                    <div className={styles.colHeader}>
                        <div className={styles.colTitle}><Shield size={16}/> SECURED / DONE</div>
                        <span className={styles.countBadge}>{doneTasks.length}</span>
                    </div>
                    <div className={styles.cardList}>
                        {doneTasks.map(task => (
                            <TacticalCard key={task.id} task={task} status="DONE" onMove={handleMove} />
                        ))}
                        {doneTasks.length === 0 && <div className={styles.emptySlot} style={{borderColor:'#39ff1430'}}>[ VAULT EMPTY ]</div>}
                    </div>
                </div>

            </div>
        )}
    </div>
  );
}

// 🔥 COMPOSANT CARTE TACTIQUE 🔥
function TacticalCard({ task, status, onMove }: { task: any, status: 'PENDING'|'ACTIVE'|'DONE', onMove: Function }) {
    // Extract key info (juste 2-3 premiers champs pour l'aperçu)
    const metaKeys = task.dynamicData ? Object.keys(task.dynamicData).slice(0, 3) : [];

    const styleClass = status === 'PENDING' ? styles.cardPending : status === 'ACTIVE' ? styles.cardActive : styles.cardDone;

    return (
        <div className={`${styles.card} ${styleClass}`}>
            <div className={styles.cardHeader}>
                <span className={styles.cardRef}>{task.epsReference}</span>
                <span className={styles.cardId}>ID: {task.id}</span>
            </div>

            <div className={styles.cardMeta}>
                {metaKeys.map(key => (
                    <div key={key} className={styles.metaRow}>
                        <span>{key.toUpperCase()}</span>
                        <span className={styles.metaVal}>{task.dynamicData[key] || "-"}</span>
                    </div>
                ))}
                {metaKeys.length === 0 && <div className={styles.metaRow}><span>DATA</span><span className={styles.metaVal}>WAITING...</span></div>}
            </div>

            <div className={styles.cardActions}>
                {/* TIMER ZONE */}
                <div className={styles.timerDisplay}>
                    {status === 'ACTIVE' ? (
                        <div className={styles.activeTimer}>
                            <Zap size={10} fill="#00f2ea"/> 
                            <LiveTimer startTime={task.lastStartedAt} cumulativeSeconds={task.cumulativeTimeSeconds || 0} />
                        </div>
                    ) : (
                        <div style={{display:'flex', alignItems:'center', gap:5}}>
                            <Clock size={12}/> {formatTime(task.cumulativeTimeSeconds || 0)}
                        </div>
                    )}
                </div>

                {/* CONTROL BUTTONS */}
                <div style={{display:'flex', gap:8}}>
                    {status !== 'PENDING' && (
                        <button className={`${styles.moveBtn} ${styles.movePrev}`} onClick={() => onMove(task, 'PREV')} title="Move Back">
                            <ArrowLeft size={14}/>
                        </button>
                    )}
                    
                    {status !== 'DONE' && (
                        <button 
                            className={`${styles.moveBtn} ${status === 'ACTIVE' ? styles.moveFinish : styles.moveNext}`} 
                            onClick={() => onMove(task, 'NEXT')} 
                            title={status === 'ACTIVE' ? "Secure (Finish)" : "Activate"}
                        >
                            {status === 'ACTIVE' ? <CheckCircle size={14}/> : <ArrowRight size={14}/>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatTime(sec: number) {
    if(!sec) return "00:00";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}