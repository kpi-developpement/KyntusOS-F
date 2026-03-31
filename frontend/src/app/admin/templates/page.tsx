"use client";

import { useState, useEffect } from "react";
import styles from "@/components/features/TemplatesPage.module.css";
import { useRouter } from "next/navigation";
import { Plus, Save, Layers, Cpu, Database, Trash2, Gauge, Lock } from "lucide-react"; 
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import { toast } from "@/components/ui/Toaster";

export default function TemplatesPage() {
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [currentCol, setCurrentCol] = useState("");
  const [complexity, setComplexity] = useState(1); // Locked at 1 for now

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = () => {
    fetch("http://localhost:8080/api/templates")
      .then(res => res.json())
      .then(data => setTemplates(data || []))
      .catch(err => console.error("Erreur templates:", err));
  };

  const addColumn = () => {
    if (!currentCol.trim()) return;
    setColumns([...columns, currentCol.toUpperCase()]);
    setCurrentCol("");
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({message: "LE NOM DU PROTOCOLE EST REQUIS", type: "error"});
      return;
    }

    setLoading(true);
    try {
      // ✅ FIX ICI: On mappe 'columns' vers 'fields' pour le Backend
      const payload = {
          name: name,
          complexity: complexity,
          fields: columns.map(c => ({
              name: c, 
              type: "TEXT",     // Par défaut TEXT
              required: false   // Par défaut optionnel
          }))
      };

      const res = await fetch("http://localhost:8080/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload), 
      });

      if (res.ok) {
        fetchTemplates();
        setName("");
        setColumns([]);
        setComplexity(1);
        toast({message: "PROTOCOLE INITIALISÉ AVEC SUCCÈS", type: "success"});
      } else {
        throw new Error("Erreur serveur");
      }
    } catch (e) {
      toast({message: "ERREUR DE CRÉATION", type: "error"});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <InteractiveBackground />
      
      <div className={styles.builderPanel}>
        <div className={styles.contentRelatif}>
            <div className={styles.builderHeader}>
              <h1 className={styles.title}>ARCHITECTE SYSTÈME</h1>
              <span className={styles.subtitle}>// DÉFINITION DES PROTOCOLES DE FLUX</span>
            </div>

            {/* Nom */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>1. NOM DU PROTOCOLE (PROJET)</label>
              <input 
                type="text" 
                className={styles.neonInput} 
                placeholder="Ex: FIBRE_OUJDA_PHASE_1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* --- COMPLEXITY SLIDER (DISABLED / LOCKED) --- */}
            <div className={styles.inputGroup}>
                <label className={styles.label} style={{display:'flex', alignItems:'center', gap:10, opacity: 0.5}}>
                   <Gauge size={14}/> 2. NIVEAU DE COMPLEXITÉ (AI CORE)
                   <span style={{fontSize:'0.6rem', color:'#ff0055', border:'1px solid #ff0055', padding:'2px 6px', borderRadius:'4px'}}>OFFLINE</span>
                </label>
                
                {/* Zone Disable Grise */}
                <div style={{
                    display:'flex', alignItems:'center', gap:20, 
                    background:'rgba(255,255,255,0.02)', padding:15, borderRadius:8, 
                    border:'1px dashed rgba(255,255,255,0.1)', cursor: 'not-allowed', position: 'relative'
                }}>
                   {/* Lock Icon */}
                   <div style={{position: 'absolute', top:0, left:0, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, background:'rgba(0,0,0,0.5)'}}>
                       <span style={{color:'#666', fontWeight:'bold', display:'flex', alignItems:'center', gap:5}}>
                           <Lock size={14}/> WAITING FOR NEURAL LINK
                       </span>
                   </div>

                   <input 
                      type="range" 
                      min="1" max="10" 
                      value={1} 
                      disabled={true} 
                      style={{flex:1, opacity: 0.3}}
                    />
                    <span style={{
                        fontSize:'1.5rem', fontWeight:'900', color: '#444', 
                        minWidth: 40, textAlign:'center'
                    }}>
                        1
                    </span>
                </div>
            </div>

            {/* Columns */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>3. STRUCTURE DE DONNÉES</label>
              {columns.length > 0 && (
                  <div className={styles.fieldsContainer}>
                    {columns.map((col, idx) => (
                      <div key={idx} className={styles.fieldModule}>
                        <span className={styles.fieldText}>{col}</span>
                        <button onClick={() => removeColumn(idx)} className={styles.removeBtn}><Trash2 size={12}/></button>
                      </div>
                    ))}
                  </div>
              )}
              <div className={styles.addZone}>
                  <input 
                    type="text" 
                    className={styles.neonInput} 
                    placeholder="Nom du champ (ex: PBO)..."
                    value={currentCol}
                    onChange={(e) => setCurrentCol(e.target.value)}
                  />
                  <button onClick={addColumn} className={styles.addBtn}><Plus size={24} strokeWidth={4} /></button>
              </div>
            </div>

            <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
                {loading ? <span className="spin">INITIALISATION...</span> : <span><Cpu size={20} /> INITIALISER LE PROTOCOLE</span>}
            </button>
        </div>
      </div>

      <div className={styles.rackPanel}>
         <div className={styles.rackHeader}>PROTOCOLES ACTIFS : {templates.length}</div>
         {templates.map((t) => (
             <div key={t.id} className={styles.cartridge}>
                 <div className={styles.led}></div>
                 <div className={styles.cartridgeInfo}>
                     <div>
                         <div className={styles.idRef}>REF_ID: {t.id.toString().padStart(4, '0')}</div>
                         <div className={styles.cName}>{t.name}</div>
                         <div className={styles.cMeta}>
                            <span style={{color:'#444', marginRight:10, fontSize:'0.7rem'}}>CX: DEFAULT</span>
                            {/* Correction d'affichage pour éviter le crash si fields est null */}
                            <Layers size={12} /> {t.fields ? t.fields.length : 0} MODULES
                         </div>
                     </div>
                 </div>
                 <Save size={20} className={styles.iconSave} />
             </div>
         ))}
      </div>
    </div>
  );
}