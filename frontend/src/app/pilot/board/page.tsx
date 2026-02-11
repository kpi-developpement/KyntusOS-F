"use client";

import { useEffect, useState, useMemo } from "react";
import { Activity, Terminal, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import SmartTaskGrid from "@/components/features/SmartTaskGrid";
import SystemIdle from "@/components/ui/SystemIdle";
import LuxSelect from "@/components/ui/LuxSelect";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import styles from "./PilotBoard.module.css";
import { toast } from "@/components/ui/Toaster";

export default function PilotBoard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Initialisation User & Templates
  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) setUser(JSON.parse(stored));

    fetch("http://localhost:8080/api/templates")
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setTemplates(data); })
        .catch(err => console.error(err));
  }, []);

  // Fetch Tasks (Refresh Logic)
  const refreshTasks = () => {
    if (!user || !selectedTemplate) return;
    setLoading(true);
    fetch(`http://localhost:8080/api/tasks?assigneeId=${user.id}&templateId=${selectedTemplate}`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setTasks(data); else setTasks([]); })
        .catch(e => console.error(e))
        .finally(() => setLoading(false));
  };

  useEffect(() => { refreshTasks(); }, [user, selectedTemplate]);

  // ✅ LOGIC JDIDA: N-determiniw ina champs li EDITABLE
  // Hna kanjibo ghir les noms dyal les champs li kaynin f Template definition
  const allowedFields = useMemo(() => {
      if (!selectedTemplate) return [];
      const currentTmpl = templates.find(t => t.id.toString() === selectedTemplate);
      // Ila template 3ndha fields, kan-returniw smiyathum, sinon walo
      return currentTmpl?.fields ? currentTmpl.fields.map((f: any) => f.name) : [];
  }, [selectedTemplate, templates]);

  // Update Data (Dynamic Fields)
  const handleUpdateData = async (taskId: number, key: string, value: any) => {
    // Extra Security: On vérifie aussi ici avant d'envoyer
    if (!allowedFields.includes(key)) {
        toast({message: "CHAMP VEROUILLÉ (IMPORT EXCEL) 🔒", type: "error"});
        return;
    }

    // Optimistic UI pour la fluidité de la saisie
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dynamicData: { ...t.dynamicData, [key]: value } } : t));
    try {
        await fetch(`http://localhost:8080/api/tasks/${taskId}/data`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value })
        });
    } catch (err) { console.error(err); }
  };

  // ⏱️ CHRONO LOGIC ⏱️
  const handleStatusToggle = async (taskId: number, currentStatus: string) => {
      let newStatus = "";
      if (currentStatus === "A_FAIRE") newStatus = "EN_COURS";
      else if (currentStatus === "EN_COURS") newStatus = "DONE";
      else return; 

      setTasks(prev => prev.map(t => {
          if (t.id === taskId) return { ...t, status: newStatus }; 
          return t;
      }));

      try {
          const res = await fetch(`http://localhost:8080/api/tasks/${taskId}/status`, {
              method: "PATCH", 
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus })
          });

          if (res.ok) {
              const updatedTask = await res.json();
              setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));

              if(newStatus === "EN_COURS") {
                  toast({message: "CHRONO STARTED ⏱️", type: "info"});
              }
              if(newStatus === "DONE") {
                  const timeSpent = Math.round((updatedTask.cumulativeTimeSeconds || 0) / 60);
                  toast({message: `MISSION COMPLETE (${timeSpent} min) ✅`, type: "success"});
              }
          } else {
              throw new Error("Server Response Not OK");
          }

      } catch(e) {
          console.error("Sync Error:", e);
          toast({message: "ERREUR SYNCHRO - REVERTING", type: "error"});
          refreshTasks(); 
      }
  };

  const activeTasks = tasks.filter(t => t.status !== "VALIDE" && t.status !== "REJETE" && t.status !== "DONE");
  
  // 🔥 AUTO-EJECT LOGIC 🔥
  useEffect(() => {
      if (selectedTemplate && tasks.length > 0 && activeTasks.length === 0) {
          const timer = setTimeout(() => {
              toast({message: "SECTEUR SÉCURISÉ - ARCHIVAGE... 📁", type: "success"});
              setTemplates(prev => prev.filter(t => t.id.toString() !== selectedTemplate));
              setSelectedTemplate("");
              setTasks([]); 
          }, 1500);
          return () => clearTimeout(timer);
      }
  }, [activeTasks.length, selectedTemplate, tasks.length]);

  const missionOptions = templates.map(t => ({ value: t.id.toString(), label: `MISSION: ${t.name.toUpperCase()}` }));

  return (
    <div className={styles.container}>
        <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', zIndex:-1, pointerEvents:'none', opacity: 0.6}}>
            <InteractiveBackground />
        </div>

        <header className={styles.headerHud}>
            <div className={styles.pilotInfo}>
                <div className={styles.pilotName}><div className={styles.statusDot}></div>UNIT: {user?.username}</div>
                <span className={styles.roleBadge}>// AUTHORIZED_ACCESS_LEVEL_3</span>
            </div>
            <div className={styles.selectorZone}>
                <ArrowRight size={16} className={styles.arrowIcon} />
                <div style={{width: 300}}>
                    <LuxSelect 
                        label="" 
                        options={missionOptions} 
                        value={selectedTemplate} 
                        onChange={setSelectedTemplate} 
                        placeholder="[ LOAD CARTRIDGE ]" 
                    />
                </div>
            </div>
        </header>

        {!selectedTemplate ? (
            <div className={styles.emptyStateWrapper}><SystemIdle /></div>
        ) : loading ? (
            <div className={styles.emptyStateWrapper}>
                <div style={{textAlign:"center", color:"#00f2ea", fontFamily:"monospace"}}>
                    <Activity className="spin" size={40} style={{marginBottom:20}}/>
                    <div style={{letterSpacing:3}}>INITIALIZING PROTOCOLS...</div>
                </div>
            </div>
        ) : (
            <div style={{flex: 1, display:"flex", flexDirection:"column", animation:"fadeIn 0.5s"}}>
                <div className={styles.dataHeader}>
                    <div className={styles.matrixTitle}><Terminal size={20} color="#00f2ea"/> MATRIX VIEW</div>
                    <div className={styles.countBadge}>{tasks.length} ENTRIES</div>
                </div>
                {/* ✅ HNA FIN KAN-PASSIW L-LISTE DYAL CHAMPS EDITABLES */}
                <SmartTaskGrid 
                    tasks={tasks} 
                    allowedFields={allowedFields} 
                    onUpdateData={handleUpdateData} 
                    onToggleStatus={handleStatusToggle} 
                />
            </div>
        )}
    </div>
  );
}