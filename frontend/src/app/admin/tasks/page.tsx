"use client";

import { useState, useEffect, useRef } from "react";
import { 
  MousePointer2, Layers, Filter, Radio, Users, Zap, Check, X, Search 
} from "lucide-react";
import styles from "./tasks.module.css";
import AuthGuard from "@/components/layout/AuthGuard";
import AdminLoader from "@/components/ui/AdminLoader";
import LuxSelect from "@/components/ui/LuxSelect"; // Import du select custom
import { toast } from "@/components/ui/Toaster";
import InteractiveBackground from "@/components/ui/InteractiveBackground"; // 🔥 L'ambiance

type DispatchMode = 'MANUAL' | 'BATCH' | 'FILTER';

export default function TaskDispatchPage() {
  const [loading, setLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);

  // DATA
  const [tasks, setTasks] = useState<any[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  // LOGIC STATES
  const [mode, setMode] = useState<DispatchMode>('MANUAL');
  
  // Manual & Auto
  const [manualTemplateId, setManualTemplateId] = useState<string>("");
  const [autoBatchTemplateId, setAutoBatchTemplateId] = useState<string>("");

  // Smart Filter
  const [smartTemplateId, setSmartTemplateId] = useState<string>("");
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedColumnKey, setSelectedColumnKey] = useState<string>("");
  const [availableValues, setAvailableValues] = useState<string[]>([]);
  
  // Multi-Select Values
  const [selectedFilterValues, setSelectedFilterValues] = useState<string[]>([]); 
  const [isMultiOpen, setIsMultiOpen] = useState(false);
  const multiRef = useRef<HTMLDivElement>(null);

  // Selection
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [selectedPilotIds, setSelectedPilotIds] = useState<number[]>([]);

  // 1. INIT
  useEffect(() => {
    const init = async () => {
      try {
        const [p, t] = await Promise.all([
          fetch("http://localhost:8080/api/users/pilots").then(r => r.json()),
          fetch("http://localhost:8080/api/templates").then(r => r.json())
        ]);
        setPilots(p.map((x:any) => ({...x, load: Math.floor(Math.random()*60)+10})));
        setTemplates(t);
      } catch(e) { console.error(e); } 
      finally { setLoading(false); }
    };
    init();

    // Click outside handler pour multi-select
    const closeMulti = (e:any) => { if(multiRef.current && !multiRef.current.contains(e.target)) setIsMultiOpen(false); };
    document.addEventListener("mousedown", closeMulti);
    return () => document.removeEventListener("mousedown", closeMulti);
  }, []);

  // 2. FETCH TASKS (Manual)
  useEffect(() => {
    if (mode === 'MANUAL' && manualTemplateId) {
        setLoading(true);
        fetch(`http://localhost:8080/api/tasks/unassigned/${manualTemplateId}`)
            .then(r => r.json()).then(setTasks).finally(() => setLoading(false));
    } else setTasks([]);
  }, [manualTemplateId, mode]);

  // 3. SMART FILTER LOGIC
  useEffect(() => {
    if(!smartTemplateId) { setAvailableColumns([]); return; }
    fetch(`http://localhost:8080/api/tasks/columns/${smartTemplateId}`)
        .then(r=>r.json()).then(setAvailableColumns);
    setSelectedColumnKey(""); setSelectedFilterValues([]);
  }, [smartTemplateId]);

  useEffect(() => {
    if(!smartTemplateId || !selectedColumnKey) { setAvailableValues([]); return; }
    fetch(`http://localhost:8080/api/tasks/values/${smartTemplateId}/${selectedColumnKey}`)
        .then(r=>r.json()).then(v => setAvailableValues(v.filter((x:string)=>x)));
    setSelectedFilterValues([]);
  }, [smartTemplateId, selectedColumnKey]);

  // Helpers
  const toggleVal = (v:string) => setSelectedFilterValues(prev => prev.includes(v) ? prev.filter(x=>x!==v) : [...prev,v]);
  
  // Execute
  const executeDispatch = async () => {
    setIsDispatching(true);
    const payload:any = { mode, pilotIds: selectedPilotIds };
    
    if(mode === 'MANUAL') { payload.taskIds = selectedTaskIds; payload.targetPilotId = selectedPilotIds[0]; }
    if(mode === 'BATCH') payload.templateId = autoBatchTemplateId;
    if(mode === 'FILTER') { 
        payload.templateId = smartTemplateId; 
        payload.filterKey = selectedColumnKey; 
        payload.filterValues = selectedFilterValues; 
    }

    try {
        const res = await fetch("http://localhost:8080/api/dispatch/execute", {
            method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
        });
        if(res.ok) {
            toast({message: "DISPATCH SUCCESSFUL", type: "success"});
            setSelectedTaskIds([]); setSelectedPilotIds([]); setSelectedFilterValues([]);
            if(mode === 'MANUAL') {
                 const ref = await fetch(`http://localhost:8080/api/tasks/unassigned/${manualTemplateId}`).then(r=>r.json());
                 setTasks(ref);
            }
        } else throw new Error();
    } catch { toast({message: "SYSTEM ERROR", type: "error"}); }
    finally { setIsDispatching(false); }
  };

  const isReady = () => {
      if(!selectedPilotIds.length) return false;
      if(mode === 'MANUAL' && !selectedTaskIds.length) return false;
      if(mode === 'BATCH' && !autoBatchTemplateId) return false;
      if(mode === 'FILTER' && (!selectedFilterValues.length || !selectedColumnKey)) return false;
      return true;
  };

  // Transformation des options pour LuxSelect
  const templateOptions = templates.map((t:any) => ({ value: t.id.toString(), label: t.name }));
  const columnOptions = availableColumns.map(c => ({ value: c, label: c }));

  return (
    <AuthGuard>
      <div className={styles.container}>
        
        {/* 🔥 L'ARRIERE PLAN INTERACTIF (Fixe au fond) */}
        <div style={{
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            zIndex: 0, 
            pointerEvents: 'none',
            opacity: 0.6 // Ajuste l'opacité pour que ça soit bien visible
        }}>
            <InteractiveBackground />
        </div>

        <AdminLoader isLoading={loading || isDispatching} />

        {/* HEADER */}
        <header className={styles.header}>
          <div className={styles.titleBox}>
            <h1>TASK DISPATCH</h1>
            <p>TACTICAL ASSIGNMENT INTERFACE // V3.0</p>
          </div>
          <div className={styles.modeTabs}>
            <button className={`${styles.tabBtn} ${mode === 'MANUAL' ? styles.active : ''}`} onClick={() => setMode('MANUAL')}>
                <MousePointer2 size={14}/> MANUEL
            </button>
            <button className={`${styles.tabBtn} ${mode === 'BATCH' ? styles.active : ''}`} onClick={() => setMode('BATCH')}>
                <Layers size={14}/> AUTO BATCH
            </button>
            <button className={`${styles.tabBtn} ${mode === 'FILTER' ? styles.active : ''}`} onClick={() => setMode('FILTER')}>
                <Filter size={14}/> SMART FILTER
            </button>
          </div>
        </header>

        {/* FILTER BAR (LUXE) */}
        <div className={styles.filterBar}>
            {/* MODE MANUAL */}
            {mode === 'MANUAL' && (
                <div className={styles.fullWidth}>
                    <LuxSelect 
                        label="SOURCE TEMPLATE" 
                        options={templateOptions} 
                        value={manualTemplateId} 
                        onChange={setManualTemplateId} 
                        placeholder="Sélectionner un flux..."
                    />
                </div>
            )}

            {/* MODE AUTO BATCH */}
            {mode === 'BATCH' && (
                <div className={styles.fullWidth}>
                    <LuxSelect 
                        label="BATCH SOURCE" 
                        options={templateOptions} 
                        value={autoBatchTemplateId} 
                        onChange={setAutoBatchTemplateId}
                        placeholder="Template à distribuer..."
                    />
                </div>
            )}

            {/* MODE SMART FILTER */}
            {mode === 'FILTER' && (
                <>
                    {/* 1. Template */}
                    <LuxSelect label="1. TEMPLATE" options={templateOptions} value={smartTemplateId} onChange={setSmartTemplateId} />
                    
                    {/* 2. Cible */}
                    <LuxSelect label="2. CIBLE (COLONNE)" options={columnOptions} value={selectedColumnKey} onChange={setSelectedColumnKey} disabled={!smartTemplateId} />
                    
                    {/* 3. MULTI SELECT CUSTOM (LE SCROLL EST GÉRÉ DANS CSS) */}
                    <div className={styles.multiWrapper} ref={multiRef}>
                        <span className={styles.multiLabel}>3. VALEURS (MULTI)</span>
                        <div className={styles.multiTrigger} onClick={() => selectedColumnKey && setIsMultiOpen(!isMultiOpen)}>
                            {selectedFilterValues.length === 0 ? <span style={{color:"#666", fontSize:"0.8rem", fontFamily:"monospace"}}>Choisir valeurs...</span> : 
                                selectedFilterValues.map(v => (
                                    <div key={v} className={styles.chip}>
                                        {v} <X size={10} className={styles.removeChip} onClick={(e)=>{e.stopPropagation(); toggleVal(v)}}/>
                                    </div>
                                ))
                            }
                        </div>
                        {isMultiOpen && (
                            <div className={styles.multiSelectDropdown}>
                                {availableValues.map(val => (
                                    <div key={val} className={`${styles.multiOption} ${selectedFilterValues.includes(val) ? styles.selected : ''}`} onClick={() => toggleVal(val)}>
                                        <div className={styles.checkbox}>{selectedFilterValues.includes(val) && <Check size={12} color="black"/>}</div>
                                        {val}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>

        {/* GRID PRINCIPAL */}
        <div className={styles.tacticalGrid}>
            
            {/* GAUCHE : FLUX */}
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div className={styles.sectionTitle}><Radio size={16} color="#00f2ea"/> FLUX ENTRANT</div>
                    <div className={styles.sectionCount}>{mode==='MANUAL' ? tasks.length : 'AUTO'}</div>
                </div>
                <div className={styles.scrollArea}>
                    {mode === 'MANUAL' ? tasks.map(t => (
                        <div key={t.id} className={`${styles.taskItem} ${selectedTaskIds.includes(t.id) ? styles.selected : ''}`} onClick={() => {
                            if(selectedTaskIds.includes(t.id)) setSelectedTaskIds(prev => prev.filter(x=>x!==t.id));
                            else setSelectedTaskIds(prev => [...prev, t.id]);
                        }}>
                            <div className={styles.taskInfo}>
                                <span className={styles.taskRef}>{t.epsReference}</span>
                                <span className={styles.taskMeta}>ID_REF: {t.id}</span>
                            </div>
                            <div className={styles.checkbox}>
                                {selectedTaskIds.includes(t.id) && <Check size={14} color="#00f2ea"/>}
                            </div>
                        </div>
                    )) : (
                        <div style={{height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10}}>
                            <Zap size={40} color="#333"/>
                            <span style={{color:"#444", fontSize:"0.8rem", letterSpacing:1}}>MODE AUTOMATIQUE ACTIVÉ</span>
                        </div>
                    )}
                </div>
            </div>

            {/* DROITE : PILOTES */}
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <div className={styles.sectionTitle}><Users size={16} color="#39ff14"/> UNITÉS</div>
                    <div className={styles.sectionCount}>{selectedPilotIds.length}</div>
                </div>
                <div className={styles.scrollArea}>
                    {pilots.map(p => (
                        <div key={p.id} className={`${styles.pilotCard} ${selectedPilotIds.includes(p.id) ? styles.active : ''}`} onClick={() => {
                            if(mode==='MANUAL') setSelectedPilotIds([p.id]);
                            else {
                                if(selectedPilotIds.includes(p.id)) setSelectedPilotIds(prev=>prev.filter(x=>x!==p.id));
                                else setSelectedPilotIds(prev=>[...prev, p.id]);
                            }
                        }}>
                            <div className={styles.pilotHeader}>
                                <span className={styles.pilotName}>{p.username}</span>
                                <div className={styles.pilotStatus}>ONLINE</div>
                            </div>
                            <div style={{display:"flex", justifyContent:"space-between", fontSize:"0.7rem", color:"#666", marginBottom:5}}>
                                <span>CHARGE</span>
                                <span>{p.load}%</span>
                            </div>
                            <div className={styles.loadTrack}><div className={styles.loadFill} style={{width: `${p.load}%`}}></div></div>
                        </div>
                    ))}
                </div>
                <button className={`${styles.dispatchBtn} ${isReady() ? styles.ready : ''}`} disabled={!isReady() || isDispatching} onClick={executeDispatch}>
                    {isDispatching ? "TRANSMISSION..." : "LANCER OPÉRATION"}
                </button>
            </div>

        </div>
      </div>
    </AuthGuard>
  );
}