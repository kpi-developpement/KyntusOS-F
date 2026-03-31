"use client";

import { useState, useEffect } from "react";
import { 
  Search, ShieldAlert, FileText, User, XCircle, AlertTriangle, 
  RotateCcw, Clock, Database, Hash 
} from "lucide-react";
import styles from "./Check.module.css";
import LuxSelect from "@/components/ui/LuxSelect";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import { toast } from "@/components/ui/Toaster";

export default function InspectorPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [epsInput, setEpsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<any>(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/templates")
      .then(res => res.json())
      .then(data => setTemplates(data || []))
      .catch(() => toast({ message: "Erreur chargement templates", type: "error" }));
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if(!selectedTemplate) return toast({message: "Veuillez sélectionner un Template", type: "error"});
    if(!epsInput.trim()) return toast({message: "Veuillez entrer un EPS", type: "error"});

    setLoading(true);
    setTask(null);

    try {
        const res = await fetch(`http://localhost:8080/api/admin/search?eps=${epsInput}`);
        if (res.ok) {
            const foundTask = await res.json();
            if(foundTask.template?.id.toString() !== selectedTemplate) {
                toast({ message: `EPS appartient au projet "${foundTask.template?.name}"`, type: "error" });
                setLoading(false);
                return;
            }
            setTask(foundTask);
            toast({message: "DOSSIER CHARGÉ AVEC SUCCÈS", type: "success"});
        } else {
            toast({message: "EPS INTROUVABLE", type: "error"});
        }
    } catch (error) {
        toast({message: "Erreur de connexion", type: "error"});
    } finally {
        setLoading(false);
    }
  };

  const handleReset = () => {
      setTask(null);
      setEpsInput("");
      // On garde le template selectionné pour enchainer rapidement
  };

  const handleForceReject = async () => {
      if(!task || !confirm("⚠️ CONFIRMER LE REJET FORCÉ ?")) return;
      try {
          const res = await fetch(`http://localhost:8080/api/tasks/${task.id}/status`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "REJETE" })
          });
          if(res.ok) {
              toast({message: "STATUS : REJETÉ", type: "success"});
              setTask({...task, status: "REJETE"});
          }
      } catch (e) { toast({message: "ERREUR", type: "error"}); }
  };

  // Helper Couleur
  const getStatusStyle = (status: string) => {
      switch(status) {
          case "VALIDE": return { color: "#39ff14", bg: "rgba(57, 255, 20, 0.1)", glow: "rgba(57, 255, 20, 0.4)" };
          case "REJETE": return { color: "#ff0055", bg: "rgba(255, 0, 85, 0.1)", glow: "rgba(255, 0, 85, 0.4)" };
          case "EN_COURS": return { color: "#00f2ea", bg: "rgba(0, 242, 234, 0.1)", glow: "rgba(0, 242, 234, 0.4)" };
          default: return { color: "#f5a623", bg: "rgba(245, 166, 35, 0.1)", glow: "rgba(245, 166, 35, 0.4)" };
      }
  };

  // Helper Temps (Seconds -> HH:MM:SS)
  const formatDuration = (seconds?: number) => {
      if (!seconds) return "00h 00m 00s";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return `${h}h ${m}m ${s}s`;
  };

  const statusStyle = task ? getStatusStyle(task.status) : {};
  const tmplOpts = templates.map(t => ({value: t.id.toString(), label: t.name.toUpperCase()}));

  return (
    <div className={styles.container}>
      <InteractiveBackground />

      <div className={styles.headerTitle}>
          <h1 className={styles.titleMain}>INSPECTOR PROTOCOL</h1>
          <span className={styles.subtitle}>// DEEP DIVE ANALYSIS</span>
      </div>

      {/* ZONE DE RECHERCHE (Cachée si résultat affiché pour focus, ou garde-la si tu veux) */}
      {!task && (
          <div className={styles.searchZone}>
              <div style={{width: 300}}>
                 <LuxSelect label="1. CIBLE" options={tmplOpts} value={selectedTemplate} onChange={setSelectedTemplate} placeholder="PROJET..." />
              </div>
              <form onSubmit={handleSearch} className={styles.inputWrapper} style={{display:'flex', gap:10, alignItems:'flex-end'}}>
                  <div style={{flex:1}}>
                      <label style={{display:'block', fontSize:'0.65rem', fontWeight:'bold', color:'#666', marginBottom:8}}>2. IDENTIFIANT (EPS)</label>
                      <input type="text" className={styles.searchInput} placeholder="Scan ID..." value={epsInput} onChange={(e) => setEpsInput(e.target.value)} />
                  </div>
                  <button type="submit" className={styles.searchBtn} disabled={loading} style={{height: 52}}>
                      {loading ? "SCAN..." : <Search size={20}/>}
                  </button>
              </form>
          </div>
      )}

      {/* BOUTON RESET (Si task affichée) */}
      {task && (
          <div className={styles.resetZone}>
              <button onClick={handleReset} className={styles.resetBtn}>
                  <RotateCcw size={14}/> NOUVELLE RECHERCHE
              </button>
          </div>
      )}

      {/* RESULTAT DEEP DIVE */}
      {task && (
          <div className={styles.resultCard} style={{"--status-color": statusStyle.color} as any}>
              <div className={styles.cardBg}></div>
              
              {/* HEADER: ID & STATUS */}
              <div className={styles.cardHeader}>
                  <div>
                      <div className={styles.epsTitle}>{task.epsReference}</div>
                      <div className={styles.templateTag}>
                          <FileText size={12}/> {task.template?.name}
                      </div>
                  </div>
                  <div className={styles.statusBox}>
                      <span className={styles.statusLabel} style={{"--status-bg": statusStyle.bg, "--status-text": statusStyle.color, "--status-glow": statusStyle.glow} as any}>
                          {task.status}
                      </span>
                  </div>
              </div>

              {/* DECK: PILOT & TIME */}
              <div className={styles.infoDeck}>
                  {/* PILOT */}
                  <div className={styles.deckSection}>
                      <div className={styles.sectionLabel}><User size={14}/> UNITÉ RESPONSABLE</div>
                      <div className={styles.pilotRow}>
                          <div className={styles.pilotAvatar}>
                              {task.assignee?.username.substring(0,1).toUpperCase() || "?"}
                          </div>
                          <div className={styles.pilotDetails}>
                              <div>{task.assignee?.username || "NON ASSIGNÉ"}</div>
                              <span>ROLE: PILOT // ID: {task.assignee?.id || "N/A"}</span>
                          </div>
                      </div>
                  </div>

                  {/* TIME */}
                  <div className={styles.deckSection}>
                      <div className={styles.sectionLabel}><Clock size={14}/> TEMPS D'OPÉRATION</div>
                      <div className={styles.timeDisplay}>
                          {formatDuration(task.cumulativeTimeSeconds)}
                          <span>TOTAL</span>
                      </div>
                      <div style={{fontSize:"0.7rem", color:"#666", marginTop:5}}>
                          Dernière activité: {task.lastStartedAt ? new Date(task.lastStartedAt).toLocaleString() : "N/A"}
                      </div>
                  </div>
              </div>

              {/* DATA GRID: FULL DATA (Map Dynamic Data) */}
              <div style={{padding:"20px 30px 0", fontSize:"0.8rem", color:"#00f2ea", fontWeight:"bold", letterSpacing:1}}>
                  <Database size={14} style={{display:'inline', marginRight:8}}/> DONNÉES SYSTÈME
              </div>
              
              <div className={styles.fullDataGrid}>
                  {/* Metadata Fixes */}
                  <div className={styles.dataItem}>
                      <label className={styles.dataLabel}>INTERNAL ID</label>
                      <div className={styles.dataValue}>#{task.id}</div>
                  </div>
                  
                  {/* Dynamic Data Loop */}
                  {task.dynamicData ? (
                      Object.entries(task.dynamicData).map(([key, value]) => (
                          <div key={key} className={styles.dataItem}>
                              <label className={styles.dataLabel}>{key}</label>
                              <div className={styles.dataValue}>{String(value)}</div>
                          </div>
                      ))
                  ) : (
                      <div style={{color:"#444", fontStyle:"italic"}}>Aucune donnée dynamique</div>
                  )}
              </div>

              {/* FOOTER ACTIONS */}
              <div className={styles.actionZone}>
                  <button onClick={handleForceReject} className={styles.rejectBtn}>
                      <ShieldAlert size={18} /> FORCER REJET (OVERRIDE)
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}