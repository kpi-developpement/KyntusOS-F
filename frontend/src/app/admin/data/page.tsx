"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, TableProperties } from "lucide-react";
import { KxHeader } from "@/components/kx";
import styles from "./DataGrid.module.css";
import LuxSelect from "@/components/ui/LuxSelect";
import { toast } from "@/components/ui/Toaster";

export default function OmniGrid() {
  // --- STATE ---
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- FILTERS ---
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [pilotFilter, setPilotFilter] = useState<string>("ALL");

  // 1. Initial Load (Templates & Pilots)
  useEffect(() => {
    Promise.all([
        fetch("/api/templates").then(r => r.json()),
        fetch("/api/users/pilots").then(r => r.json())
    ]).then(([tmplData, pilotData]) => {
        setTemplates(tmplData || []);
        setPilots(pilotData || []);
    }).catch(e => console.error("Init Error", e));
  }, []);

  // 2. Fetch Tasks when Template changes
  const fetchTasks = async () => {
    if(!selectedTemplate) return;
    setLoading(true);
    try {
        const res = await fetch(`/api/tasks?templateId=${selectedTemplate}`);
        if(res.ok) {
            const data = await res.json();
            setTasks(Array.isArray(data) ? data : []);
            toast({message: "DONNÉES ACTUALISÉES", type: "info"});
        }
    } catch(e) {
        toast({message: "ERREUR CHARGEMENT DONNÉES", type: "error"});
    } finally {
        setLoading(false);
    }
  };

  // Auto-fetch quand on change de template
  useEffect(() => { 
      if(selectedTemplate) fetchTasks(); 
      else setTasks([]); 
  }, [selectedTemplate]);

  // 3. Filtering Logic (Client Side)
  const filteredData = useMemo(() => {
      return tasks.filter(task => {
          if(statusFilter !== "ALL" && task.status !== statusFilter) return false;
          if(pilotFilter !== "ALL" && task.assignee?.id.toString() !== pilotFilter) return false;
          return true;
      });
  }, [tasks, statusFilter, pilotFilter]);

  // 4. Extract Dynamic Columns (HYBRID MODE: TEMPLATE + DATA)
  const dynamicCols = useMemo(() => {
      const allCols = new Set<string>();

      // A. Ajouter d'abord les colonnes définies dans le Template (Priorité visuelle)
      const currentTmpl = templates.find(t => t.id.toString() === selectedTemplate);
      if (currentTmpl?.fields) {
          currentTmpl.fields.forEach((f: any) => allCols.add(f.name));
      }

      // B. Ajouter ensuite TOUTES les colonnes trouvées dans les données importées (Excel)
      // On scanne les 20 premières tâches pour être sûr de capter les clés, ou toutes si nécessaire
      tasks.forEach(task => {
          if (task.dynamicData) {
              Object.keys(task.dynamicData).forEach(key => allCols.add(key));
          }
      });

      return Array.from(allCols);
  }, [tasks, templates, selectedTemplate]);

  // --- OPTIONS POUR SELECTS ---
  const tmplOpts = templates.map(t => ({value: t.id.toString(), label: t.name.toUpperCase()}));
  
  const statusOpts = [
      {value: "ALL", label: "TOUS LES STATUTS"},
      {value: "A_FAIRE", label: "💤 EN ATTENTE"},
      {value: "EN_COURS", label: "⚡ EN COURS"},
      {value: "DONE", label: "⏳ À VALIDER"},
      {value: "VALIDE", label: "✅ VALIDÉ"},
      {value: "REJETE", label: "❌ REJETÉ"},
  ];

  const pilotOpts = [
      {value: "ALL", label: "TOUS LES PILOTES"},
      ...pilots.map(p => ({value: p.id.toString(), label: p.username.toUpperCase()}))
  ];

  return (
    <main className={`kx-page ${styles.container}`} style={{ maxWidth: 1640 }}>
      <KxHeader
        icon={TableProperties}
        eyebrow="Contrôle"
        title={<>Omni-<em>grid</em></>}
        subtitle="Toutes les tâches d'un projet, avec leurs colonnes Excel, filtrables par statut et par pilote."
      />

      {/* --- CONTROL BAR --- */}
      <div className={styles.controlBar}>
          <div style={{minWidth: 300}}>
              <LuxSelect 
                label="Projet" 
                options={tmplOpts} 
                value={selectedTemplate} 
                onChange={setSelectedTemplate} 
                placeholder="Choisir un projet"
              />
          </div>

          <div className={styles.filterGroup}>
              <div style={{width: 220}}>
                  <LuxSelect 
                    label="Statut" 
                    options={statusOpts} 
                    value={statusFilter} 
                    onChange={setStatusFilter} 
                  />
              </div>
              <div style={{width: 220}}>
                  <LuxSelect 
                    label="Pilote" 
                    options={pilotOpts} 
                    value={pilotFilter} 
                    onChange={setPilotFilter} 
                  />
              </div>
          </div>

          <button className={styles.refreshBtn} onClick={fetchTasks} disabled={!selectedTemplate} title="Actualiser" aria-label="Actualiser">
              <RefreshCw size={18} className={loading ? "kx-spin" : ""}/>
          </button>
      </div>

      {/* --- DATA GRID --- */}
      <div className={styles.gridWrapper}>
          <div className={styles.tableScroll}>
              <table className={styles.table}>
                  <thead>
                      <tr>
                          <th style={{width: 150}}>Référence EPS</th>
                          <th style={{width: 140}}>Statut</th>
                          <th style={{width: 200}}>Pilote</th>
                          {/* Colonnes Dynamiques (Template + Excel) */}
                          {dynamicCols.map(col => (
                              <th key={col} style={{whiteSpace: 'nowrap'}}>{col}</th>
                          ))}
                          <th style={{width: 120, textAlign: "right"}}>Temps</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredData.length === 0 ? (
                          <tr>
                              <td colSpan={4 + dynamicCols.length} className={styles.emptyState}>
                                  {selectedTemplate ? "Aucune tâche ne correspond à ces filtres." : "Choisissez un projet pour afficher ses tâches."}
                              </td>
                          </tr>
                      ) : (
                          filteredData.map(task => (
                              <tr key={task.id}>
                                  <td className={styles.colEps}>{task.epsReference}</td>
                                  
                                  <td><StatusBadge status={task.status}/></td>
                                  
                                  <td>
                                      <div className={styles.colPilot}>
                                          <div className={styles.pilotAvatar}>
                                              {task.assignee?.username.substring(0,1).toUpperCase() || "?"}
                                          </div>
                                          {task.assignee?.username || "Non assigné"}
                                      </div>
                                  </td>
                                  
                                  {/* Dynamic Data Cells */}
                                  {dynamicCols.map(col => (
                                      <td key={col} title={task.dynamicData?.[col]}>
                                          {task.dynamicData?.[col] ? String(task.dynamicData[col]) : "-"}
                                      </td>
                                  ))}

                                  <td className={styles.colTime}>
                                      {formatDuration(task.cumulativeTimeSeconds)}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
          
          {/* Footer Info */}
          <div className={styles.footerGrid}>
              <span><strong>{filteredData.length.toLocaleString("fr-FR")}</strong> tâche(s)</span>
          </div>
      </div>
    </main>
  );
}

// --- SUB COMPONENTS ---

const StatusBadge = ({status}: {status: string}) => {
    let label = status;
    if(status === "A_FAIRE") label = "En attente";
    if(status === "EN_COURS") label = "En cours";
    if(status === "DONE") label = "À valider";
    if(status === "VALIDE") label = "Validée";
    if(status === "REJETE") label = "Rejetée";
    
    return (
        <span className={`${styles.badge} ${styles[`status_${status}`]}`}>
            <div className={styles.statusDot}></div>
            {label}
        </span>
    );
};

const formatDuration = (sec?: number) => {
    if (!sec) return "-";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
};