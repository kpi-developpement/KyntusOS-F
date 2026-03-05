import React, { useState, useEffect } from 'react';
import { X, UploadCloud, Database } from 'lucide-react';
import CyberProgressBar from '../components/CyberProgressBar';

export default function FileUploadModal({ isOpen, onClose, onUpload, isUploading, defaultCategory, defaultYear, defaultMonth }: any) {
  const [file, setFile] = useState<File | null>(null);
  
  const [category, setCategory] = useState<string>(defaultCategory || "RACC");
  const [year, setYear] = useState<number>(defaultYear || new Date().getFullYear());
  const [month, setMonth] = useState<number>(defaultMonth || new Date().getMonth() + 1);

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("SYSTEM STANDBY...");

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setYear(defaultYear);
      setMonth(defaultMonth);
    }
  }, [isOpen, defaultCategory, defaultYear, defaultMonth]);

  useEffect(() => {
    if (!isOpen) { 
      setFile(null); 
      setProgress(0); 
      setStatusText("SYSTEM STANDBY..."); 
    }
  }, [isOpen]);

  // 🔥 L'INTELLIGENCE DE LA PROGRESS BAR (CHRONOMETRE + VITESSE REALISTE)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let startTime = Date.now();
    
    if (isUploading) {
      setProgress(2);
      setStatusText(`🚀 INITIALISATION UPLINK... (0s)`);

      interval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);

        setProgress((oldVal) => {
          if (oldVal >= 98) {
            setStatusText(`⚡ FINALISATION DB... VEUILLEZ PATIENTER (${elapsedSec}s)`);
            return 98; // Bloque à 98% au lieu de 95%
          }
          
          // Le texte change en fonction du temps écoulé, pas du pourcentage
          if (elapsedSec < 5) {
            setStatusText(`🔍 SCAN ET DECRYPTAGE DES PACKETS... (${elapsedSec}s)`);
          } else if (elapsedSec < 15) {
            setStatusText(`⚙️ HASHING ET FILTRAGE DES DOUBLONS... (${elapsedSec}s)`);
          } else if (elapsedSec < 30) {
            setStatusText(`🛡️ INJECTION MASSIVE EN COURS... (${elapsedSec}s)`);
          } else {
            setStatusText(`🔥 OPTIMISATION DES INDEX POSTGRES... (${elapsedSec}s)`);
          }

          // L'incrémentation est TRÈS lente, calibrée pour ne pas atteindre 95% avant 40 secondes
          const increment = (99 - oldVal) * 0.015 + 0.2; 
          return oldVal + increment;
        });
      }, 1000); // Mise à jour stricte chaque seconde pour le chrono
      
    } else if (!isUploading && progress > 0) {
      setProgress(100);
      setStatusText("✅ UPLOAD PROTOCOL COMPLETE !");
      setTimeout(() => setProgress(0), 2000);
    }
    
    return () => clearInterval(interval);
  }, [isUploading]);

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(3, 7, 18, 0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(8px)" }}>
      <div style={{ backgroundColor: "#0b1121", border: "1px solid #38bdf8", borderRadius: "12px", width: "550px", maxWidth: "90%", padding: "2.5rem", boxShadow: "0 0 40px rgba(56, 189, 248, 0.15)", position: "relative", overflow: "hidden" }}>
        
        {/* LIGNES DE DECORATION CYBER */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(90deg, transparent, #38bdf8, transparent)" }}></div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h2 style={{ color: "#f8fafc", margin: 0, fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", letterSpacing: "0.5px" }}>
            <Database color="#38bdf8" size={28} /> IMPORT SYSTEM
          </h2>
          <button onClick={onClose} disabled={isUploading} style={{ background: "transparent", border: "none", color: isUploading ? "#334155" : "#94a3b8", cursor: isUploading ? "not-allowed" : "pointer", transition: "color 0.2s" }} onMouseEnter={(e) => !isUploading && (e.currentTarget.style.color = "#f8fafc")} onMouseLeave={(e) => !isUploading && (e.currentTarget.style.color = "#94a3b8")}><X size={28} /></button>
        </div>

        <div style={{ display: "flex", gap: "10px", backgroundColor: "#0f172a", padding: "1rem", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "2rem", justifyContent: "center" }}>
           <span style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold" }}>TARGET: [{category}]</span>
           <span style={{ color: "#475569" }}>|</span>
           <span style={{ color: "#c084fc", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold" }}>DATE: {String(month).padStart(2, '0')}/{year}</span>
        </div>

        {!isUploading && (
          <div 
            style={{ border: "2px dashed #334155", borderRadius: "8px", padding: "3rem 1rem", textAlign: "center", cursor: "pointer", backgroundColor: file ? "rgba(56, 189, 248, 0.05)" : "rgba(15, 23, 42, 0.5)", transition: "all 0.2s ease" }} 
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#38bdf8"} 
            onMouseLeave={(e) => e.currentTarget.style.borderColor = file ? "#38bdf8" : "#334155"} 
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <input type="file" id="fileInput" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <UploadCloud size={40} color={file ? "#38bdf8" : "#475569"} style={{ margin: "0 auto 10px", transition: "all 0.3s" }} />
            {file ? (
              <p style={{ color: "#38bdf8", margin: 0, fontFamily: "monospace", wordBreak: "break-all", fontSize: "1.1rem" }}>{file.name}</p>
            ) : (
              <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.95rem" }}>Cliquez pour sélectionner un fichier Excel</p>
            )}
          </div>
        )}

        {(isUploading || progress > 0) && <CyberProgressBar progress={progress} statusText={statusText} />}

        {!isUploading && (
          <button 
            onClick={() => onUpload(file, year, month, category)} 
            disabled={!file} 
            style={{ 
              width: "100%", 
              backgroundColor: file ? "#38bdf8" : "#0f172a", 
              color: file ? "#0f172a" : "#475569", 
              border: file ? "1px solid #38bdf8" : "1px solid #1e293b", 
              padding: "1rem", 
              borderRadius: "6px", 
              cursor: file ? "pointer" : "not-allowed", 
              fontWeight: "600", 
              marginTop: "2rem", 
              fontSize: "1rem",
              transition: "all 0.2s ease"
            }}
          >
            {file ? `LANCER L'IMPORTATION DANS [ ${category} ]` : "EN ATTENTE DU FICHIER..."}
          </button>
        )}
      </div>
    </div>
  );
}