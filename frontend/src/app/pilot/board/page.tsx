"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Activity, LayoutPanelLeft, ListChecks } from "lucide-react"; 
import SmartTaskGrid from "@/components/features/SmartTaskGrid";
import SystemIdle from "@/components/ui/SystemIdle";
import { toast } from "@/components/ui/Toaster";

import BoardHeader from "./components/BoardHeader";
import BoardActions from "./components/BoardActions";
import styles from "./PilotBoard.module.css";

// 🔥 THE INTERACTIVE MATRIX BACKGROUND (60% Blue, 30% White, 10% Green)
const CyberMatrixBackground = dynamic(() => import("./ux/CyberMatrixBackground"), { ssr: false });

// 🔗 API CONFIGURATION (Spring Boot @ 8082)
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8082/api";

export default function PilotBoard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);

  // ========================================================================
  // 1. INITIAL LOAD: User Discovery & Strict Mission Fetching
  // ========================================================================
  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");

    if (stored) {
      const currentUser = JSON.parse(stored);
      setUser(currentUser);
      
      // 🔒 STRICT MODE: Fetching only missions assigned to this Pilot ID
      if (currentUser && currentUser.id) {
        fetch(`${API_URL}/templates?userId=${currentUser.id}`)
            .then(res => res.json())
            .then(data => { 
                console.log("📦 [MATRIX] User Templates Received:", data);
                setTemplates(Array.isArray(data) ? data : []); 
            })
            .catch(err => {
                console.error("❌ [MATRIX] Connection Error:", err);
                toast({ message: "ERREUR SYNCHRONISATION SERVEUR", type: "error" });
            });
      }
    }
  }, []);

  // ========================================================================
  // 2. DATA ENGINE: Refreshing Tasks for the Selected Mission
  // ========================================================================
  const refreshTasks = () => {
    if (!user || !selectedTemplate) return;
    setLoading(true);
    setSelectedTasks([]); 
    
    fetch(`${API_URL}/tasks?assigneeId=${user.id}&templateId=${selectedTemplate}`)
        .then(res => res.json())
        .then(data => { 
            if (Array.isArray(data)) setTasks(data); 
            else setTasks([]); 
        })
        .catch(e => console.error("❌ [MATRIX] Fetch Tasks Error:", e))
        .finally(() => setLoading(false));
  };

  useEffect(() => { refreshTasks(); }, [user, selectedTemplate]);

  // ========================================================================
  // 3. INTELLIGENCE: Dynamic Column & Permissions Mapping
  // ========================================================================
  const allDynamicCols = useMemo(() => {
    const cols = new Set<string>();
    tasks.forEach(t => {
      if (t.dynamicData) Object.keys(t.dynamicData).forEach(k => cols.add(k));
    });
    return Array.from(cols);
  }, [tasks]);

  const allowedFields = useMemo(() => {
      if (!selectedTemplate) return [];
      const currentTmpl = templates.find(t => t.id?.toString() === selectedTemplate);
      return currentTmpl?.fields ? currentTmpl.fields.map((f: any) => f.name) : [];
  }, [selectedTemplate, templates]);

  // ========================================================================
  // 4. MISSION HANDLERS (PATCH OPERATIONS)
  // ========================================================================
  const handleUpdateData = async (taskId: number, key: string, value: any) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dynamicData: { ...t.dynamicData, [key]: value } } : t));
    try {
        await fetch(`${API_URL}/tasks/${taskId}/data`, {
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
          const res = await fetch(`${API_URL}/tasks/${taskId}/status`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
              if(newStatus === "DONE") toast({message: `MISSION COMPLETE ✅`, type: "success"});
          } else { throw new Error("Server Error"); }
      } catch(e) { refreshTasks(); }
  };

  const handleBulkEdit = async (columnKey: string, value: string) => {
    if (selectedTasks.length === 0) return toast({ message: "SÉLECTIONNEZ DES LIGNES D'ABORD", type: "error" });
    setTasks(prev => prev.map(t => selectedTasks.includes(t.id) ? { ...t, dynamicData: { ...t.dynamicData, [columnKey]: value } } : t));
    try {
      await Promise.all(selectedTasks.map(id => 
        fetch(`${API_URL}/tasks/${id}/data`, {
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
        fetch(`${API_URL}/tasks/${id}/status`, {
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
      const res = await fetch(`${API_URL}/pilot-records/deduplicate`, { method: "DELETE" });
      if (res.ok) { toast({ message: "DOUBLONS PURGÉS 🧹", type: "success" }); refreshTasks(); }
    } catch (e) { toast({ message: "ERREUR LORS DE LA PURGE", type: "error" }); }
  };

  const handleCopyEPSList = () => {
    const listToCopy = selectedTasks.length > 0 ? tasks.filter(t => selectedTasks.includes(t.id)) : tasks;
    const epsList = listToCopy.map(t => t.epsReference).filter(Boolean).join('\n');
    if (epsList) { 
        navigator.clipboard.writeText(epsList); 
        toast({ message: `${listToCopy.length} EPS COPIÉS 📋`, type: "success" }); 
    }
  };

  // UI Mapping for the Dropdown
  const missionOptions = templates.map((tpl: any) => ({
      value: tpl.id?.toString() || "",
      label: `MISSION: ${(tpl.name || "UNKNOWN").toUpperCase()}`
  }));

  return (
    <div className={styles.boardContainer}>
      <CyberMatrixBackground />

      <div className={styles.glassOverlay}>
        
        {/* 1. TOP HEADER (BENTO STYLE) */}
        <div className={styles.headerBento}>
            <BoardHeader 
                user={user || { username: "PILOT_SYSTEM" }}
                missionOptions={missionOptions} 
                selectedTemplate={selectedTemplate}
                setSelectedTemplate={setSelectedTemplate}
            />
        </div>

        <div className={styles.boardContent}>
          
          {/* 2. SUB-HEADER INFO & ACTIONS */}
          <div className={styles.statsBar}>
             <h2 className={styles.matrixTitle}>
               <LayoutPanelLeft size={20} /> MATRIX_VIEW // {selectedTemplate ? templates.find(t => t.id.toString() === selectedTemplate)?.name : "STANDBY"}
             </h2>
             <div className={styles.countBadge}>
               <ListChecks size={16} /> {tasks.length} ENTRIES_DETECTED
             </div>
          </div>

          <div className={`${styles.bentoCard} ${styles.actionsWrapper}`}>
              <BoardActions 
                  tasksCount={tasks.length}
                  selectedCount={selectedTasks.length}
                  allowedFields={allowedFields}
                  onCopyEPS={handleCopyEPSList}
                  onPurgeDoublons={handlePurgeDoublons}
                  onCoachSync={handleCoachSync}
                  onBulkEdit={handleBulkEdit}
              />
          </div>

          {/* 3. MAIN DATA GRID (TRANSFORMERS TABLE) */}
          <div className={`${styles.bentoCard} ${styles.gridWrapper}`}>
             {!selectedTemplate ? (
                 <SystemIdle message="SYSTEM_LOCKED // AWAITING_CARTRIDGE_INSERTION" />
             ) : loading ? (
                 <div className={styles.matrixLoader}>
                     <Activity className="spin" size={40} />
                     <span>SCANNING_NEURAL_LINKS...</span>
                 </div>
             ) : tasks.length > 0 ? (
                 <SmartTaskGrid 
                     tasks={tasks} 
                     allColumns={allDynamicCols} 
                     editableColumns={allowedFields} 
                     onUpdateData={handleUpdateData} 
                     onToggleStatus={handleStatusToggle} 
                     selectedTasks={selectedTasks}
                     setSelectedTasks={setSelectedTasks}
                 />
             ) : (
                 <SystemIdle message="MATRIX_EMPTY // NO_RECORDS_FOUND_FOR_THIS_PILOT" />
             )}
          </div>
          
        </div>
      </div>
    </div>
  );
}