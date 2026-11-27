"use client";

import { useState, useEffect, useRef } from "react";
import { MousePointer2, Layers, Filter, Radio, Users, Zap, Check, X, Target, Send, Loader2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./tasks.module.css";
import AuthGuard from "@/components/layout/AuthGuard";
import LuxSelect from "@/components/ui/LuxSelect";
import { toast } from "@/components/ui/Toaster";
import { KxHeader, KxEmpty } from "@/components/kx";

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
          fetch("/api/users/pilots").then(r => r.json()),
          fetch("/api/templates").then(r => r.json())
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
        fetch(`/api/tasks/unassigned/${manualTemplateId}`)
            .then(r => r.json()).then(setTasks).finally(() => setLoading(false));
    } else setTasks([]);
  }, [manualTemplateId, mode]);

  // 3. SMART FILTER LOGIC
  useEffect(() => {
    if(!smartTemplateId) { setAvailableColumns([]); return; }
    fetch(`/api/tasks/columns/${smartTemplateId}`)
        .then(r=>r.json()).then(setAvailableColumns);
    setSelectedColumnKey(""); setSelectedFilterValues([]);
  }, [smartTemplateId]);

  useEffect(() => {
    if(!smartTemplateId || !selectedColumnKey) { setAvailableValues([]); return; }
    fetch(`/api/tasks/values/${smartTemplateId}/${selectedColumnKey}`)
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
        const res = await fetch("/api/dispatch/execute", {
            method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
        });
        if(res.ok) {
            toast({message: "Tâches dispatchées", type: "success"});
            setSelectedTaskIds([]); setSelectedPilotIds([]); setSelectedFilterValues([]);
            if(mode === 'MANUAL') {
                 const ref = await fetch(`/api/tasks/unassigned/${manualTemplateId}`).then(r=>r.json());
                 setTasks(ref);
            }
        } else throw new Error();
    } catch { toast({message: "Le dispatch a échoué", type: "error"}); }
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

  const MODES: { id: DispatchMode; label: string; desc: string; icon: typeof Layers }[] = [
    { id: "MANUAL", label: "Manuel", desc: "Choisir les tâches une par une", icon: MousePointer2 },
    { id: "BATCH", label: "Lot automatique", desc: "Répartir tout un projet", icon: Layers },
    { id: "FILTER", label: "Filtre intelligent", desc: "Cibler par valeur de colonne", icon: Filter },
  ];
  const readyNow = isReady();
  const summary = mode === "MANUAL"
    ? `${selectedTaskIds.length} tâche(s) → ${selectedPilotIds.length ? pilots.find((p) => p.id === selectedPilotIds[0])?.username : "aucun pilote"}`
    : `${selectedPilotIds.length} pilote(s) sélectionné(s)`;

  return (
    <AuthGuard>
      <main className="kx-page" style={{ maxWidth: 1500 }}>
        <KxHeader
          icon={Target}
          eyebrow="Pilotage"
          title={<>Dispatch des <em>tâches</em></>}
          subtitle="Choisissez un mode, sélectionnez les tâches puis les pilotes qui vont les traiter."
        />

        <div className={styles.modes} role="tablist" aria-label="Mode de dispatch">
          {MODES.map((m) => {
            const Icon = m.icon;
            const on = mode === m.id;
            return (
              <button key={m.id} type="button" role="tab" aria-selected={on} className={`${styles.mode} ${on ? styles.modeOn : ""}`} onClick={() => setMode(m.id)}>
                {on && <motion.span layoutId="dispatch-mode" className={styles.modePill} transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
                <span className={styles.modeIcon}><Icon size={18} /></span>
                <span className={styles.modeText}><b>{m.label}</b><small>{m.desc}</small></span>
              </button>
            );
          })}
        </div>

        <section className={styles.filters}>
          {mode === "MANUAL" && (
            <LuxSelect label="Projet source" options={templateOptions} value={manualTemplateId} onChange={setManualTemplateId} placeholder="Choisir un projet" />
          )}
          {mode === "BATCH" && (
            <LuxSelect label="Projet à répartir" options={templateOptions} value={autoBatchTemplateId} onChange={setAutoBatchTemplateId} placeholder="Choisir un projet" />
          )}
          {mode === "FILTER" && (
            <div className={styles.filterGrid}>
              <LuxSelect label="1 · Projet" options={templateOptions} value={smartTemplateId} onChange={setSmartTemplateId} placeholder="Choisir un projet" />
              <LuxSelect label="2 · Colonne" options={columnOptions} value={selectedColumnKey} onChange={setSelectedColumnKey} disabled={!smartTemplateId} placeholder="Choisir une colonne" />
              <div className={styles.multi} ref={multiRef}>
                <span className={styles.multiLabel}>3 · Valeurs</span>
                <button type="button" className={styles.multiTrigger} onClick={() => selectedColumnKey && setIsMultiOpen(!isMultiOpen)} disabled={!selectedColumnKey} aria-expanded={isMultiOpen}>
                  {selectedFilterValues.length === 0 ? <span className={styles.placeholder}>Choisir des valeurs</span> : selectedFilterValues.map((v) => (
                    <span key={v} className={styles.chip}>
                      {v}
                      <span role="button" tabIndex={0} aria-label={`Retirer ${v}`} className={styles.chipX} onClick={(e) => { e.stopPropagation(); toggleVal(v); }}><X size={11} /></span>
                    </span>
                  ))}
                  <ChevronDown size={16} className={styles.multiChev} />
                </button>
                <AnimatePresence>
                  {isMultiOpen && (
                    <motion.div className={styles.multiDrop} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} role="listbox" aria-multiselectable="true">
                      {availableValues.length === 0 && <div className={styles.multiEmpty}>Aucune valeur</div>}
                      {availableValues.map((val) => {
                        const on = selectedFilterValues.includes(val);
                        return (
                          <button key={val} type="button" role="option" aria-selected={on} className={`${styles.multiOpt} ${on ? styles.multiOptOn : ""}`} onClick={() => toggleVal(val)}>
                            <span className={styles.box}>{on && <Check size={12} strokeWidth={3} />}</span>{val}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </section>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <span className={styles.panelTitle}><Radio size={16} /> Tâches en attente</span>
              <span className={styles.count}>{mode === "MANUAL" ? tasks.length : "Auto"}</span>
              {mode === "MANUAL" && tasks.length > 0 && (
                <button type="button" className={styles.linkBtn} onClick={() => setSelectedTaskIds(selectedTaskIds.length === tasks.length ? [] : tasks.map((t) => t.id))}>
                  {selectedTaskIds.length === tasks.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              )}
            </header>
            <div className={styles.scroll}>
              {mode === "MANUAL" ? (
                loading && manualTemplateId ? (
                  Array.from({ length: 6 }).map((_, i) => <div key={i} className="kx-skeleton" style={{ height: 54 }} />)
                ) : tasks.length === 0 ? (
                  <KxEmpty icon={Radio} title={manualTemplateId ? "Aucune tâche en attente" : "Choisissez un projet"}>
                    <span>{manualTemplateId ? "Toutes les tâches de ce projet sont déjà assignées." : "Les tâches non assignées apparaîtront ici."}</span>
                  </KxEmpty>
                ) : tasks.map((t) => {
                  const on = selectedTaskIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" className={`${styles.task} ${on ? styles.taskOn : ""}`} aria-pressed={on} onClick={() => setSelectedTaskIds((prev) => (on ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}>
                      <span className={styles.box}>{on && <Check size={12} strokeWidth={3} />}</span>
                      <span className={styles.taskRef}>{t.epsReference}</span>
                      <span className={styles.taskId}>#{t.id}</span>
                    </button>
                  );
                })
              ) : (
                <KxEmpty icon={Zap} title="Sélection automatique">
                  <span>{mode === "BATCH" ? "Toutes les tâches non assignées du projet seront réparties." : "Les tâches correspondant au filtre seront réparties."}</span>
                </KxEmpty>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHead}>
              <span className={styles.panelTitle}><Users size={16} /> Pilotes</span>
              <span className={styles.count}>{selectedPilotIds.length} / {pilots.length}</span>
            </header>
            <div className={styles.scroll}>
              {pilots.map((p) => {
                const on = selectedPilotIds.includes(p.id);
                return (
                  <button key={p.id} type="button" className={`${styles.pilot} ${on ? styles.pilotOn : ""}`} aria-pressed={on} onClick={() => {
                    if (mode === "MANUAL") setSelectedPilotIds(on ? [] : [p.id]);
                    else setSelectedPilotIds((prev) => (on ? prev.filter((x) => x !== p.id) : [...prev, p.id]));
                  }}>
                    <span className={styles.avatar}>{String(p.username).slice(0, 2).toUpperCase()}</span>
                    <span className={styles.pilotBody}>
                      <span className={styles.pilotTop}><b>{p.username}</b><small>{p.load}% de charge</small></span>
                      <span className={styles.load}><span style={{ width: `${Math.min(100, p.load || 0)}%` }} className={(p.load || 0) > 80 ? styles.loadHigh : ""} /></span>
                    </span>
                    <span className={styles.box}>{on && <Check size={12} strokeWidth={3} />}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className={`${styles.dock} ${readyNow ? styles.dockReady : ""}`}>
          <span className={styles.dockText}>{summary}</span>
          <button type="button" className="kx-btn kx-btn-lg" disabled={!readyNow || isDispatching} onClick={executeDispatch}>
            {isDispatching ? <Loader2 size={18} className="kx-spin" /> : <Send size={18} />}
            {isDispatching ? "Envoi…" : "Lancer le dispatch"}
          </button>
        </div>
      </main>
    </AuthGuard>
  );
}
