"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Activity } from "lucide-react"; 
import SmartTaskGrid from "@/components/features/SmartTaskGrid";
import SystemIdle from "@/components/ui/SystemIdle";
import { toast } from "@/components/ui/Toaster";

import BoardHeader from "./components/BoardHeader";
import BoardActions from "./components/BoardActions";
import styles from "./PilotBoard.module.css";

const CyberGridBackground = dynamic(() => import("./ux/CyberGridBackground"), { ssr: false });

export default function PilotBoard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);

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
    setSelectedTasks([]); 
    fetch(`http://localhost:8080/api/tasks?assigneeId=${user.id}&templateId=${selectedTemplate}`)
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setTasks(data); else setTasks([]); })
        .catch(e => console.error(e))
        .finally(() => setLoading(false));
  };

  useEffect(() => { refreshTasks(); }, [user, selectedTemplate]);

  // 🌍 GA3 LES COLONNES (L-JSONB KAMEL)
  const allDynamicCols = useMemo(() => {
    const cols = new Set<string>();
    tasks.forEach(t => {
      if (t.dynamicData) Object.keys(t.dynamicData).forEach(k => cols.add(k));
    });
    return Array.from(cols);
  }, [tasks]);

  // 🔒 LES COLONNES AUTORISÉES (L-Template)
  const allowedFields = useMemo(() => {
      if (!selectedTemplate) return [];
      const currentTmpl = templates.find(t => t.id.toString() === selectedTemplate);
      return currentTmpl?.fields ? currentTmpl.fields.map((f: any) => f.name) : [];
  }, [selectedTemplate, templates]);

  const handleUpdateData = async (taskId: number, key: string, value: any) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dynamicData: { ...t.dynamicData, [key]: value } } : t));
    try {
        await fetch(`http://localhost:8080/api/tasks/${taskId}/data`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key, value })
        });
    } catch (err) { console.error(err); }
  };

  const handleStatusToggle = async (taskId: number, currentStatus: string) => {
      let newStatus = "";
      if (currentStatus === "A_FAIRE") newStatus = "EN_COURS";
      else if (currentStatus === "EN_COURS") newStatus = "DONE";
      else return; 
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      try {
          const res = await fetch(`http://localhost:8080/api/tasks/${taskId}/status`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
              const updatedTask = await res.json();
              setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
              if(newStatus === "DONE") toast({message: `MISSION COMPLETE ✅`, type: "success"});
          } else { throw new Error("Server Error"); }
      } catch(e) { refreshTasks(); }
  };

  const handleBulkEdit = async (columnKey: string, value: string) => {
    if (selectedTasks.length === 0) return toast({ message: "SÉLECTIONNEZ DES LIGNES D'ABORD", type: "error" });
    setTasks(prev => prev.map(t => selectedTasks.includes(t.id) ? { ...t, dynamicData: { ...t.dynamicData, [columnKey]: value } } : t));
    try {
      await Promise.all(selectedTasks.map(id => 
        fetch(`http://localhost:8080/api/tasks/${id}/data`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: columnKey, value })
        })
      ));
      toast({ message: `${selectedTasks.length} EPS MIS À JOUR ⚡`, type: "success" });
      setSelectedTasks([]); 
    } catch (e) { refreshTasks(); }
  };

  const handleCoachSync = async () => {
    if (selectedTasks.length === 0) return toast({ message: "SÉLECTIONNEZ DES TÂCHES", type: "error" });
    setTasks(prev => prev.map(t => selectedTasks.includes(t.id) ? { ...t, status: "DONE" } : t));
    try {
      await Promise.all(selectedTasks.map(id => 
        fetch(`http://localhost:8080/api/tasks/${id}/status`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "DONE" })
        })
      ));
      toast({ message: `COACH SYNC : ${selectedTasks.length} TÂCHES VALIDÉES ✅`, type: "success" });
      setSelectedTasks([]);
    } catch (e) { refreshTasks(); }
  };

  const handlePurgeDoublons = async () => {
    if (!window.confirm("Voulez-vous vraiment purger les doublons ?")) return;
    try {
      const res = await fetch("http://localhost:8080/api/pilot-records/deduplicate", { method: "DELETE" });
      if (res.ok) { toast({ message: "DOUBLONS PURGÉS 🧹", type: "success" }); refreshTasks(); }
    } catch (e) { toast({ message: "ERREUR LORS DE LA PURGE", type: "error" }); }
  };

  const handleCopyEPSList = () => {
    const listToCopy = selectedTasks.length > 0 ? tasks.filter(t => selectedTasks.includes(t.id)) : tasks;
    const epsList = listToCopy.map(t => t.epsReference).filter(Boolean).join('\n');
    if (epsList) { navigator.clipboard.writeText(epsList); toast({ message: `${listToCopy.length} EPS COPIÉS 📋`, type: "success" }); }
  };

  const missionOptions = templates.map(t => ({ value: t.id.toString(), label: `MISSION: ${t.name.toUpperCase()}` }));

  return (
    <div className={styles.container}>
        <CyberGridBackground />
        <BoardHeader user={user} missionOptions={missionOptions} selectedTemplate={selectedTemplate} setSelectedTemplate={setSelectedTemplate} />

        {!selectedTemplate ? (
            <div className={styles.emptyStateWrapper}><SystemIdle /></div>
        ) : loading ? (
            <div className={styles.emptyStateWrapper}>
                <div style={{textAlign:"center", color:"#00f2ea", fontFamily:"monospace"}}>
                    <Activity className="spin" size={40} style={{marginBottom:20}}/>
                    <div style={{letterSpacing:3}}>SCANNING MATRIX...</div>
                </div>
            </div>
        ) : (
            <div style={{flex: 1, display:"flex", flexDirection:"column", animation:"fadeIn 0.5s", overflow: "hidden", paddingBottom: "2rem"}}>
                
                {/* 🔴 HNA KAN-DWZO ghir ALLOWED FIELDS l-Bulk Edit bash y-editer ghir les colonnes template! */}
                <BoardActions 
                  tasksCount={tasks.length} 
                  selectedCount={selectedTasks.length}
                  allowedFields={allowedFields} 
                  onCopyEPS={handleCopyEPSList} 
                  onPurgeDoublons={handlePurgeDoublons}
                  onCoachSync={handleCoachSync}
                  onBulkEdit={handleBulkEdit}
                />

                {/* 🔴 HNA KAN-DWZO allColumns l-Affichage, w editableColumns (allowedFields) l-T3dil! */}
                <SmartTaskGrid 
                    tasks={tasks} 
                    allColumns={allDynamicCols} 
                    editableColumns={allowedFields} 
                    onUpdateData={handleUpdateData} 
                    onToggleStatus={handleStatusToggle} 
                    selectedTasks={selectedTasks}
                    setSelectedTasks={setSelectedTasks}
                />
            </div>
        )}
    </div>
  );
}