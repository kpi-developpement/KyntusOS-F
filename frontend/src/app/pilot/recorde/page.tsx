"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import SmartTable from "./components/SmartTable";
import FileUploadModal from "./ui/FileUploadModal"; 
import { Terminal, UploadCloud, CheckCircle, Search, X, DownloadCloud, History, Calendar, Folder, ShieldAlert, Crosshair, Activity, LayoutDashboard, Database, Cpu, AlertTriangle, ShieldCheck, MessageSquare } from "lucide-react";

const API_BASE = "http://kyntusos.kyntus.fr:8082"; 

// 🔥 CYBER SELECT (COMPACT & SHARP)
const CyberSelect = React.memo(({ value, options, onChange, disabled, width = "130px", variant = "default" }: any) => {
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
  const themeColor = variant === "purple" ? "#d8b4fe" : (variant === "green" ? "#86efac" : "#00f0ff");
  const themeGlow = variant === "purple" ? "#ff00ff" : (variant === "green" ? "#00ff41" : "#00f0ff");
  const themeBg = variant === "purple" ? "rgba(255, 0, 255, 0.15)" : (variant === "green" ? "rgba(0, 255, 65, 0.15)" : "rgba(0, 240, 255, 0.15)");

  return (
    <div ref={ref} style={{ position: "relative", width }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="mecha-element target-bracket"
        style={{ 
          backgroundColor: "rgba(6, 11, 25, 0.8)", border: `1px solid ${isOpen ? themeGlow : "rgba(148, 163, 184, 0.3)"}`, 
          padding: "0.5rem 0.8rem", borderRadius: "4px", color: disabled ? "#64748b" : (isOpen ? "#fff" : themeColor), 
          cursor: disabled ? "not-allowed" : "pointer", display: "flex", justifyContent: "space-between", 
          alignItems: "center", fontFamily: "monospace", fontSize: "0.85rem", transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)", 
          boxShadow: isOpen ? `0 0 15px ${themeBg}, inset 0 0 5px ${themeBg}` : "inset 0 0 5px rgba(0,0,0,0.8)", opacity: disabled ? 0.6 : 1,
          backdropFilter: "blur(12px)"
        }}
      >
        <span style={{ fontWeight: "bold", textShadow: isOpen ? `0 0 8px ${themeGlow}` : "none", letterSpacing: "1px" }}>{displayLabel || "SELECT..."}</span>
        <span style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.4s ease", fontSize: "0.75rem", color: isOpen ? themeGlow : "#94a3b8" }}>▼</span>
      </div>
      
      {isOpen && !disabled && (
        <div 
          className="cyber-scroll hardware-accelerated"
          style={{ 
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: "8px", 
            backgroundColor: "rgba(2, 6, 23, 0.98)", border: `1px solid ${themeGlow}`, borderRadius: "4px", 
            maxHeight: "220px", overflowY: "auto", backdropFilter: "blur(30px)", 
            boxShadow: `0 20px 40px rgba(0,0,0,0.9), 0 0 20px ${themeBg}`, zIndex: 999999,
          }}
        >
          {options.map((opt: any) => (
            <div 
              key={opt.value} 
              onClick={() => { onChange(opt.value); setIsOpen(false); }} 
              style={{ padding: "0.6rem 0.8rem", color: "#cbd5e1", fontFamily: "monospace", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid rgba(148, 163, 184, 0.1)", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = themeBg; e.currentTarget.style.color = "#fff";
                e.currentTarget.style.paddingLeft = "1.2rem"; e.currentTarget.style.textShadow = `0 0 8px ${themeGlow}`;
                e.currentTarget.style.borderLeft = `3px solid ${themeGlow}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#cbd5e1";
                e.currentTarget.style.paddingLeft = "0.8rem"; e.currentTarget.style.textShadow = "none";
                e.currentTarget.style.borderLeft = `0px solid transparent`;
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
  
  // 🔥 L'ÉTAT D'UPLOADING POUR L'UI "MACHINE GUN" 🔥
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  
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
  const [epsInputValue, setEpsInputValue] = useState("");
  const [serverEps, setServerEps] = useState("");
  
  const [dynamicVersions, setDynamicVersions] = useState<string[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyEpsInput, setHistoryEpsInput] = useState("");
  const [epsHistoryData, setEpsHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [validationAlerts, setValidationAlerts] = useState<string[]>([]);
  const [commentAlerts, setCommentAlerts] = useState<string[]>([]);
  const [isScanningAlerts, setIsScanningAlerts] = useState(false);
  
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [showCommentDetails, setShowCommentDetails] = useState(false);
  
  const [isExportingAlerts, setIsExportingAlerts] = useState(false); 
  const [isExportingComments, setIsExportingComments] = useState(false); 

  const bgOverlayRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const glowRef = useRef<HTMLDivElement>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const formattedMonth = useMemo(() => globalMonth.toString().padStart(2, '0'), [globalMonth]);

  const changeBgTheme = useCallback((color: string) => {
    if (bgOverlayRef.current) {
      bgOverlayRef.current.style.backgroundColor = color;
    }
  }, []);

  // 🚀🔥 L'INTERACTION MAGIQUE (Zéro Lag + Input Fixed)
  useEffect(() => {
    let animationFrameId: number;
    const handleMouseMove = (e: MouseEvent) => {
      animationFrameId = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${e.clientX - 200}px, ${e.clientY - 200}px, 0)`;
        }
        if (mainRef.current) {
          const x = e.clientX / window.innerWidth;
          const y = e.clientY / window.innerHeight;
          mainRef.current.style.setProperty('--mouse-x', x.toFixed(3));
          mainRef.current.style.setProperty('--mouse-y', y.toFixed(3));
        }
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => { setServerEps(epsInputValue); setPage(0); }, 400);
    return () => clearTimeout(timeoutId);
  }, [epsInputValue]);

  // 🔥 FETCH LES 2 ALERTS EN PARALLÈLE
  const fetchAlertsData = useCallback(async (cat: string, yr: number, mo: number) => {
    setIsScanningAlerts(true);
    setValidationAlerts([]);
    setCommentAlerts([]);
    setShowValidationDetails(false);
    setShowCommentDetails(false);
    try {
      const [resVal, resCom] = await Promise.all([
        fetch(`${API_BASE}/api/pilot-records/alerts?category=${cat}&year=${yr}&month=${mo}`),
        fetch(`${API_BASE}/api/pilot-records/alerts-comments?category=${cat}&year=${yr}&month=${mo}`)
      ]);
      if (resVal.ok) setValidationAlerts(await resVal.json() || []);
      if (resCom.ok) setCommentAlerts(await resCom.json() || []);
    } catch (e) {
      setValidationAlerts([]);
      setCommentAlerts([]);
    } finally { 
      setIsScanningAlerts(false); 
    }
  }, []);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pilot-records/versions?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
        if (res.ok) setDynamicVersions(await res.json());
      } catch (error) {}
    };
    
    setRecords([]); setServerVersion(""); setPage(0);
    fetchVersions();
    fetchAlertsData(globalCategory, globalYear, globalMonth);
  }, [globalCategory, globalYear, globalMonth, fetchAlertsData]);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!globalYear || !globalMonth || !globalCategory) return;
      setLoading(true); 
      try {
        let url = `${API_BASE}/api/pilot-records/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}&page=${page}&size=${pageSize}`;
        if (serverVersion) url += `&version=${serverVersion}`;
        if (serverEps) url += `&eps=${serverEps}`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setRecords(data.content || []); setTotalPages(data.totalPages || 0); setTotalItems(data.totalItems || 0);
        }
      } catch (error) {} finally { setLoading(false); } 
    };
    fetchRecords();
  }, [globalCategory, globalYear, globalMonth, page, pageSize, serverVersion, serverEps]);

  // 🔥 THE NEW "MACHINE GUN" BATCH UPLOAD (SEQUENTIAL) 🔥
  const handleUpload = async (filesToUpload: File[], uploadYear: number, uploadMonth: number, uploadCategory: string) => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    setIsUploading(true); 
    setUploadProgressText(`INITIALIZING BATCH UPLOAD... (0/${filesToUpload.length})`);
    
    try {
      const sortedFiles = [...filesToUpload].sort((a, b) => {
        const matchA = a.name.match(/^(\d+)-/); const matchB = b.name.match(/^(\d+)-/);
        const numA = matchA ? parseInt(matchA[1], 10) : 999999;
        const numB = matchB ? parseInt(matchB[1], 10) : 999999;
        return numA - numB;
      });

      // Send 1 by 1 sequentially so the server processes fast and zero memory issues
      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        setUploadProgressText(`INJECTING PAYLOAD ${i + 1}/${sortedFiles.length} : ${file.name}`);
        
        const formData = new FormData(); 
        formData.append("file", file); // ⚠️ L'Backend controller kaytsena "file" (MultipartFile)
        
        await fetch(`${API_BASE}/api/pilot-records/import/1?year=${uploadYear}&month=${uploadMonth}&category=${uploadCategory}`, { 
          method: "POST", body: formData 
        });
      }

      setIsModalOpen(false); 
      setSuccessMsg(`🚀 ${sortedFiles.length} BATCH FILES INJECTED RAPIDLY!`);
      setTimeout(() => setSuccessMsg(""), 5000); 
      
      if (globalCategory === uploadCategory && globalYear === uploadYear && globalMonth === uploadMonth) {
        setRecords([]); setServerVersion(""); setPage(0);
        const vRes = await fetch(`${API_BASE}/api/pilot-records/versions?category=${uploadCategory}&year=${uploadYear}&month=${uploadMonth}`);
        if (vRes.ok) setDynamicVersions(await vRes.json());
        fetchAlertsData(uploadCategory, uploadYear, uploadMonth);
      } else {
        setGlobalCategory(uploadCategory); setGlobalYear(uploadYear); setGlobalMonth(uploadMonth);
      }
    } catch (error) {
      console.error("BATCH UPLOAD CRITICAL ERROR:", error);
    } finally { 
      setIsUploading(false); 
      setUploadProgressText("");
    }
  };

  const handleClearDB = async () => {
    if (!window.confirm(`🛑 CRITICAL OVERRIDE 🛑\n\nPURGE FOR SECTOR [ ${globalCategory} - ${formattedMonth}/${globalYear} ] ?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/clear?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg(`💥 SYSTEM: Sector [ ${globalCategory} ] obliterated.`);
        setTimeout(() => setSuccessMsg(""), 5000); setPage(0); setRecords([]); setDynamicVersions([]); setServerVersion(""); setValidationAlerts([]); setCommentAlerts([]);
      }
    } catch (error) {}
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/export/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `Matrix_Export_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        setSuccessMsg(`📥 SYSTEM: Matrix [ ${globalCategory} ] Extracted!`); setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally { setIsExporting(false); }
  };

  const handleExportValidationAlerts = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsExportingAlerts(true);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/export-alerts?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `Anomalies_Statut_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        setSuccessMsg(`🚨 STATUS ANOMALIES EXTRACTED SUCCESSFULLY!`); setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally { setIsExportingAlerts(false); }
  };

  const handleExportCommentAlerts = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    setIsExportingComments(true);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/export-alerts-comments?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `Anomalies_Commentaires_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        setSuccessMsg(`🟠 COMMENTS ANOMALIES EXTRACTED SUCCESSFULLY!`); setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally { setIsExportingComments(false); }
  };

  const handleHistoryFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setIsExportingHistory(true); const formData = new FormData(); formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/export-history/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`, { method: "POST", body: formData });
      if (res.ok) {
        const blob = await res.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `Timeline_Target_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        setSuccessMsg(`🎯 SYSTEM: Quantum Timeline Extracted!`); setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally { setIsExportingHistory(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const clearFilters = () => { setServerVersion(""); setEpsInputValue(""); setPage(0); };

  const fetchEpsHistory = async () => {
    if (!historyEpsInput) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/history/${historyEpsInput.trim()}?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) setEpsHistoryData(await res.json());
    } catch (error) {} finally { setLoadingHistory(false); }
  };

  const categoryOptions = useMemo(() => [ { value: "RACC", label: "CAT: RACC" }, { value: "SAV", label: "CAT: SAV" }, { value: "FTTH", label: "CAT: FTTH" }, { value: "AUTRE", label: "CAT: AUTRE" } ], []);
  const yearOptions = useMemo(() => [2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => ({ value: y, label: `${y}` })), []);
  const monthOptions = useMemo(() => Array.from({length: 12}, (_, i) => ({ value: i + 1, label: `M-${String(i + 1).padStart(2, '0')}` })), []);
  const versionOptions = useMemo(() => [{ value: "", label: "[ ALL ]" }, ...dynamicVersions.map(v => ({ value: v, label: `${v}` }))], [dynamicVersions]);

  return (
    <main 
      ref={mainRef}
      style={{ padding: "1.5rem", minHeight: "100vh", position: "relative", overflowX: "hidden", cursor: "crosshair", "--mouse-x": "0.5", "--mouse-y": "0.5" } as React.CSSProperties}
    >
      {/* 🌌 BACKGROUND VIVID ANIMATED 🌌 */}
      <div className="dynamic-hue" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: -2, backgroundImage: "linear-gradient(135deg, #020617, #08122a, #000c17, #130321)", backgroundSize: "200% 200%", animation: "vivid-gradient 30s ease infinite" }}>
        <div style={{ position: "absolute", top: "-50%", left: "-50%", width: "200%", height: "200%", perspective: "1000px" }}>
           <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(0, 240, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.15) 1px, transparent 1px)", backgroundSize: "60px 60px", transformOrigin: "center center", animation: "grid-flow 6s linear infinite" }}></div>
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%)", backgroundSize: "100% 3px", pointerEvents: "none" }}></div>
      </div>

      <div ref={glowRef} style={{ position: "fixed", top: 0, left: 0, width: "400px", height: "400px", backgroundImage: "radial-gradient(circle, rgba(0, 240, 255, 0.12) 0%, rgba(168, 85, 247, 0.05) 40%, transparent 70%)", borderRadius: "50%", pointerEvents: "none", zIndex: -1, willChange: "transform", mixBlendMode: "screen" }}></div>

      <style>{`
        .tilt-panel { transition: transform 0.2s ease-out; transform: perspective(1000px) rotateX(calc((var(--mouse-y) - 0.5) * -3deg)) rotateY(calc((var(--mouse-x) - 0.5) * 3deg)); }
        .dynamic-hue { filter: hue-rotate(calc((var(--mouse-x) - 0.5) * 60deg)); transition: filter 0.2s ease-out; }
        .hardware-accelerated { transform: translateZ(0); will-change: transform, opacity; backface-visibility: hidden; }
        
        @keyframes grid-flow { 0% { transform: rotateX(60deg) scale(2.5) translateY(0); } 100% { transform: rotateX(60deg) scale(2.5) translateY(60px); } }
        @keyframes vivid-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes radar-spin { 100% { transform: rotate(360deg); } }
        @keyframes radar-spin-reverse { 100% { transform: rotate(-360deg); } }
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes pulse-neon { 0%, 100% { opacity: 1; text-shadow: 0 0 15px rgba(0,240,255,0.8); } 50% { opacity: 0.6; text-shadow: 0 0 5px rgba(0,240,255,0.3); } }
        
        @keyframes blink-alert-red { 0%, 100% { box-shadow: inset 0 0 30px rgba(255, 0, 60, 0.4), 0 0 20px rgba(255, 0, 60, 0.3); border-color: rgba(255,0,60,1); background-color: rgba(255, 0, 60, 0.1); } 50% { box-shadow: inset 0 0 5px rgba(255, 0, 60, 0.1); border-color: rgba(255,0,60,0.3); background-color: rgba(10, 15, 30, 0.8); } }
        @keyframes blink-alert-orange { 0%, 100% { box-shadow: inset 0 0 30px rgba(245, 158, 11, 0.4), 0 0 20px rgba(245, 158, 11, 0.3); border-color: rgba(245, 158, 11, 1); background-color: rgba(245, 158, 11, 0.1); } 50% { box-shadow: inset 0 0 5px rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.3); background-color: rgba(10, 15, 30, 0.8); } }
        @keyframes glitch-text { 0% { transform: translate(0); } 20% { transform: translate(-1px, 1px); } 40% { transform: translate(-1px, -1px); } 60% { transform: translate(1px, 1px); } 80% { transform: translate(1px, -1px); } 100% { transform: translate(0); } }
        
        .mecha-element { position: relative; transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease, background-color 0.3s ease; will-change: transform, box-shadow; }
        
        .target-bracket::before, .target-bracket::after { content: ''; position: absolute; width: 12px; height: 12px; border: 2px solid transparent; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none; z-index: 10; }
        .target-bracket::before { top: -2px; left: -2px; border-top-color: #00f0ff; border-left-color: #00f0ff; opacity: 0; }
        .target-bracket::after { bottom: -2px; right: -2px; border-bottom-color: #00f0ff; border-right-color: #00f0ff; opacity: 0; }
        .target-bracket:hover::before, .target-bracket:hover::after { width: 25%; height: 40%; opacity: 1; filter: drop-shadow(0 0 5px #00f0ff); }
        .target-bracket:hover { box-shadow: 0 10px 25px rgba(0, 240, 255, 0.15); background-color: rgba(15, 23, 42, 0.95) !important; }

        .mecha-btn { position: relative; overflow: hidden; display: flex; align-items: center; gap: 8px; padding: 0.6rem 1.2rem; background-color: rgba(10, 15, 30, 0.85); color: #fff; border: 1px solid rgba(255,255,255,0.15); font-family: monospace; font-size: 0.85rem; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; z-index: 2; border-radius: 4px; transition: all 0.2s ease; backdrop-filter: blur(10px); }
        .mecha-btn::before { content: ''; position: absolute; top: 0; left: -100%; width: 30%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); transition: left 0.4s ease; z-index: -1; }
        .mecha-btn:hover::before { left: 120%; }
        .mecha-btn::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 0; height: 2px; background-color: #fff; transition: width 0.2s ease; }
        .mecha-btn:hover::after { width: 80%; }
        .mecha-btn:active { transform: scale(0.96); }

        .btn-danger { border-color: rgba(255, 0, 60, 0.5); color: #ff4d4d; }
        .btn-danger:hover { background-color: rgba(255, 0, 60, 0.15); border-color: #ff003c; color: #fff; box-shadow: 0 0 15px rgba(255, 0, 60, 0.4); text-shadow: 0 0 5px #ff003c; }
        .btn-success { border-color: rgba(0, 255, 65, 0.5); color: #00ff41; }
        .btn-success:hover { background-color: rgba(0, 255, 65, 0.15); border-color: #00ff41; color: #fff; box-shadow: 0 0 15px rgba(0, 255, 65, 0.4); text-shadow: 0 0 5px #00ff41; }
        .btn-info { border-color: rgba(0, 240, 255, 0.5); color: #00f0ff; }
        .btn-info:hover { background-color: rgba(0, 240, 255, 0.15); border-color: #00f0ff; color: #fff; box-shadow: 0 0 15px rgba(0, 240, 255, 0.4); text-shadow: 0 0 5px #00f0ff; }
        .btn-warning { border-color: rgba(255, 215, 0, 0.5); color: #ffd700; }
        .btn-warning:hover { background-color: rgba(255, 215, 0, 0.15); border-color: #ffd700; color: #fff; box-shadow: 0 0 15px rgba(255, 215, 0, 0.4); text-shadow: 0 0 5px #ffd700; }
        .btn-purple { border-color: rgba(168, 85, 247, 0.5); color: #d8b4fe; }
        .btn-purple:hover { background-color: rgba(168, 85, 247, 0.15); border-color: #ff00ff; color: #fff; box-shadow: 0 0 15px rgba(255, 0, 255, 0.4); text-shadow: 0 0 5px #ff00ff; }

        .btn-emergency-red { background-image: repeating-linear-gradient(45deg, rgba(255,0,60,0.7), rgba(255,0,60,0.7) 10px, rgba(200,0,30,0.8) 10px, rgba(200,0,30,0.8) 20px); border: 1px solid #ff003c; color: #fff; font-size: 0.8rem; padding: 0.5rem 1rem; }
        .btn-emergency-red:hover { background-image: repeating-linear-gradient(45deg, rgba(255,0,60,0.9), rgba(255,0,60,0.9) 10px, rgba(255,50,80,0.9) 10px, rgba(255,50,80,0.9) 20px); box-shadow: 0 0 20px rgba(255,0,60,0.6); border-color: #fff; }
        
        .btn-emergency-orange { background-image: repeating-linear-gradient(45deg, rgba(245,158,11,0.7), rgba(245,158,11,0.7) 10px, rgba(180,83,9,0.8) 10px, rgba(180,83,9,0.8) 20px); border: 1px solid #f59e0b; color: #fff; font-size: 0.8rem; padding: 0.5rem 1rem; }
        .btn-emergency-orange:hover { background-image: repeating-linear-gradient(45deg, rgba(245,158,11,0.9), rgba(245,158,11,0.9) 10px, rgba(217,119,6,0.9) 10px, rgba(217,119,6,0.9) 20px); box-shadow: 0 0 20px rgba(245,158,11,0.6); border-color: #fff; }

        .cyber-input { background-color: rgba(6, 11, 25, 0.8); border: 1px solid rgba(148, 163, 184, 0.3); color: #fff; padding: 0.6rem 0.8rem; border-radius: 4px; font-family: monospace; font-size: 0.9rem; outline: none; transition: all 0.2s ease; box-shadow: inset 0 0 5px rgba(0,0,0,0.5); }
        .cyber-input:focus { border-color: #00f0ff; box-shadow: 0 0 15px rgba(0,240,255,0.4), inset 0 0 8px rgba(0,240,255,0.2); }
        .cyber-input::placeholder { color: rgba(148, 163, 184, 0.5); font-weight: normal; }

        .cyber-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .cyber-scroll::-webkit-scrollbar-track { background-color: rgba(6, 11, 25, 0.9); border-radius: 4px; }
        .cyber-scroll::-webkit-scrollbar-thumb { background-color: rgba(0, 240, 255, 0.4); border-radius: 4px; }
        .cyber-scroll::-webkit-scrollbar-thumb:hover { background-color: #00f0ff; }

        .warning-stripes-red { background-image: repeating-linear-gradient( 45deg, rgba(255, 0, 60, 0.15), rgba(255, 0, 60, 0.15) 15px, rgba(10, 15, 30, 0.95) 15px, rgba(10, 15, 30, 0.95) 30px ); }
        .warning-stripes-orange { background-image: repeating-linear-gradient( 45deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.15) 15px, rgba(10, 15, 30, 0.95) 15px, rgba(10, 15, 30, 0.95) 30px ); }
      `}</style>

      {/* TOP COMMAND CENTER HUD */}
      <div className="tilt-panel" style={{ position: "relative", zIndex: 50, marginBottom: "1.5rem", maxWidth: "1400px", margin: "0 auto 1.5rem" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px", borderBottom: "1px solid rgba(0,240,255,0.3)", paddingBottom: "15px", boxShadow: "0 10px 15px -10px rgba(0,240,255,0.2)" }}>
          <div className="dynamic-hue" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <LayoutDashboard size={32} color="#00f0ff" style={{ filter: "drop-shadow(0 0 10px #00f0ff)" }} />
            <div>
              <h1 style={{ color: "#fff", margin: 0, fontFamily: "monospace", fontSize: "1.8rem", letterSpacing: "5px", textShadow: "0 0 15px rgba(0,240,255,0.9)" }}>
                KYNTUS <span style={{ color: "#00f0ff", fontWeight: "900" }}>NEXUS</span>
              </h1>
              <div style={{ color: "#00ff41", fontSize: "0.75rem", fontFamily: "monospace", letterSpacing: "3px", marginTop: "2px", fontWeight: "bold", textShadow: "0 0 5px #00ff41" }}>● CORE V2090 SECURE</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", backgroundColor: "rgba(10, 15, 30, 0.6)", padding: "10px", border: "1px solid rgba(148,163,184,0.3)", backdropFilter: "blur(15px)", borderRadius: "8px", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
            <button className="mecha-btn btn-danger" onClick={handleClearDB} onMouseEnter={() => changeBgTheme("rgba(255, 0, 60, 0.15)")} onMouseLeave={() => changeBgTheme("transparent")}><ShieldAlert size={16} /> PURGE DB</button>
            <button className="mecha-btn btn-success" onClick={handleExport} disabled={isExporting} onMouseEnter={() => changeBgTheme("rgba(0, 255, 65, 0.1)")} onMouseLeave={() => changeBgTheme("transparent")}><DownloadCloud size={16} /> {isExporting ? "ENCRYPTING..." : `EXTRACT`}</button>
            <button className="mecha-btn btn-info" onClick={() => setIsModalOpen(true)} onMouseEnter={() => changeBgTheme("rgba(0, 240, 255, 0.1)")} onMouseLeave={() => changeBgTheme("transparent")}><UploadCloud size={16} /> INJECT BATCH</button>
            <input type="file" ref={fileInputRef} onChange={handleHistoryFileUpload} accept=".txt, .csv, .xlsx, .xls" style={{ display: 'none' }} />
            <button className="mecha-btn btn-warning" onClick={() => fileInputRef.current?.click()} disabled={isExportingHistory} onMouseEnter={() => changeBgTheme("rgba(255, 215, 0, 0.1)")} onMouseLeave={() => changeBgTheme("transparent")}><Crosshair size={16} /> TRACK</button>
          </div>
        </div>

        {/* CORE MATRIX FILTERS (HUB) */}
        <div style={{ display: "flex", gap: "15px", marginTop: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="target-bracket hardware-accelerated dynamic-hue" style={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "rgba(10, 15, 30, 0.8)", padding: "0.8rem 1.2rem", border: "1px solid rgba(255, 0, 255, 0.5)", boxShadow: "inset 0 0 15px rgba(255, 0, 255, 0.15), 0 0 15px rgba(255, 0, 255, 0.2)", backdropFilter: "blur(15px)", borderRadius: "6px" }}>
            <Folder size={20} color="#ff00ff" style={{ filter: "drop-shadow(0 0 5px #ff00ff)" }} />
            <CyberSelect width="130px" value={globalCategory} options={categoryOptions} onChange={(val: string) => { setGlobalCategory(val); }} variant="purple" />
            <span style={{ color: "rgba(148, 163, 184, 0.5)", fontSize: "1.2rem", fontWeight: "100", margin: "0 5px" }}>/</span>
            <Calendar size={20} color="#00ff41" style={{ filter: "drop-shadow(0 0 5px #00ff41)" }} />
            <CyberSelect width="100px" value={globalYear} options={yearOptions} onChange={setGlobalYear} variant="green" />
            <CyberSelect width="100px" value={globalMonth} options={monthOptions} onChange={setGlobalMonth} variant="green" />
          </div>
          <div className="target-bracket hardware-accelerated dynamic-hue" style={{ display: "flex", gap: "10px", padding: "0.8rem 1.2rem", backgroundColor: "rgba(10, 15, 30, 0.8)", border: "1px solid rgba(0, 240, 255, 0.5)", boxShadow: "inset 0 0 15px rgba(0, 240, 255, 0.15), 0 0 15px rgba(0, 240, 255, 0.2)", alignItems: "center", backdropFilter: "blur(15px)", borderRadius: "6px", flex: 1, minWidth: "300px" }}>
            <Search size={20} color="#00f0ff" style={{ filter: "drop-shadow(0 0 5px #00f0ff)" }} />
            <input type="text" placeholder="EPS ID..." value={epsInputValue} onChange={(e) => setEpsInputValue(e.target.value)} className="cyber-input" style={{ flex: 1 }} />
            <CyberSelect width="160px" value={serverVersion} options={versionOptions} onChange={(val: string) => { setServerVersion(val); setPage(0); }} />
            {(serverVersion || epsInputValue) && ( 
              <button className="mecha-btn btn-danger" style={{ padding: "0.5rem 0.8rem", fontSize: "0.75rem" }} onClick={clearFilters} onMouseEnter={() => changeBgTheme("rgba(255, 0, 60, 0.1)")} onMouseLeave={() => changeBgTheme("transparent")}><X size={14} /> RESET</button> 
            )}
          </div>
          <div>
            <button className="mecha-btn btn-purple" style={{ padding: "1rem 1.8rem", fontSize: "0.95rem", boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)" }} onClick={() => setIsHistoryModalOpen(true)} onMouseEnter={() => changeBgTheme("rgba(168, 85, 247, 0.15)")} onMouseLeave={() => changeBgTheme("transparent")}>
              <History size={20} /> TIMELINE
            </button>
          </div>
        </div>
      </div>

      <div className="tilt-panel" style={{ maxWidth: "1400px", margin: "0 auto" }}>
        
        {/* 🚨 DUAL ALERTS SYSTEM (RED & ORANGE) - DIMA KAYBANO 🚨 */}
        {isScanningAlerts ? (
          <div className="target-bracket" style={{ position: "relative", zIndex: 10, marginBottom: "1.5rem", padding: "1rem 1.5rem", backgroundColor: "rgba(10, 15, 30, 0.8)", border: "1px dashed rgba(0, 240, 255, 0.6)", display: "flex", alignItems: "center", gap: "15px", backdropFilter: "blur(10px)", borderRadius: "6px", boxShadow: "0 0 20px rgba(0,240,255,0.2)" }}>
            <Activity size={24} color="#00f0ff" style={{ animation: "pulse-neon 1s infinite" }} />
            <span style={{ color: "#00f0ff", fontFamily: "monospace", fontSize: "0.95rem", letterSpacing: "2px", fontWeight: "bold" }}>SCANNING MATRIX FOR ANOMALIES...</span>
          </div>
        ) : (
          <>
            {/* 🔴 ALERT 1 : STATUTS BLOQUÉS */}
            <div 
              onClick={() => validationAlerts.length > 0 && setShowValidationDetails(!showValidationDetails)}
              className={`target-bracket ${validationAlerts.length > 0 ? "warning-stripes-red hardware-accelerated" : ""}`}
              style={{ 
                position: "relative", zIndex: 10, marginBottom: "1.5rem", 
                cursor: validationAlerts.length > 0 ? "pointer" : "default", 
                border: "1px solid #ff003c", borderLeft: "6px solid #ff003c", 
                padding: "1.2rem", color: "#ffb3b3", fontFamily: "monospace", 
                animation: validationAlerts.length > 0 ? "blink-alert-red 1.5s infinite" : "none", 
                backdropFilter: "blur(15px)", borderRadius: "6px",
                backgroundColor: validationAlerts.length > 0 ? "transparent" : "rgba(10, 15, 30, 0.8)",
                boxShadow: validationAlerts.length > 0 ? "none" : "inset 0 0 10px rgba(255, 0, 60, 0.1)"
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <AlertTriangle size={28} color="#ff003c" style={{ animation: validationAlerts.length > 0 ? "glitch-text 2s infinite" : "none", filter: validationAlerts.length > 0 ? "drop-shadow(0 0 10px #ff003c)" : "none", opacity: validationAlerts.length > 0 ? 1 : 0.6 }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "900", letterSpacing: "2px", color: validationAlerts.length > 0 ? "#fff" : "#ff8080", animation: validationAlerts.length > 0 ? "glitch-text 3s infinite" : "none", textShadow: validationAlerts.length > 0 ? "0 0 10px #ff003c" : "none" }}>
                      {validationAlerts.length > 0 ? "CRITICAL STATUS BREACH" : "STATUS SCAN CLEAR"}
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", fontWeight: "bold", color: "#ff8080", opacity: validationAlerts.length > 0 ? 1 : 0.7 }}>
                      {validationAlerts.length} EPS STUCK IN "EN_ATTENTE_VALIDATION".
                    </p>
                  </div>
                </div>
                
                {validationAlerts.length > 0 && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button onClick={handleExportValidationAlerts} disabled={isExportingAlerts} className="mecha-btn btn-emergency-red" onMouseEnter={(e) => { e.stopPropagation(); changeBgTheme("rgba(255, 0, 60, 0.25)"); }} onMouseLeave={(e) => { e.stopPropagation(); changeBgTheme("transparent"); }}>
                      <DownloadCloud size={16} /> {isExportingAlerts ? "EXTRACTING..." : "EXPORT LOGS"}
                    </button>
                    <span style={{ fontSize: "0.8rem", color: "#fff", backgroundColor: "rgba(255,0,60,0.3)", border: "1px solid #ff003c", padding: "0.5rem 1rem", fontWeight: "bold", borderRadius: "4px", boxShadow: "0 0 10px rgba(255,0,60,0.5)" }}>
                      {showValidationDetails ? "HIDE TARGETS" : "VIEW TARGETS"}
                    </span>
                  </div>
                )}
              </div>
              
              {showValidationDetails && validationAlerts.length > 0 && (
                <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid rgba(255,0,60,0.4)", backgroundColor: "rgba(0,0,0,0.5)", padding: "15px", borderRadius: "6px" }}>
                  <div className="cyber-scroll" style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                    {validationAlerts.map((eps, idx) => (
                      <span key={idx} onClick={(e) => { e.stopPropagation(); setEpsInputValue(eps); }} style={{ backgroundColor: "rgba(255,0,60,0.15)", border: "1px solid rgba(255,0,60,0.5)", padding: "6px 12px", borderRadius: "4px", fontSize: "0.85rem", color: "#fff", cursor: "pointer", transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,0,60,0.6)"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,0,60,0.15)"; }}>
                        {eps}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 🟠 ALERT 2 : COMMENTAIRES DUPLIQUÉS */}
            <div 
              onClick={() => commentAlerts.length > 0 && setShowCommentDetails(!showCommentDetails)}
              className={`target-bracket ${commentAlerts.length > 0 ? "warning-stripes-orange hardware-accelerated" : ""}`}
              style={{ 
                position: "relative", zIndex: 10, marginBottom: "1.5rem", 
                cursor: commentAlerts.length > 0 ? "pointer" : "default", 
                border: "1px solid #f59e0b", borderLeft: "6px solid #f59e0b", 
                padding: "1.2rem", color: "#fef3c7", fontFamily: "monospace", 
                animation: commentAlerts.length > 0 ? "blink-alert-orange 2.5s infinite" : "none", 
                backdropFilter: "blur(15px)", borderRadius: "6px",
                backgroundColor: commentAlerts.length > 0 ? "transparent" : "rgba(10, 15, 30, 0.8)",
                boxShadow: commentAlerts.length > 0 ? "none" : "inset 0 0 10px rgba(245, 158, 11, 0.1)"
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <MessageSquare size={28} color="#f59e0b" style={{ filter: commentAlerts.length > 0 ? "drop-shadow(0 0 10px #f59e0b)" : "none", opacity: commentAlerts.length > 0 ? 1 : 0.6 }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "900", letterSpacing: "2px", color: commentAlerts.length > 0 ? "#fff" : "#fcd34d", textShadow: commentAlerts.length > 0 ? "0 0 10px #f59e0b" : "none" }}>
                      {commentAlerts.length > 0 ? "STALE COMMENTS DETECTED" : "COMMENTS SCAN CLEAR"}
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", fontWeight: "bold", color: commentAlerts.length > 0 ? "#fcd34d" : "#f59e0b", opacity: commentAlerts.length > 0 ? 1 : 0.7 }}>
                      {commentAlerts.length} EPS have duplicated/stale comments.
                    </p>
                  </div>
                </div>
                
                {commentAlerts.length > 0 && (
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button onClick={handleExportCommentAlerts} disabled={isExportingComments} className="mecha-btn btn-emergency-orange" onMouseEnter={(e) => { e.stopPropagation(); changeBgTheme("rgba(245, 158, 11, 0.2)"); }} onMouseLeave={(e) => { e.stopPropagation(); changeBgTheme("transparent"); }}>
                      <DownloadCloud size={16} /> {isExportingComments ? "EXTRACTING..." : "EXPORT LOGS"}
                    </button>
                    <span style={{ fontSize: "0.8rem", color: "#fff", backgroundColor: "rgba(245,158,11,0.3)", border: "1px solid #f59e0b", padding: "0.5rem 1rem", fontWeight: "bold", borderRadius: "4px", boxShadow: "0 0 10px rgba(245,158,11,0.5)" }}>
                      {showCommentDetails ? "HIDE TARGETS" : "VIEW TARGETS"}
                    </span>
                  </div>
                )}
              </div>
              
              {showCommentDetails && commentAlerts.length > 0 && (
                <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px solid rgba(245,158,11,0.5)", backgroundColor: "rgba(0,0,0,0.7)", padding: "15px", borderRadius: "6px" }}>
                  <div className="cyber-scroll" style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "150px", overflowY: "auto" }}>
                    {commentAlerts.map((eps, idx) => (
                      <span key={idx} onClick={(e) => { e.stopPropagation(); setEpsInputValue(eps); }} style={{ backgroundColor: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.6)", padding: "6px 12px", borderRadius: "4px", fontSize: "0.85rem", color: "#fff", cursor: "pointer", transition: "all 0.2s ease" }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.8)"; e.currentTarget.style.boxShadow = "0 0 10px #f59e0b"; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.2)"; e.currentTarget.style.boxShadow = "none"; }}>
                        {eps}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 🔥 L'UPLOADING PROGRESS (DABA KAT-BAN L'UPLINK FIN WSSLAT!) 🔥 */}
        {isUploading && (
          <div className="target-bracket hardware-accelerated" style={{ position: "relative", zIndex: 10, marginBottom: "1.5rem", padding: "1rem 1.5rem", backgroundColor: "rgba(0, 240, 255, 0.1)", border: "1px solid rgba(0, 240, 255, 0.4)", borderLeft: "4px solid #00f0ff", display: "flex", alignItems: "center", gap: "15px", backdropFilter: "blur(10px)", borderRadius: "6px", boxShadow: "0 0 20px rgba(0,240,255,0.15)" }}>
            <Activity size={24} color="#00f0ff" style={{ animation: "pulse-neon 1s infinite" }} />
            <span style={{ color: "#00f0ff", fontFamily: "monospace", fontSize: "0.95rem", letterSpacing: "2px", fontWeight: "bold" }}>{uploadProgressText}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ position: "relative", zIndex: 10, marginBottom: "1.5rem", color: "#00ff41", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "10px", padding: "1.2rem", backgroundImage: "linear-gradient(90deg, rgba(0,255,65,0.15), rgba(10,15,30,0.8))", borderLeft: "4px solid #00ff41", borderRadius: "4px", animation: "fade-in-up 0.3s ease", boxShadow: "0 0 15px rgba(0,255,65,0.2)" }}>
            <CheckCircle size={24} style={{ filter: "drop-shadow(0 0 5px #00ff41)" }} /> <span style={{ fontSize: "1rem", fontWeight: "bold", letterSpacing: "1px" }}>{successMsg}</span>
          </div>
        )}

        {/* LOADING vs EMPTY vs TABLE */}
        <div style={{ position: "relative", zIndex: 10 }}>
          {loading ? (
            <div className="target-bracket hardware-accelerated" style={{ textAlign: "center", padding: "8rem 2rem", backgroundColor: "rgba(10, 15, 30, 0.8)", border: "1px solid rgba(0, 240, 255, 0.4)", backdropFilter: "blur(15px)", borderRadius: "8px", boxShadow: "0 0 30px rgba(0,240,255,0.1)" }}>
              <div className="dynamic-hue" style={{ position: "relative", width: "80px", height: "80px", margin: "0 auto 2rem" }}>
                <Cpu size={80} color="#00f0ff" style={{ opacity: 0.9, filter: "drop-shadow(0 0 10px #00f0ff)" }} />
                <div style={{ position: "absolute", top: "-15px", left: "-15px", width: "110px", height: "110px", border: "2px dashed rgba(0, 240, 255, 0.7)", borderRadius: "50%", animation: "radar-spin 2s linear infinite" }}></div>
                <div style={{ position: "absolute", top: "-30px", left: "-30px", width: "140px", height: "140px", border: "1px solid rgba(0, 240, 255, 0.3)", borderTop: "3px solid #00f0ff", borderRadius: "50%", animation: "radar-spin-reverse 3s linear infinite", boxShadow: "0 0 20px rgba(0,240,255,0.2)" }}></div>
              </div>
              <h2 style={{ color: "#fff", fontFamily: "monospace", fontSize: "1.8rem", marginBottom: "15px", letterSpacing: "8px", animation: "pulse-neon 2s infinite", textShadow: "0 0 10px #00f0ff" }}>SCANNING MATRIX...</h2>
              <div style={{ width: "350px", height: "4px", backgroundColor: "rgba(0, 240, 255, 0.2)", margin: "20px auto 0", overflow: "hidden", borderRadius: "4px" }}>
                <div style={{ width: "50%", height: "100%", backgroundColor: "#00f0ff", animation: "loading-bar 1s ease-in-out infinite", boxShadow: "0 0 10px #00f0ff" }}></div>
              </div>
            </div>
          ) : records.length > 0 ? (
            <div className="target-bracket" style={{ border: "1px solid rgba(0, 240, 255, 0.4)", boxShadow: "0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(0,240,255,0.1)", overflow: "hidden", backgroundColor: "rgba(6, 11, 25, 0.9)", backdropFilter: "blur(20px)", borderRadius: "8px" }}>
               <SmartTable data={records} loading={false} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalPages={totalPages} totalItems={totalItems} />
            </div>
          ) : (
            <div className="mecha-element hardware-accelerated target-bracket" style={{ textAlign: "center", padding: "8rem 2rem", backgroundColor: "rgba(10, 15, 30, 0.8)", border: "1px dashed rgba(255, 0, 60, 0.5)", backdropFilter: "blur(15px)", borderRadius: "8px", boxShadow: "inset 0 0 50px rgba(255,0,60,0.05)" }}>
              <Database size={80} color="#ff003c" style={{ margin: "0 auto 1.5rem", opacity: 0.8, filter: "drop-shadow(0 0 15px #ff003c)" }} />
              <h2 style={{ color: "#fff", fontFamily: "monospace", fontSize: "1.8rem", marginBottom: "10px", letterSpacing: "5px", textShadow: "0 0 10px #ff003c" }}>VOID SECTOR</h2>
              <p style={{ color: "#cbd5e1", fontFamily: "monospace", fontSize: "1rem", letterSpacing: "1px" }}>
                Awaiting payload for <span style={{ color: "#00f0ff", fontWeight: "bold", textShadow: "0 0 5px #00f0ff" }}>[{globalCategory}]</span> at <span style={{ color: "#00ff41", fontWeight: "bold", textShadow: "0 0 5px #00ff41" }}>{formattedMonth}/{globalYear}</span>.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <FileUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUpload={handleUpload} isUploading={isUploading} defaultCategory={globalCategory} defaultYear={globalYear} defaultMonth={globalMonth} />

      {/* TIMELINE TERMINAL MODAL (FIXED INPUT FOCUS) */}
      {isHistoryModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999999, backdropFilter: "blur(8px)" }}>
          <div className="target-bracket" style={{ backgroundColor: "rgba(6, 11, 25, 0.95)", border: "1px solid #ff00ff", borderRadius: "8px", width: "700px", maxWidth: "95%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.8)" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255, 0, 255, 0.3)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundImage: "linear-gradient(90deg, rgba(255, 0, 255, 0.1), transparent)" }}>
              <h2 style={{ color: "#fff", margin: 0, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "10px", fontFamily: "monospace", fontWeight: "900", letterSpacing: "2px" }}>
                <Crosshair color="#ff00ff" size={24} /> QUANTUM TIMELINE
              </h2>
              <button onClick={() => { setIsHistoryModalOpen(false); setEpsHistoryData([]); setHistoryEpsInput(""); }} className="mecha-element" style={{ padding: "0.5rem", border: "1px solid rgba(255,0,60,0.4)", backgroundColor: "rgba(255,0,60,0.1)", color: "#ff003c", borderRadius: "4px" }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: "1.5rem", display: "flex", gap: "15px", backgroundColor: "rgba(10, 15, 30, 0.8)", borderBottom: "1px solid rgba(148,163,184,0.2)" }}>
              <input 
                type="text" placeholder="ENTER EPS ID..." 
                value={historyEpsInput} onChange={(e) => setEpsInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchEpsHistory()} 
                className="cyber-input" style={{ flex: 1, padding: "0.8rem 1rem", borderRadius: "4px", outline: "none", fontFamily: "monospace", fontSize: "1rem" }} 
                autoFocus
              />
              <button className="mecha-btn btn-purple" style={{ padding: "0 1.5rem", fontSize: "0.9rem" }} onClick={fetchEpsHistory}>SCAN</button>
            </div>

            <div className="cyber-scroll" style={{ padding: "2rem", overflowY: "auto", flex: 1 }}>
              {loadingHistory && (
                <div style={{ textAlign: "center", marginTop: "3rem" }}>
                  <Activity size={40} color="#ff00ff" style={{ margin: "0 auto 1.5rem", animation: "pulse-neon 1s infinite" }} />
                  <p style={{ color: "#d8b4fe", fontFamily: "monospace", fontSize: "1rem", letterSpacing: "2px" }}>SEARCHING MULTIVERSE...</p>
                </div>
              )}
              
              {!loadingHistory && epsHistoryData.length === 0 && historyEpsInput && (
                <div style={{ textAlign: "center", marginTop: "3rem", padding: "3rem", border: "1px dashed #ef4444", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: "8px", boxShadow: "inset 0 0 20px rgba(255,0,60,0.1)" }}>
                  <ShieldAlert size={50} color="#ff003c" style={{ margin: "0 auto 1.5rem" }} />
                  <p style={{ color: "#ff003c", fontFamily: "monospace", fontSize: "1.2rem", fontWeight: "900", letterSpacing: "2px" }}>NO RECORD FOUND</p>
                </div>
              )}

              {!loadingHistory && epsHistoryData.length > 0 && (
                <div style={{ position: "relative", paddingLeft: "40px", borderLeft: "3px solid rgba(255,0,255,0.4)", marginLeft: "20px" }}>
                  {epsHistoryData.map((item, index) => (
                    <div key={index} className="mecha-element target-bracket" style={{ marginBottom: "2.5rem", position: "relative", padding: "1.5rem", backgroundColor: "rgba(10, 15, 30, 0.6)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: "6px" }}>
                      <div style={{ position: "absolute", left: "-52px", top: "25px", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: index === epsHistoryData.length - 1 ? "#00ff41" : "#ff00ff", border: "4px solid #020617", zIndex: 2 }}></div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
                        <span style={{ backgroundColor: index === epsHistoryData.length - 1 ? "rgba(0, 255, 65, 0.15)" : "rgba(255, 0, 255, 0.15)", color: index === epsHistoryData.length - 1 ? "#00ff41" : "#d8b4fe", padding: "6px 15px", borderRadius: "4px", fontSize: "0.9rem", fontWeight: "900", border: index === epsHistoryData.length - 1 ? "1px solid rgba(0, 255, 65, 0.5)" : "1px solid rgba(255, 0, 255, 0.4)" }}>
                          {item.version}
                        </span>
                        <span style={{ color: "#cbd5e1", fontSize: "0.85rem", fontFamily: "monospace", backgroundColor: "rgba(2, 6, 23, 0.9)", padding: "6px 12px", borderRadius: "4px", border: "1px solid #475569" }}>
                          {new Date(item.importedAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div style={{ backgroundColor: "rgba(2, 6, 23, 0.95)", padding: "15px", borderRadius: "6px", color: "#f8fafc", fontSize: "0.95rem", borderLeft: `4px solid ${index === epsHistoryData.length - 1 ? "#00ff41" : "#ff00ff"}`, borderTop: "1px solid #1e293b", borderRight: "1px solid #1e293b", borderBottom: "1px solid #1e293b", fontFamily: "monospace" }}>
                        {item.commentaire || <span style={{ color: "#64748b", fontStyle: "italic" }}>// No data</span>}
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