"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import SmartTable from "./components/SmartTable";
import FileUploadModal from "./ui/FileUploadModal"; 
import { Terminal, UploadCloud, CheckCircle, Search, X, Trash2, DownloadCloud, History, FileText, Calendar, Folder, ShieldAlert, Crosshair, Activity } from "lucide-react";
// 🔥 CYBER-SELECT OPTIMISÉ (Memoized pour éviter les re-renders inutiles)
const CyberSelect = React.memo(({ value, options, onChange, disabled, width = "150px", variant = "default" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = useMemo(() => options.find((o: any) => o.value === value)?.label || value, [options, value]);
  const themeColor = variant === "purple" ? "#a855f7" : "#0ff";
  const themeBg = variant === "purple" ? "rgba(168, 85, 247, 0.15)" : "rgba(0, 255, 255, 0.15)";

  return (
    <div ref={ref} style={{ position: "relative", width }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="mecha-element hardware-accelerated"
        style={{ 
          background: "rgba(10, 15, 30, 0.8)", border: `1px solid ${isOpen ? themeColor : "#334155"}`, 
          padding: "0.7rem 1rem", borderRadius: "4px", color: disabled ? "#475569" : (isOpen ? themeColor : "#e2e8f0"), 
          cursor: disabled ? "not-allowed" : "pointer", display: "flex", justifyContent: "space-between", 
          alignItems: "center", fontFamily: "monospace", transition: "all 0.2s ease-out", 
          boxShadow: isOpen ? `0 0 15px ${themeBg}` : "none", opacity: disabled ? 0.5 : 1 
        }}
      >
        <span style={{ fontWeight: "bold", textShadow: isOpen ? `0 0 8px ${themeColor}` : "none", letterSpacing: "1px" }}>{displayLabel}</span>
        <span style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)", fontSize: "0.8rem", color: isOpen ? themeColor : "#64748b", willChange: "transform" }}>▼</span>
      </div>
      
      {isOpen && !disabled && (
        <div 
          className="cyber-scroll hardware-accelerated"
          style={{ 
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: "8px", 
            background: "rgba(6, 11, 25, 0.95)", border: `1px solid ${themeColor}`, borderRadius: "4px", 
            maxHeight: "250px", overflowY: "auto", backdropFilter: "blur(10px)", 
            boxShadow: `0 20px 40px rgba(0,0,0,0.9), 0 0 15px ${themeBg}`, zIndex: 999999,
            willChange: "opacity, transform"
          }}
        >
          {options.map((opt: any) => (
            <div 
              key={opt.value} 
              onClick={() => { onChange(opt.value); setIsOpen(false); }} 
              style={{ padding: "0.8rem 1rem", color: "#e2e8f0", fontFamily: "monospace", cursor: "pointer", borderBottom: "1px solid rgba(51, 65, 85, 0.5)", transition: "all 0.15s ease-out" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = themeBg; e.currentTarget.style.color = themeColor;
                e.currentTarget.style.paddingLeft = "1.5rem"; e.currentTarget.style.textShadow = `0 0 8px ${themeColor}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#e2e8f0";
                e.currentTarget.style.paddingLeft = "1rem"; e.currentTarget.style.textShadow = "none";
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default function PilotRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingHistory, setIsExportingHistory] = useState(false); 

  const [globalCategory, setGlobalCategory] = useState<string>("RACC");
  const [globalYear, setGlobalYear] = useState<number>(new Date().getFullYear());
  const [globalMonth, setGlobalMonth] = useState<number>(new Date().getMonth() + 1);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  const [serverVersion, setServerVersion] = useState("");
  
  // 🔥 FIX 1: DEBOUNCE POUR LA RECHERCHE (Évite le lag en tapant)
  const [epsInputValue, setEpsInputValue] = useState("");
  const [serverEps, setServerEps] = useState("");
  
  const [dynamicVersions, setDynamicVersions] = useState<string[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyEpsInput, setHistoryEpsInput] = useState("");
  const [epsHistoryData, setEpsHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formattedMonth = useMemo(() => globalMonth.toString().padStart(2, '0'), [globalMonth]);

  // 🔥 DEBOUNCE EFFECT: Attend 400ms après la frappe avant de lancer la recherche
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setServerEps(epsInputValue);
      setPage(0); // Reset page quand on cherche
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [epsInputValue]);

  const fetchDynamicVersions = useCallback(async () => {
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/versions?category=${globalCategory}`);
      if (res.ok) setDynamicVersions(await res.json());
    } catch (error) {}
  }, [globalCategory]);

  const fetchRecords = useCallback(async () => {
    if (!globalYear || !globalMonth || !globalCategory) return;
    setLoading(true);
    try {
      let url = `http://kyntusos.kyntus.fr:8082/api/pilot-records/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}&page=${page}&size=${pageSize}`;
      if (serverVersion) url += `&version=${serverVersion}`;
      if (serverEps) url += `&eps=${serverEps}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.content || []); 
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || 0);
      }
    } catch (error) {} 
    finally { setLoading(false); }
  }, [globalCategory, globalYear, globalMonth, page, pageSize, serverVersion, serverEps]);

  useEffect(() => {
    fetchDynamicVersions();
    fetchRecords();
  }, [fetchDynamicVersions, fetchRecords]);

  // ... (Toutes les fonctions handleUpload, handleClearDB, handleExport restent identiques mais optimisées)
  const handleUpload = async (file: File, uploadYear: number, uploadMonth: number, uploadCategory: string) => {
    setIsUploading(true); 
    const formData = new FormData(); formData.append("file", file);
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/import/1?year=${uploadYear}&month=${uploadMonth}&category=${uploadCategory}`, { method: "POST", body: formData });
      if (res.ok) {
        setIsModalOpen(false); setSuccessMsg(`🚀 SYSTEM: Data [${uploadCategory}] injectée avec succès !`);
        setTimeout(() => setSuccessMsg(""), 5000); setGlobalCategory(uploadCategory); setGlobalYear(uploadYear); setGlobalMonth(uploadMonth); setPage(0);
        fetchRecords(); fetchDynamicVersions();
      }
    } catch (error) {} finally { setIsUploading(false); }
  };

  const handleClearDB = async () => {
    const isConfirmed = window.confirm(`🛑 SYSTEM OVERRIDE 🛑\n\nSupprimer DÉFINITIVEMENT les données [ ${globalCategory} - ${formattedMonth}/${globalYear} ] ?`);
    if (!isConfirmed) return;
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/clear?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg(`💥 SYSTEM: Blocs [ ${globalCategory} ] détruits.`);
        setTimeout(() => setSuccessMsg(""), 5000); setPage(0); setRecords([]); fetchDynamicVersions();
      }
    } catch (error) {}
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/export/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `Kyntus_Export_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`;
        document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        setSuccessMsg(`📥 SYSTEM: Matrice [ ${globalCategory} ] extraite !`); setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally { setIsExporting(false); }
  };

  const handleHistoryFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setIsExportingHistory(true); const formData = new FormData(); formData.append("file", file);
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/export-history/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`, { method: "POST", body: formData });
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `Historique_Target_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`;
        document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        setSuccessMsg(`🎯 SYSTEM: Historique généré !`); setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally { setIsExportingHistory(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const clearFilters = () => { setServerVersion(""); setEpsInputValue(""); setPage(0); };

  const fetchEpsHistory = async () => {
    if (!historyEpsInput) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/history/${historyEpsInput.trim()}?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) setEpsHistoryData(await res.json());
    } catch (error) {} finally { setLoadingHistory(false); }
  };

  // 🔥 FIX 2: MEMOIZATION DES ARRAYS POUR EVITER LES RENDERS
  const categoryOptions = useMemo(() => [ { value: "RACC", label: "SECTEUR: RACC" }, { value: "SAV", label: "SECTEUR: SAV" }, { value: "FTTH", label: "SECTEUR: FTTH" }, { value: "AUTRE", label: "SECTEUR: AUTRE" } ], []);
  const yearOptions = useMemo(() => [2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => ({ value: y, label: `YEAR: ${y}` })), []);
  const monthOptions = useMemo(() => Array.from({length: 12}, (_, i) => ({ value: i + 1, label: `MOIS: ${String(i + 1).padStart(2, '0')}` })), []);
  const versionOptions = useMemo(() => [{ value: "", label: "[ TOUTES VERSIONS ]" }, ...dynamicVersions.map(v => ({ value: v, label: `VERSION: ${v.toUpperCase()}` }))], [dynamicVersions]);

  return (
    <main className="cyber-main" style={{ padding: "2rem", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
      
      {/* 🚀🔥 BACKGROUND OPTIMISÉ GPU (360 FPS) */}
      <div className="cyber-bg hardware-accelerated">
        <div className="cyber-orb cyber-orb-1"></div>
        <div className="cyber-orb cyber-orb-2"></div>
        <div className="cyber-orb cyber-orb-3"></div>
        <div className="cyber-scanline"></div>
        <div className="cyber-grid-overlay"></div>
      </div>

      {/* 🔥 CSS MAGIQUE OPTIMISÉ POUR LA PERFORMANCE 🔥 */}
      <style>{`
        /* HARDWARE ACCELERATION CLASS */
        .hardware-accelerated {
          transform: translateZ(0);
          will-change: transform, opacity;
          backface-visibility: hidden;
        }

        .cyber-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; background-color: #030712; overflow: hidden; pointer-events: none; }
        .cyber-orb { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.5; will-change: transform; } 
        .cyber-orb-1 { width: 50vw; height: 50vw; top: -10%; left: -5%; background: radial-gradient(circle, rgba(0, 255, 255, 0.25) 0%, transparent 70%); animation: drift-1 15s infinite alternate linear; }
        .cyber-orb-2 { width: 60vw; height: 60vw; bottom: -15%; right: -10%; background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%); animation: drift-2 18s infinite alternate linear; }
        .cyber-orb-3 { width: 40vw; height: 40vw; top: 30%; left: 30%; background: radial-gradient(circle, rgba(57, 255, 20, 0.1) 0%, transparent 70%); animation: drift-3 20s infinite alternate linear; }
        .cyber-grid-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px); background-size: 50px 50px; animation: grid-move 20s linear infinite; will-change: transform; }
        .cyber-scanline { position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: rgba(0, 255, 255, 0.2); opacity: 0.5; animation: scanline 8s linear infinite; box-shadow: 0 0 10px rgba(0,255,255,0.3); will-change: transform; }

        /* Utilisation de translate3d pour forcer le GPU */
        @keyframes drift-1 { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(15%, 10%, 0) scale(1.1); } }
        @keyframes drift-2 { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(-15%, -10%, 0) scale(1.15); } }
        @keyframes drift-3 { 0% { transform: translate3d(0,0,0) scale(1); } 100% { transform: translate3d(-10%, 15%, 0) scale(1.05); } }
        @keyframes grid-move { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(50px, 50px, 0); } }
        @keyframes scanline { 0% { transform: translate3d(0, -10vh, 0); } 100% { transform: translate3d(0, 110vh, 0); } }
        
        /* 🔥 TRANSFORMER HOVER SYSTEM (OPTIMISÉ) 🔥 */
        .mecha-element {
          position: relative;
          transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.2s ease, background-color 0.2s ease;
          will-change: transform, box-shadow;
        }
        .mecha-element::before, .mecha-element::after {
          content: ''; position: absolute; width: 10px; height: 10px; border: 2px solid transparent;
          transition: width 0.3s ease, height 0.3s ease, opacity 0.2s ease; pointer-events: none; z-index: 10;
        }
        .mecha-element::before { top: -2px; left: -2px; border-top-color: rgba(0, 255, 255, 0.8); border-left-color: rgba(0, 255, 255, 0.8); opacity: 0; }
        .mecha-element::after { bottom: -2px; right: -2px; border-bottom-color: rgba(0, 255, 255, 0.8); border-right-color: rgba(0, 255, 255, 0.8); opacity: 0; }
        
        .mecha-element:hover {
          transform: translateY(-2px); /* Retiré le scale pour plus de fluidité */
          box-shadow: 0 5px 15px rgba(0, 255, 255, 0.2);
          background-color: rgba(15, 23, 42, 0.95) !important;
        }
        .mecha-element:hover::before, .mecha-element:hover::after { width: 30%; height: 50%; opacity: 1; }

        /* BOUTONS MECHA */
        .mecha-btn {
          position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px;
          padding: 0.7rem 1.2rem; background: rgba(10, 15, 30, 0.8); color: #e2e8f0; border: 1px solid #334155;
          font-family: monospace; font-weight: bold; cursor: pointer; text-transform: uppercase;
          letter-spacing: 1px; z-index: 2; border-radius: 4px;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
          will-change: transform;
        }
        .mecha-btn::after {
          content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 0; height: 2px; background: #fff; transition: width 0.2s ease;
        }
        .mecha-btn:hover::after { width: 80%; }
        .mecha-btn:active { transform: scale(0.96); }

        .btn-danger { color: #ef4444; border-color: rgba(239, 68, 68, 0.5); }
        .btn-danger:hover { background: rgba(239, 68, 68, 0.15); border-color: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); text-shadow: 0 0 5px #ef4444; transform: translateY(-2px); }
        .btn-danger::after { background: #ef4444; }
        
        .btn-success { color: #39ff14; border-color: rgba(57, 255, 20, 0.5); }
        .btn-success:hover { background: rgba(57, 255, 20, 0.15); border-color: #39ff14; box-shadow: 0 0 15px rgba(57, 255, 20, 0.4); text-shadow: 0 0 5px #39ff14; transform: translateY(-2px); }
        .btn-success::after { background: #39ff14; }
        
        .btn-info { color: #0ff; border-color: rgba(0, 255, 255, 0.5); }
        .btn-info:hover { background: rgba(0, 255, 255, 0.15); border-color: #0ff; box-shadow: 0 0 15px rgba(0, 255, 255, 0.4); text-shadow: 0 0 5px #0ff; transform: translateY(-2px); }
        .btn-info::after { background: #0ff; }
        
        .btn-warning { color: #facc15; border-color: rgba(250, 204, 21, 0.5); }
        .btn-warning:hover { background: rgba(250, 204, 21, 0.15); border-color: #facc15; box-shadow: 0 0 15px rgba(250, 204, 21, 0.4); text-shadow: 0 0 5px #facc15; transform: translateY(-2px); }
        .btn-warning::after { background: #facc15; }

        .btn-purple { color: #a855f7; border-color: rgba(168, 85, 247, 0.5); }
        .btn-purple:hover { background: rgba(168, 85, 247, 0.15); border-color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); text-shadow: 0 0 5px #a855f7; transform: translateY(-2px); }
        .btn-purple::after { background: #a855f7; }

        .cyber-input { background: rgba(10, 15, 30, 0.8); border: 1px solid #334155; color: #0ff; transition: all 0.2s ease; will-change: border-color, box-shadow; }
        .cyber-input:focus { border-color: #0ff; box-shadow: 0 0 15px rgba(0,255,255,0.2), inset 0 0 8px rgba(0,255,255,0.1); }
        .cyber-input::placeholder { color: rgba(0, 255, 255, 0.3); }

        .cyber-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .cyber-scroll::-webkit-scrollbar-track { background: rgba(2, 6, 23, 0.9); border-radius: 4px; }
        .cyber-scroll::-webkit-scrollbar-thumb { background: rgba(0, 255, 255, 0.4); border-radius: 4px; }
        .cyber-scroll::-webkit-scrollbar-thumb:hover { background: #0ff; }
      `}</style>

      {/* HEADER Z-INDEX 50 */}
      <div style={{ position: "relative", zIndex: 50 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "15px" }}>
          
          <div className="mecha-element hardware-accelerated" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 20px", borderRadius: "6px", background: "rgba(10, 15, 30, 0.6)", border: "1px solid rgba(0, 255, 255, 0.2)" }}>
            <Terminal size={36} color="#0ff" style={{ filter: "drop-shadow(0 0 5px #0ff)" }} />
            <div>
              <h1 style={{ color: "#e2e8f0", margin: 0, fontFamily: "monospace", fontSize: "1.8rem", letterSpacing: "3px", textShadow: "0 0 10px rgba(0,255,255,0.4)" }}>
                KYNTUS <span style={{ color: "#0ff", fontWeight: "900" }}>OS</span>
              </h1>
              <div style={{ color: "#39ff14", fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "2px", marginTop: "-2px" }}>● SYSTEM OPTIMIZED</div>
            </div>
          </div>

          <div className="mecha-element hardware-accelerated" style={{ display: "flex", alignItems: "center", gap: "12px", backgroundColor: "rgba(10, 15, 30, 0.8)", padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid rgba(0, 255, 255, 0.3)", boxShadow: "0 0 20px rgba(0,255,255,0.05)", backdropFilter: "blur(10px)" }}>
            <Folder size={20} color="#0ff" />
            <CyberSelect width="180px" value={globalCategory} options={categoryOptions} onChange={(val: string) => { setGlobalCategory(val); setPage(0); }} />
            <span style={{ color: "rgba(148, 163, 184, 0.4)", fontSize: "1.5rem", fontWeight: "100" }}>|</span>
            <Calendar size={20} color="#a855f7" />
            <CyberSelect width="130px" value={globalYear} options={yearOptions} onChange={setGlobalYear} variant="purple" />
            <span style={{ color: "rgba(148, 163, 184, 0.4)", fontSize: "1.5rem", fontWeight: "100" }}>/</span>
            <CyberSelect width="140px" value={globalMonth} options={monthOptions} onChange={setGlobalMonth} variant="purple" />
          </div>
          
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button className="mecha-btn btn-danger" onClick={handleClearDB}>
              <ShieldAlert size={18} /> DELETE [ {globalCategory} - {formattedMonth}/{globalYear} ]
            </button>
            <button className="mecha-btn btn-success" onClick={handleExport} disabled={isExporting}>
              <DownloadCloud size={18} /> {isExporting ? "PROCESSING..." : `EXPORT [ ${globalCategory} ]`}
            </button>
            <button className="mecha-btn btn-info" onClick={() => setIsModalOpen(true)}>
              <UploadCloud size={18} /> INJECT [ {globalCategory} ]
            </button>
            <input type="file" ref={fileInputRef} onChange={handleHistoryFileUpload} accept=".txt, .csv, .xlsx, .xls" style={{ display: 'none' }} />
            <button className="mecha-btn btn-warning" onClick={() => fileInputRef.current?.click()} disabled={isExportingHistory}>
              <Crosshair size={18} /> {isExportingHistory ? "SCANNING..." : "EXTRACT TARGETS"}
            </button>
          </div>
        </div>
      </div>

      {/* BARRE DE RECHERCHE Z-INDEX 40 */}
      <div className="mecha-element hardware-accelerated" style={{ display: "flex", gap: "15px", marginBottom: "2.5rem", padding: "1rem 1.5rem", backgroundColor: "rgba(10, 15, 30, 0.7)", border: "1px solid rgba(51, 65, 85, 0.5)", borderRadius: "6px", alignItems: "center", flexWrap: "wrap", backdropFilter: "blur(10px)", boxShadow: "0 5px 20px rgba(0,0,0,0.3)", position: "relative", zIndex: 40 }}>
        <Search size={22} color="#0ff" />
        <input 
          type="text" 
          placeholder="ENTER EPS REFERENCE..." 
          value={epsInputValue} // 🔥 FIX: On lie l'input à la valeur temporaire (Debounce)
          onChange={(e) => setEpsInputValue(e.target.value)} 
          className="cyber-input"
          style={{ padding: "0.7rem 1rem", borderRadius: "4px", outline: "none", width: "320px", fontFamily: "monospace", fontSize: "1rem" }} 
        />
        
        <CyberSelect width="280px" value={serverVersion} options={versionOptions} onChange={(val: string) => { setServerVersion(val); setPage(0); }} />
        
        {(serverVersion || epsInputValue) && (
          <button className="mecha-btn btn-danger" style={{ padding: "0.5rem 1rem" }} onClick={clearFilters}>
            <X size={18} /> CLEAR
          </button>
        )}

        <div style={{ marginLeft: "auto" }}>
          <button className="mecha-btn btn-purple" onClick={() => setIsHistoryModalOpen(true)}>
            <History size={18} /> TRACK TIMELINE [ {globalCategory} ]
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS & TABLE Z-INDEX 10 */}
      {successMsg && (
        <div style={{ position: "relative", zIndex: 10, marginBottom: "2rem", color: "#39ff14", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "12px", padding: "1rem", backgroundColor: "rgba(57,255,20,0.1)", border: "1px solid #39ff14", borderRadius: "6px", textShadow: "0 0 5px #39ff14", animation: "fade-in-up 0.3s ease" }}>
          <CheckCircle size={22} /> <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{successMsg}</span>
        </div>
      )}

      <div style={{ position: "relative", zIndex: 10 }}>
        {records.length > 0 ? (
          <SmartTable data={records} loading={loading} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalPages={totalPages} totalItems={totalItems} />
        ) : (
          <div className="mecha-element hardware-accelerated" style={{ textAlign: "center", padding: "8rem 2rem", backgroundColor: "rgba(10, 15, 30, 0.5)", borderRadius: "8px", border: "1px dashed rgba(0, 255, 255, 0.2)", backdropFilter: "blur(5px)" }}>
            <Terminal size={50} color="#475569" style={{ margin: "0 auto 1.5rem", opacity: 0.5 }} />
            <h2 style={{ color: "#e2e8f0", fontFamily: "monospace", fontSize: "1.6rem", marginBottom: "15px", letterSpacing: "2px" }}>NO DATA BLOCKS FOUND FOR [ {globalCategory} ]</h2>
            <p style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: "1.1rem" }}>System is empty for <span style={{ color: "#a855f7" }}>{formattedMonth}/{globalYear}</span>. Please trigger the INJECT MODULE.</p>
          </div>
        )}
      </div>
      
      {/* MODALS */}
      <FileUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUpload={handleUpload} isUploading={isUploading} defaultCategory={globalCategory} defaultYear={globalYear} defaultMonth={globalMonth} />

      {isHistoryModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(3, 7, 18, 0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999999, backdropFilter: "blur(8px)" }}>
          <div className="hardware-accelerated" style={{ backgroundColor: "rgba(10, 15, 30, 0.95)", border: "1px solid #a855f7", borderRadius: "8px", width: "700px", maxWidth: "95%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 0 40px rgba(168, 85, 247, 0.2)" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(168, 85, 247, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(90deg, rgba(168, 85, 247, 0.1), transparent)" }}>
              <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "10px", fontFamily: "monospace", letterSpacing: "1px" }}>
                <Crosshair color="#a855f7" size={24} /> 
                TIMELINE TRACKER : [ {globalCategory} ]
              </h2>
              <button onClick={() => { setIsHistoryModalOpen(false); setEpsHistoryData([]); setHistoryEpsInput(""); }} className="mecha-element" style={{ padding: "0.5rem", border: "1px solid transparent", background: "transparent", color: "#ef4444", borderRadius: "4px" }}><X size={26} /></button>
            </div>
            
            <div style={{ padding: "1.5rem", display: "flex", gap: "15px", background: "rgba(3, 7, 18, 0.5)", borderBottom: "1px solid #1e293b" }}>
              <input 
                type="text" placeholder="ENTER EXACT EPS REFERENCE..." 
                value={historyEpsInput} onChange={(e) => setHistoryEpsInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchEpsHistory()} 
                className="cyber-input"
                style={{ flex: 1, padding: "1rem", borderRadius: "4px", outline: "none", fontFamily: "monospace", fontSize: "1rem" }} 
              />
              <button className="mecha-btn btn-purple" onClick={fetchEpsHistory}>
                EXECUTE SCAN
              </button>
            </div>

            <div className="cyber-scroll hardware-accelerated" style={{ padding: "2rem", overflowY: "auto", flex: 1 }}>
              {loadingHistory && (
                <div style={{ textAlign: "center", marginTop: "3rem" }}>
                  <Activity size={40} color="#a855f7" style={{ margin: "0 auto 1rem", animation: "pulse-op 1s infinite" }} />
                  <p style={{ color: "#a855f7", fontFamily: "monospace", fontSize: "1.1rem" }}>SCANNING CORE DATABASES...</p>
                </div>
              )}
              
              {!loadingHistory && epsHistoryData.length === 0 && historyEpsInput && (
                <div style={{ textAlign: "center", marginTop: "3rem", padding: "2rem", border: "1px dashed #ef4444", background: "rgba(239,68,68,0.05)", borderRadius: "8px" }}>
                  <ShieldAlert size={40} color="#ef4444" style={{ margin: "0 auto 1rem" }} />
                  <p style={{ color: "#ef4444", fontFamily: "monospace", fontSize: "1.1rem" }}>ACCESS DENIED : NO RECORDS FOUND</p>
                </div>
              )}

              {!loadingHistory && epsHistoryData.length > 0 && (
                <div style={{ position: "relative", paddingLeft: "35px", borderLeft: "2px solid #1e293b", marginLeft: "20px" }}>
                  {epsHistoryData.map((item, index) => (
                    <div key={index} className="mecha-element hardware-accelerated" style={{ marginBottom: "2.5rem", position: "relative", padding: "15px", background: "transparent", border: "none", boxShadow: "none" }}>
                      <div style={{ position: "absolute", left: "-59px", top: "20px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: index === epsHistoryData.length - 1 ? "#39ff14" : "#a855f7", border: "3px solid #030712", boxShadow: index === epsHistoryData.length - 1 ? "0 0 15px #39ff14" : "0 0 10px #a855f7", zIndex: 2 }}></div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px" }}>
                        <span style={{ backgroundColor: index === epsHistoryData.length - 1 ? "rgba(57, 255, 20, 0.1)" : "rgba(168, 85, 247, 0.1)", color: index === epsHistoryData.length - 1 ? "#39ff14" : "#a855f7", padding: "4px 12px", borderRadius: "4px", fontSize: "0.9rem", fontWeight: "bold", border: index === epsHistoryData.length - 1 ? "1px solid rgba(57, 255, 20, 0.5)" : "1px solid rgba(168, 85, 247, 0.3)" }}>
                          {item.version}
                        </span>
                        <span style={{ color: "#94a3b8", fontSize: "0.9rem", fontFamily: "monospace", background: "rgba(15,23,42,0.8)", padding: "4px 10px", borderRadius: "4px", border: "1px solid #334155" }}>
                          {new Date(item.importedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={{ backgroundColor: "rgba(10, 15, 30, 0.9)", padding: "15px", borderRadius: "6px", color: "#f8fafc", fontSize: "1rem", borderLeft: `3px solid ${index === epsHistoryData.length - 1 ? "#39ff14" : "#a855f7"}`, borderTop: "1px solid #1e293b", borderRight: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
                        {item.commentaire || <span style={{ color: "#475569", fontStyle: "italic" }}>No data found in logs.</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}