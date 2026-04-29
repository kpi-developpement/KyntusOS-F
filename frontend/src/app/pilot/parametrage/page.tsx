"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ParametrageDropzone from './ui/ParametrageDropzone';
import ParametrageTable from './components/ParametrageTable';
import { Cpu, CheckCircle, AlertTriangle, DownloadCloud } from 'lucide-react';
import * as XLSX from 'xlsx'; // N'oublie pas: npm install xlsx

const API_BASE = "";

export default function ParametragePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // States pour afficher le tableau
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);

  const mainRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Effet Cyberpunk de la souris
  useEffect(() => {
    let animationFrameId: number;
    const handleMouseMove = (e: MouseEvent) => {
      animationFrameId = requestAnimationFrame(() => {
        if (glowRef.current) glowRef.current.style.transform = `translate3d(${e.clientX - 200}px, ${e.clientY - 200}px, 0)`;
        if (mainRef.current) {
          const x = e.clientX / window.innerWidth;
          const y = e.clientY / window.innerHeight;
          mainRef.current.style.setProperty('--mouse-x', x.toFixed(3));
          mainRef.current.style.setProperty('--mouse-y', y.toFixed(3));
        }
      });
    };
    window.addEventListener('mousemove', handleMouseMove); return () => { window.removeEventListener('mousemove', handleMouseMove); cancelAnimationFrame(animationFrameId); };
  }, []);

  // 🔥 LA FONCTION MAITRESSE: UPLOAD -> DOWNLOAD -> PREVIEW 🔥
  const processFile = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg("");
    setSuccessMsg("");
    setTableData([]);
    setTableColumns([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Appel de l'API Backend
      const response = await fetch(`${API_BASE}/api/parametrage/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error("Erreur lors du traitement par le serveur.");

      // 2. Récupération du fichier généré (Blob)
      const blob = await response.blob();
      
      // 3. 📥 TELECHARGEMENT AUTOMATIQUE
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resultat_Parametrage_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // 4. 📊 LECTURE DU BLOB POUR AFFICHAGE DANS LE TABLEAU FRONTEND
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Conversion en JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          if (jsonData.length > 0) {
            setTableColumns(Object.keys(jsonData[0] as object));
            setTableData(jsonData);
          }
          
          setSuccessMsg("MATRIX PROCESSED SECURELY. DATA EXTRACTED & DOWNLOADED.");
        } catch (err) {
          console.error("Erreur de lecture XLSX frontend:", err);
          setErrorMsg("Fichier généré mais erreur lors de la prévisualisation.");
        }
      };
      reader.readAsArrayBuffer(blob);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Echec de l'opération.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main ref={mainRef} style={{ padding: "2rem", minHeight: "100vh", position: "relative", overflowX: "hidden", cursor: "crosshair", "--mouse-x": "0.5", "--mouse-y": "0.5" } as React.CSSProperties}>
      
      {/* CYBERPUNK BACKGROUNDS */}
      <div className="dynamic-hue" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: -2, backgroundImage: "linear-gradient(135deg, #020617, #08122a, #000c17, #130321)", backgroundSize: "200% 200%", animation: "vivid-gradient 30s ease infinite" }}>
        <div style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", perspective: "1000px" }}>
           <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)", backgroundSize: "60px 60px", transformOrigin: "center center", animation: "grid-flow 6s linear infinite" }}></div>
        </div>
      </div>
      <div ref={glowRef} className="dynamic-hue" style={{ position: "fixed", top: 0, left: 0, width: "400px", height: "400px", backgroundImage: "radial-gradient(circle, rgba(57, 255, 20, 0.15) 0%, rgba(0, 240, 255, 0.05) 40%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", zIndex: -1, willChange: "transform", mixBlendMode: "screen" }}></div>

      <style>{`
        .tilt-panel { transition: transform 0.2s ease-out; transform: perspective(1000px) rotateX(calc((var(--mouse-y) - 0.5) * -3deg)) rotateY(calc((var(--mouse-x) - 0.5) * 3deg)); }
        .dynamic-hue { filter: hue-rotate(calc((var(--mouse-x) - 0.5) * 40deg)); transition: filter 0.2s ease-out; }
        .hardware-accelerated { transform: translateZ(0); will-change: transform, opacity; backface-visibility: hidden; }
        @keyframes grid-flow { 0% { transform: rotateX(60deg) scale(2.5) translateY(0); } 100% { transform: rotateX(60deg) scale(2.5) translateY(60px); } }
        @keyframes vivid-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        
        .target-bracket::before, .target-bracket::after { content: ''; position: absolute; width: 15px; height: 15px; border: 2px solid transparent; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none; z-index: 10; }
        .target-bracket::before { top: -2px; left: -2px; border-top-color: #00f0ff; border-left-color: #00f0ff; opacity: 0; }
        .target-bracket::after { bottom: -2px; right: -2px; border-bottom-color: #00f0ff; border-right-color: #00f0ff; opacity: 0; }
        .target-bracket:hover::before, .target-bracket:hover::after { width: 30%; height: 50%; opacity: 1; filter: drop-shadow(0 0 5px #00f0ff); }
      `}</style>

      <div className="tilt-panel" style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 10 }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0, 240, 255, 0.3)' }}>
          <div style={{ padding: '12px', background: 'rgba(57, 255, 20, 0.1)', borderRadius: '12px', border: '1px solid rgba(57, 255, 20, 0.4)', boxShadow: '0 0 20px rgba(57, 255, 20, 0.2)' }}>
            <Cpu size={36} color="#39ff14" style={{ filter: 'drop-shadow(0 0 8px #39ff14)' }} />
          </div>
          <div>
            <h1 style={{ color: '#fff', margin: 0, fontFamily: 'monospace', fontSize: '2.2rem', fontWeight: '900', letterSpacing: '4px', textShadow: '0 0 15px rgba(0,240,255,0.8)' }}>
              KYNTUS <span style={{ color: '#00f0ff' }}>BILLING ENGINE</span>
            </h1>
            <p style={{ color: '#38bdf8', margin: '5px 0 0 0', fontFamily: 'monospace', letterSpacing: '2px', fontSize: '0.9rem' }}>// AUTOMATED RULE-BASED PARAMETRAGE PROTOCOL</p>
          </div>
        </div>

        {/* MESSAGES D'ALERTE */}
        {successMsg && (
          <div className="hardware-accelerated" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem 1.5rem', backgroundColor: 'rgba(57, 255, 20, 0.1)', border: '1px solid #39ff14', borderRadius: '8px', marginBottom: '1.5rem', color: '#39ff14', fontFamily: 'monospace', fontWeight: 'bold', boxShadow: '0 0 20px rgba(57,255,20,0.2)' }}>
            <CheckCircle size={24} style={{ filter: 'drop-shadow(0 0 8px #39ff14)' }} /> <span>{successMsg}</span>
            <DownloadCloud size={20} style={{ marginLeft: 'auto', opacity: 0.8 }} />
          </div>
        )}
        {errorMsg && (
          <div className="hardware-accelerated" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem 1.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '1.5rem', color: '#ef4444', fontFamily: 'monospace', fontWeight: 'bold', boxShadow: '0 0 20px rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={24} style={{ filter: 'drop-shadow(0 0 8px #ef4444)' }} /> <span>{errorMsg}</span>
          </div>
        )}

        {/* DROPZONE */}
        <ParametrageDropzone onFileSelect={processFile} isProcessing={isProcessing} />

        {/* TABLEAU DES RESULTATS */}
        <ParametrageTable data={tableData} columns={tableColumns} />

      </div>
    </main>
  );
}