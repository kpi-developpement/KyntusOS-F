"use client";

import { useEffect, useState } from "react";
import { Search, Radio } from "lucide-react";
import styles from "./PilotHistory.module.css";
import LuxSelect from "@/components/ui/LuxSelect";
// IMPORT DES NOUVEAUX COMPOSANTS (Chemin Correct)
import InteractiveBackground from "./components/ui/InteractiveBackground";
import CyberStats from "./components/CyberStats";
import HoloList from "./components/HoloList";
import DetailModal from "./components/DetailModal";

export default function PilotHistory() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("ALL");
  const [user, setUser] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats Dynamiques
  const [stats, setStats] = useState({
      total: 0,
      successRate: 100,
      pilotIntegrity: 100
  });

  useEffect(() => {
    // 1. Load User & Calculate Stats
    const stored = localStorage.getItem("kyntus_user");
    if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        
        // Calcul Integrity Dynamique (100 - ErrorCount * 5)
        const integrity = Math.max(0, 100 - ((u.errorCount || 0) * 5));
        setStats(prev => ({...prev, pilotIntegrity: integrity}));
        fetchTasks(u.id);
    }
    
    // 2. Load Templates
    fetch("http://kyntusos.kyntus.fr:8082/api/templates")
        .then(res => res.json())
        .then(data => { if(Array.isArray(data)) setTemplates(data); });
  }, []);

  const fetchTasks = (userId: number) => {
      setLoading(true);
      fetch(`http://kyntusos.kyntus.fr:8082/api/tasks?assigneeId=${userId}`)
        .then(res => res.json())
        .then(data => {
            if(Array.isArray(data)) {
                // Filter Finished
                const finished = data.filter(t => ["VALIDE", "REJETE", "DONE"].includes(t.status));
                const reversed = finished.reverse();
                setTasks(reversed);

                // Calcul Success Rate Dynamique
                const valid = finished.filter(t => t.status === "VALIDE").length;
                const total = finished.length;
                const rate = total > 0 ? Math.round((valid / total) * 100) : 100;

                setStats(prev => ({...prev, total, successRate: rate}));
            }
        })
        .finally(() => setLoading(false));
  };

  const filteredTasks = selectedTemplate === "ALL" 
      ? tasks 
      : tasks.filter(t => t.template?.id.toString() === selectedTemplate);

  const filterOptions = [
      { value: "ALL", label: "TOUS LES SYSTÈMES" },
      ...templates.map(t => ({ value: t.id.toString(), label: t.name.toUpperCase() }))
  ];

  return (
    <div className={styles.container}>
        {/* 🔥 INTERACTIVE BACKGROUND (Dakhil history/components/ui) 🔥 */}
        <InteractiveBackground />

        {/* HEADER */}
        <header className={styles.header}>
            <div className={styles.titleWrapper}>
                <h1 className={styles.glitchTitle} data-text="NEURAL_LOGS">NEURAL_LOGS</h1>
                <div className={styles.subTitle}>
                    <Radio size={14} className={styles.pulseIcon} /> 
                    <span>PILOT: {user?.username?.toUpperCase() || "UNKNOWN"} // ID: {user?.id || "000"}</span>
                </div>
            </div>
            
            <div className={styles.controlPanel}>
                <div className={styles.searchBar}>
                   <Search className={styles.searchIcon} size={18} />
                   {/* Wrapper pour Z-Index Dropdown */}
                   <div style={{width: 280, position: 'relative', zIndex: 9999}}>
                        <LuxSelect 
                            label="" 
                            options={filterOptions} 
                            value={selectedTemplate} 
                            onChange={setSelectedTemplate} 
                        />
                   </div>
                </div>
            </div>
        </header>

        {/* 3D KPI CARDS (Rank Removed) */}
        <CyberStats stats={stats} />

        {/* LIST (Real Date) */}
        <HoloList 
            tasks={filteredTasks} 
            loading={loading} 
            onSelect={setSelectedTask} 
        />

        {/* MODAL */}
        {selectedTask && (
            <DetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
        )}
    </div>
  );
}