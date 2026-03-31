"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Activity } from "lucide-react"; 
import SystemIdle from "@/components/ui/SystemIdle";
import { toast } from "@/components/ui/Toaster";

import KanbanHeader from "./components/KanbanHeader";
import KanbanBoard from "./components/KanbanBoard";
import styles from "./PilotKanban.module.css";

// 🚀 DYNAMIC IMPORT DYAL THREE.JS BACKGROUND
const TacticalBackground = dynamic(() => import("./ux/TacticalBackground"), { ssr: false });

export default function PilotKanban() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) setUser(JSON.parse(stored));

    fetch("http://localhost:8080/api/templates")
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setTemplates(data); })
        .catch(err => console.error(err));
  }, []);

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

  // 🔄 THE MAGIC: Mlli t-klicki, kat-tbddel f' l-Front b-zzerba w kat-sifet l-Back
  const handleMoveTask = async (taskId: number, newStatus: string) => {
    // Optimistic UI Update (Smuuuth Animation)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${taskId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Erreur Backend");
      toast({ message: `TÂCHE DÉPLACÉE VERS ${newStatus} 🎯`, type: "success" });
    } catch (e) {
      toast({ message: "ERREUR SYNCHRO - REVERTING", type: "error" });
      refreshTasks(); 
    }
  };

  const missionOptions = templates.map(t => ({ value: t.id.toString(), label: `MISSION: ${t.name.toUpperCase()}` }));

  return (
    <div className={styles.container}>
        <TacticalBackground />
        
        <KanbanHeader 
          user={user} 
          missionOptions={missionOptions} 
          selectedTemplate={selectedTemplate} 
          setSelectedTemplate={setSelectedTemplate}
          tasksCount={tasks.length} 
        />

        {!selectedTemplate ? (
            <div className={styles.emptyStateWrapper}><SystemIdle /></div>
        ) : loading ? (
            <div className={styles.emptyStateWrapper}>
                <div style={{textAlign:"center", color:"#39ff14", fontFamily:"monospace"}}>
                    <Activity className="spin" size={40} style={{marginBottom:20}}/>
                    <div style={{letterSpacing:3}}>SCANNING SECTORS...</div>
                </div>
            </div>
        ) : (
            <div style={{flex: 1, display:"flex", flexDirection:"column", animation:"fadeIn 0.5s", overflow: "hidden"}}>
                <KanbanBoard tasks={tasks} onMoveTask={handleMoveTask} />
            </div>
        )}
    </div>
  );
}