"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  ShieldAlert, CheckCircle, XCircle, LayoutGrid, Zap, 
  Archive, ArrowRight, ArrowLeft, RotateCcw, RefreshCw, AlertTriangle, Clock, Activity
} from "lucide-react";
import styles from "./AdminKanban.module.css";
import LuxSelect from "@/components/ui/LuxSelect";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import { toast } from "@/components/ui/Toaster";
import LiveTimer from "@/components/ui/LiveTimer";

// --- TYPES (Pour la clarté) ---
type Task = any; 
type ModalConfig = { isOpen: boolean; title: string; message: string; type: "SUCCESS" | "DANGER"; onConfirm: () => void; } | null;

export default function AdminKanban() {
  // DATA STATES
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // FILTER STATES
  const [selectedPilot, setSelectedPilot] = useState<string>("ALL");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("ALL");

  // UI STATES
  const [modalConfig, setModalConfig] = useState<ModalConfig>(null);

  // --- 1. FETCH DATA (Optimized) ---
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
        const [resTasks, resPilots, resTemplates] = await Promise.all([
            fetch("http://localhost:8080/api/tasks"),
            fetch("http://localhost:8080/api/users/pilots"),
            fetch("http://localhost:8080/api/templates")
        ]);

        if (!resTasks.ok) throw new Error("Erreur Backend");

        const tData = await resTasks.json();
        setTasks(Array.isArray(tData) ? tData : []);

        if(resPilots.ok) setPilots(await resPilots.json());
        if(resTemplates.ok) setTemplates(await resTemplates.json());

    } catch (e) {
        console.error("❌ ERREUR:", e);
        setError("BACKEND OFF");
        toast({ message: "ÉCHEC CONNEXION", type: "error" });
    } finally {
        setLoading(false);
    }
  }, []); // Empty dependency array = created once

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- 2. ACTIONS (Memoized) ---
  const updateTaskStatus = useCallback(async (task: Task, newStatus: string) => {
    // Optimistic Update: On update UI dorka, 3ad nchoufo backend
    const now = new Date().toISOString();
    
    setTasks(prev => prev.map(t => {
        if(t.id === task.id) {
            return { 
                ...t, 
                status: newStatus,
                // Start timer localement si on active
                lastStartedAt: newStatus === "EN_COURS" ? now : t.lastStartedAt 
            };
        }
        return t;
    }));
    
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/status`, {
        method: "PATCH", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error();
      
      const msgMap: any = { "VALIDE": "VALIDÉE ✅", "REJETE": "REJETÉE ❌" };
      if(msgMap[newStatus]) toast({message: `TÂCHE ${msgMap[newStatus]}`, type: newStatus === "VALIDE" ? "success" : "error"});

    } catch (e) {
      // Rollback (Reload data si erreur)
      toast({message: "ERREUR SYNCHRO", type: "error"});
      fetchAllData();
    }
  }, [fetchAllData]);

  // --- 3. FILTERING LOGIC (Heavy Calculation Memoized) ---
  // Hada howa lmohim: Filter ghir mli tbdl tasks wla selections
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
        const matchPilot = selectedPilot === "ALL" || (t.assignee?.id && t.assignee.id.toString() === selectedPilot);
        const matchTemplate = selectedTemplate === "ALL" || (t.template?.id && t.template.id.toString() === selectedTemplate);
        return matchPilot && matchTemplate;
    });
  }, [tasks, selectedPilot, selectedTemplate]);

  // Split Columns (Memoized)
  const { pending, active, validation, history } = useMemo(() => {
      return {
          pending: filteredTasks.filter(t => t.status === "A_FAIRE"),
          active: filteredTasks.filter(t => t.status === "EN_COURS"),
          validation: filteredTasks.filter(t => t.status === "DONE"),
          history: filteredTasks.filter(t => ["VALIDE", "REJETE"].includes(t.status)).slice(0, 50) // Limit history
      };
  }, [filteredTasks]);

  // Select Options (Memoized)
  const pilotOpts = useMemo(() => [{value: "ALL", label: "TOUS LES PILOTES"}, ...pilots.map(p => ({value: p.id.toString(), label: p.username.toUpperCase()}))], [pilots]);
  const tmplOpts = useMemo(() => [{value: "ALL", label: "TOUTES MISSIONS"}, ...templates.map(t => ({value: t.id.toString(), label: t.name.toUpperCase()}))], [templates]);

  // --- 4. BULK ACTION ---
  const handleBulkAction = useCallback((action: "VALIDE" | "REJETE") => {
    if (validation.length === 0) return;
    setModalConfig({
        isOpen: true,
        title: action === "VALIDE" ? "VALIDATION MASSIVE" : "REFUS MASSIF",
        message: `${validation.length} tâches seront traitées. Confirmer ?`,
        type: action === "VALIDE" ? "SUCCESS" : "DANGER",
        onConfirm: async () => {
            // Parallel execution (Asra3 tari9a)
            await Promise.all(validation.map(t => updateTaskStatus(t, action)));
            setModalConfig(null);
        }
    });
  }, [validation, updateTaskStatus]);

  // --- RENDER ---
  return (
    <div className={styles.container}>
      <InteractiveBackground />

      {/* HEADER */}
      <div className={styles.headerControl}>
        <div className={styles.titleBlock}>
          <h1>OVERWATCH COMMAND</h1>
          <p>// GESTION GLOBALE & VALIDATION QC</p>
        </div>
        <div className={styles.filters}>
           <button onClick={fetchAllData} className={styles.miniBtn} title="Actualiser" style={{marginRight: 10, width: 40, height: 40}}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
           </button>
          <div style={{width: 200}}>
             <LuxSelect label="" options={pilotOpts} value={selectedPilot} onChange={setSelectedPilot} />
          </div>
          <div style={{width: 220}}>
             <LuxSelect label="" options={tmplOpts} value={selectedTemplate} onChange={setSelectedTemplate} />
          </div>
        </div>
      </div>

      {error && <div className={styles.errorBanner}><AlertTriangle size={16}/> {error}</div>}

      {/* KANBAN BOARD */}
      <div className={styles.kanbanGrid}>
        <KanbanColumn title="FILE D'ATTENTE" icon={LayoutGrid} count={pending.length} type="PENDING" tasks={pending} onUpdate={updateTaskStatus} color="gray" />
        <KanbanColumn title="EN COURS" icon={Zap} count={active.length} type="ACTIVE" tasks={active} onUpdate={updateTaskStatus} color="#00f2ea" />
        
        {/* Validation Column Special */}
        <div className={`${styles.column} ${styles.colValidation}`}>
            <div className={styles.colHeader}>
                <div className={styles.colTitle}><ShieldAlert size={14} color="#ffd700"/> À VALIDER</div>
                <span className={styles.countBadge}>{validation.length}</span>
            </div>
            {validation.length > 0 && (
                <div className={styles.bulkActions}>
                    <button className={`${styles.bulkBtn} ${styles.bulkValide}`} onClick={() => handleBulkAction("VALIDE")}><CheckCircle size={14}/> TOUT OK</button>
                    <button className={`${styles.bulkBtn} ${styles.bulkRefuse}`} onClick={() => handleBulkAction("REJETE")}><XCircle size={14}/> REFUS</button>
                </div>
            )}
            <div className={styles.cardList}>
                {validation.map(t => <MemoAdminCard key={t.id} task={t} onUpdate={updateTaskStatus} type="VALIDATION"/>)}
                {validation.length === 0 && <EmptyMsg msg="Rien à valider" />}
            </div>
        </div>

        <KanbanColumn title="ARCHIVES (24H)" icon={Archive} count={history.length} type="HISTORY" tasks={history} onUpdate={updateTaskStatus} color="#39ff14" />
      </div>

      {/* MODAL */}
      {modalConfig && (
        <div className={styles.modalOverlay}>
            <div className={styles.cyberModal} style={{"--modal-color": modalConfig.type === "SUCCESS" ? "#39ff14" : "#ff0055"} as any}>
                <div className={styles.modalTitle}>{modalConfig.title}</div>
                <p className={styles.modalText}>{modalConfig.message}</p>
                <div className={styles.modalActions}>
                    <button className={styles.btnCancel} onClick={() => setModalConfig(null)}>ANNULER</button>
                    <button className={styles.btnConfirm} onClick={modalConfig.onConfirm}>CONFIRMER</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS (MEMOIZED FOR PERFORMANCE) ---

// 1. Column Generic Component
const KanbanColumn = ({ title, icon: Icon, count, tasks, type, onUpdate, color }: any) => (
    <div className={`${styles.column} ${styles['col'+type]}`}>
        <div className={styles.colHeader}>
            <div className={styles.colTitle}><Icon size={14} color={color}/> {title}</div>
            <span className={styles.countBadge}>{count}</span>
        </div>
        <div className={styles.cardList}>
            {tasks.map((t: any) => <MemoAdminCard key={t.id} task={t} onUpdate={onUpdate} type={type}/>)}
            {tasks.length === 0 && <EmptyMsg msg="Aucune donnée" />}
        </div>
    </div>
);

// 2. Empty Message
const EmptyMsg = ({msg}: {msg: string}) => (
    <div style={{textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.2)", fontSize: "0.8rem", fontStyle: "italic"}}>{msg}</div>
);

// 3. Helper Time
const formatTime = (sec: number) => {
    if (!sec) return "0s";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
};

// 4. THE CARD (Wrapped in React.memo = Pure Component)
// Hada howa sirr lkhffa. Card ma kat-renderach ila ma tbadlatsh hiya b dat-ha
const AdminCard = ({ task, onUpdate, type }: { task: any, onUpdate: any, type: string }) => {
    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <span className={styles.cardRef}>{task.epsReference}</span>
                <div className={styles.pilotBadge}>
                    <div className={styles.pAvatar}>{task.assignee?.username?.substring(0,1).toUpperCase() || "?"}</div>
                    <span className={styles.pName}>{task.assignee?.username || "N/A"}</span>
                </div>
            </div>

            <div style={{fontSize:"0.6rem", color:"#666", marginBottom:8, display:"flex", justifyContent:"space-between"}}>
                <span>{task.template?.name}</span>
                {/* Affiche une data contextuelle si dispo */}
                {task.dynamicData && Object.values(task.dynamicData)[0] && 
                    <span style={{color:"#00f2ea"}}>{String(Object.values(task.dynamicData)[0])}</span>
                }
            </div>

            {/* LIVE TIMER OPTIMISÉ */}
            <div className={`${styles.timerZone} ${type === "ACTIVE" ? styles.timerActive : ''}`}>
                {type === "ACTIVE" ? (
                    <>
                        <Activity size={12} className="spin" /> 
                        <span style={{fontWeight:"bold"}}>LIVE : </span>
                        <LiveTimer startTime={task.lastStartedAt} cumulativeSeconds={task.cumulativeTimeSeconds || 0} />
                    </>
                ) : (
                    <>
                        <Clock size={12} />
                        <span>DURÉE : {formatTime(task.cumulativeTimeSeconds || 0)}</span>
                    </>
                )}
            </div>

            <div className={styles.cardActions}>
                {type === "PENDING" && (
                    <div className={styles.adminControls} style={{width:'100%', justifyContent:'flex-end'}}>
                        <button className={styles.miniBtn} onClick={() => onUpdate(task, "EN_COURS")} title="Start"><ArrowRight size={14}/></button>
                    </div>
                )}
                {type === "ACTIVE" && (
                     <div className={styles.adminControls} style={{width:"100%", justifyContent:"space-between", alignItems:"center"}}>
                         <span style={{color:"#00f2ea", fontSize:"0.6rem", opacity:0.7}}>MONITORING...</span>
                         <button className={styles.miniBtn} onClick={() => onUpdate(task, "A_FAIRE")} title="Reset"><RotateCcw size={14}/></button>
                     </div>
                )}
                {type === "VALIDATION" && (
                    <div className={styles.valBtns}>
                        <button className={`${styles.btnV} ${styles.btnKo}`} onClick={() => onUpdate(task, "REJETE")}><XCircle size={16}/></button>
                        <button className={`${styles.btnV} ${styles.btnOk}`} onClick={() => onUpdate(task, "VALIDE")}><CheckCircle size={16}/></button>
                    </div>
                )}
                {type === "HISTORY" && (
                    <div style={{display:'flex', width:'100%', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontSize:"0.6rem", fontWeight:"bold", color: task.status==="VALIDE" ? "#39ff14":"#ff0055"}}>{task.status}</span>
                        <button className={styles.miniBtn} onClick={() => onUpdate(task, "DONE")} title="Backtrack"><ArrowLeft size={14}/></button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders
const MemoAdminCard = React.memo(AdminCard, (prev, next) => {
    // Return true si ma khassnach n-rerenderiw (optimization)
    return (
        prev.task.id === next.task.id && 
        prev.task.status === next.task.status &&
        prev.task.cumulativeTimeSeconds === next.task.cumulativeTimeSeconds &&
        prev.task.lastStartedAt === next.task.lastStartedAt // Important pour le timer live
    );
});