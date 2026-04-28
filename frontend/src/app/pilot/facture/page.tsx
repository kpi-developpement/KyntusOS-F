"use client";

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { UploadCloud, Cpu, AlertTriangle, CheckCircle2, XCircle, Plus, Trash2, Zap, Settings, Database } from 'lucide-react';
import QuantumDataGrid from './ux/QuantumDataGrid';
import HoloSpreadsheet from './components/HoloSpreadsheet';

export default function FacturePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheetsData, setSheetsData] = useState<Record<string, any[]> | null>(null);
  const [finalExcelBlob, setFinalExcelBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 📂 STATE DYAL LES FICHIERS
  const [filesMap, setFilesMap] = useState<{
    vide: File | null; tvc: File | null; rep: File | null; 
    diag: File | null; qa: File | null; intervention: File | null;
  }>({
    vide: null, tvc: null, rep: null, diag: null, qa: null, intervention: null
  });

  // 💰 STATE DYAL DEVIS OVERRIDE
  const [devisMap, setDevisMap] = useState<Record<string, number>>({});
  const [epsInput, setEpsInput] = useState('');
  const [valInput, setValInput] = useState('');

  // --- 1. SELECTION DYAL LES FICHIERS (BLA MAY-LANCER L-CALCUL) ---
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    const newMap = { ...filesMap };

    Array.from(files).forEach(file => {
      const name = file.name.toUpperCase();
      if (name.includes("VIDE")) newMap.vide = file;
      else if (name.includes("TVC")) newMap.tvc = file;
      else if (name.includes("REPETEUR") || name.includes("VALIDATION")) newMap.rep = file;
      else if (name.includes("DIAG")) newMap.diag = file;
      else if (name.includes("QUESTION") || name.includes("ANSWER")) newMap.qa = file;
      else if (name.includes("INTERVENTION") || name.includes("BOTE")) newMap.intervention = file;
    });

    setFilesMap(newMap);
  };

  // --- 2. GESTION DYAL DEVIS ---
  const handleAddDevis = () => {
    if (!epsInput.trim() || !valInput.trim()) return;
    const value = parseFloat(valInput);
    if (isNaN(value)) return;

    setDevisMap({ ...devisMap, [epsInput.trim().toUpperCase()]: value });
    setEpsInput('');
    setValInput('');
  };

  const handleRemoveDevis = (eps: string) => {
    const newMap = { ...devisMap };
    delete newMap[eps];
    setDevisMap(newMap);
  };

  // --- 3. LANCEMENT DYAL T-TRAITEMENT L-BACKEND ---
  const handleGenerate = async () => {
    // Verification des fichiers obligatoires
    if (!filesMap.vide || !filesMap.tvc || !filesMap.rep || !filesMap.diag || !filesMap.qa) {
      setErrorMessage("⚠️ PROTOCOLE REFUSÉ : Fichiers vitaux manquants (A VIDE, TVC, Repeteur, Diag Wifi, QA).");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const formData = new FormData();

    formData.append("fichierAVide", filesMap.vide);
    formData.append("fichierTVC", filesMap.tvc);
    formData.append("fichierRepeteur", filesMap.rep);
    formData.append("fichierDiagWifi", filesMap.diag);
    formData.append("fichierQA", filesMap.qa);
    if (filesMap.intervention) formData.append("fichierIntervention", filesMap.intervention);

    // 🔥 ENVOI DYAL DEVIS L-BACKEND 🔥
    if (Object.keys(devisMap).length > 0) {
      formData.append("devisData", JSON.stringify(devisMap));
    }

    try {
      const response = await fetch("http://localhost:3000/api/facture/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[CRASH SERVEUR ${response.status}] ${errorText || "Anomalie Inconnue."}`);
      }

      const blob = await response.blob();
      setFinalExcelBlob(blob);

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const parsedSheets: Record<string, any[]> = {};
      workbook.SheetNames.forEach(sheetName => {
        parsedSheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
      });

      setSheetsData(parsedSheets);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Erreur de connexion au serveur Backend.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    if (!finalExcelBlob) return;
    const url = window.URL.createObjectURL(finalExcelBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Facture_Kyntus_Nexus_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <main style={{ padding: "2rem", minHeight: "100vh", position: "relative", color: "#e2e8f0" }}>
      <QuantumDataGrid /> {/* Background NASA */}

      <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative", zIndex: 10 }}>
        
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '1px solid rgba(0,240,255,0.2)', paddingBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'monospace', fontSize: '3.5rem', color: '#fff', textShadow: '0 0 30px rgba(0,240,255,0.8)', margin: 0, fontWeight: 900, letterSpacing: '2px' }}>
            NEXUS <span style={{ color: '#b026ff', textShadow: '0 0 30px rgba(176,38,255,0.8)' }}>ENGINE</span>
          </h1>
          <p style={{ color: '#00f0ff', fontFamily: 'monospace', letterSpacing: '4px', marginTop: '10px', fontSize: '1.1rem' }}>
            <Cpu size={18} style={{ display: 'inline', verticalAlign: 'sub', marginRight: '8px' }} /> 
            CENTRE DE CONTRÔLE DE FACTURATION
          </p>
        </div>

        {/* ALERTS */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              style={{ background: 'rgba(220, 38, 38, 0.15)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '12px', color: '#fca5a5', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem', backdropFilter: 'blur(10px)', boxShadow: '0 0 30px rgba(239,68,68,0.2)' }}
            >
              <AlertTriangle size={28} color="#ef4444" /> <div><b>SYSTEM HALT:</b> {errorMessage}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* NASA DASHBOARD GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* PANNEAU 1 : DATABANKS UPLOAD */}
          <div style={{ background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: '20px', padding: '2rem', boxShadow: 'inset 0 0 20px rgba(0,240,255,0.05)' }}>
            <h2 style={{ fontFamily: 'monospace', color: '#00f0ff', borderBottom: '1px solid rgba(0,240,255,0.2)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 20px 0' }}>
              <Database size={20} /> ALIMENTATION DES DONNÉES
            </h2>
            
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', border: '2px dashed rgba(0,240,255,0.5)', borderRadius: '15px', cursor: 'pointer', background: 'rgba(0,240,255,0.05)', transition: 'all 0.3s', marginBottom: '20px' }}>
              <UploadCloud size={40} color="#00f0ff" style={{ marginBottom: '10px' }} />
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>SÉLECTIONNER LES FICHIERS (.XLSX)</span>
              <input type="file" multiple accept=".xlsx,.csv" onChange={handleFilesSelect} style={{ display: 'none' }} />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {[
                { key: 'vide', label: 'A VIDE (*)' }, { key: 'tvc', label: 'TVC (*)' },
                { key: 'rep', label: 'RÉPÉTEUR (*)' }, { key: 'diag', label: 'DIAG WIFI (*)' },
                { key: 'qa', label: 'QA DONNÉES (*)' }, { key: 'intervention', label: 'INTERVENTION' }
              ].map((item) => {
                const isLoaded = !!filesMap[item.key as keyof typeof filesMap];
                return (
                  <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${isLoaded ? 'rgba(57,255,20,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                    {isLoaded ? <CheckCircle2 size={16} color="#39ff14" /> : <XCircle size={16} color="#64748b" />}
                    <span style={{ color: isLoaded ? '#fff' : '#64748b' }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PANNEAU 2 : MANUAL OVERRIDE PROTOCOL (DEVIS) */}
          <div style={{ background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(176,38,255,0.3)', borderRadius: '20px', padding: '2rem', boxShadow: 'inset 0 0 20px rgba(176,38,255,0.05)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(176,38,255,0.2) 0%, transparent 70%)', borderRadius: '50%' }}></div>
            
            <h2 style={{ fontFamily: 'monospace', color: '#b026ff', borderBottom: '1px solid rgba(176,38,255,0.2)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 20px 0' }}>
              <Settings size={20} /> OVERRIDE MANUEL (SUPPORT)
            </h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text" placeholder="EPS-XXXX..." value={epsInput} onChange={(e) => setEpsInput(e.target.value)}
                style={{ flex: 2, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(176,38,255,0.4)', borderRadius: '8px', padding: '10px 15px', color: '#fff', fontFamily: 'monospace', outline: 'none', textTransform: 'uppercase' }}
              />
              <input
                type="number" placeholder="Valeur (€)" value={valInput} onChange={(e) => setValInput(e.target.value)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(176,38,255,0.4)', borderRadius: '8px', padding: '10px 15px', color: '#fff', fontFamily: 'monospace', outline: 'none' }}
              />
              <button onClick={handleAddDevis} style={{ background: '#b026ff', border: 'none', borderRadius: '8px', padding: '0 15px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(176,38,255,0.4)' }}>
                <Plus size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '100px', maxHeight: '180px', overflowY: 'auto', padding: '10px' }}>
              {Object.keys(devisMap).length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontFamily: 'monospace', paddingTop: '30px' }}>AUCUN OVERRIDE ACTIF</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(devisMap).map(([eps, val]) => (
                    <li key={eps} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(176,38,255,0.1)', padding: '8px 15px', borderRadius: '8px', border: '1px solid rgba(176,38,255,0.2)', fontFamily: 'monospace' }}>
                      <span style={{ color: '#00f0ff', fontWeight: 'bold' }}>{eps}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ color: '#fff' }}>{val} €</span>
                        <Trash2 size={16} color="#ef4444" style={{ cursor: 'pointer' }} onClick={() => handleRemoveDevis(eps)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* BOUTON D'ALLUMAGE (ENGAGE) */}
        <motion.button
          onClick={handleGenerate}
          disabled={isProcessing}
          whileHover={!isProcessing ? { scale: 1.02, boxShadow: '0 0 40px rgba(0,240,255,0.6)' } : {}}
          whileTap={!isProcessing ? { scale: 0.98 } : {}}
          style={{ width: '100%', padding: '20px', background: isProcessing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(90deg, #00f0ff 0%, #b026ff 100%)', border: 'none', borderRadius: '15px', color: isProcessing ? '#64748b' : '#fff', fontSize: '1.5rem', fontFamily: 'monospace', fontWeight: 900, letterSpacing: '3px', cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '3rem' }}
        >
          {isProcessing ? (
             <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Zap size={28} /></motion.div> FUSION QUANTIQUE EN COURS...</>
          ) : (
             <><Zap size={28} /> ENGAGE QUANTUM FUSION</>
          )}
        </motion.button>

        {/* RESULTATS HOLOGRAPHIQUES */}
        <AnimatePresence>
          {sheetsData && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', damping: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                 <div style={{ background: 'rgba(57, 255, 20, 0.1)', color: '#39ff14', padding: '10px 20px', borderRadius: '50px', border: '1px solid #39ff14', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 0 15px rgba(57,255,20,0.3)' }}>
                    <CheckCircle2 size={18} /> OPÉRATION TERMINÉE. OVERRIDES APPLIQUÉS.
                 </div>
              </div>
              <HoloSpreadsheet sheetsData={sheetsData} onDownload={downloadExcel} />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}