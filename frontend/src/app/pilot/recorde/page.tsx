"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import SmartTable from "./components/SmartTable";
import FileUploadModal from "./ui/FileUploadModal"; 
import {
  UploadCloud,
  CheckCircle,
  Search,
  X,
  DownloadCloud,
  Calendar,
  Folder,
  ShieldAlert,
  Crosshair,
  Activity,
  LayoutDashboard,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  Layers,
  Users,
  Globe,
  ChevronDown,
  Sparkles
} from "lucide-react";

const API_BASE = ""; 

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

  const isPrimaryBlue = variant === "purple" || variant === "default";
  const accentColor = isPrimaryBlue ? "#2563eb" : "#0284c7";
  const activeBg = isPrimaryBlue ? "#eff6ff" : "#f0f9ff";
  const activeBorder = isPrimaryBlue ? "#3b82f6" : "#38bdf8";

  return (
    <div ref={ref} style={{ position: "relative", width }}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ 
          backgroundColor: disabled ? "#f1f5f9" : (isOpen ? activeBg : "#ffffff"),
          border: `1px solid ${isOpen ? activeBorder : "#cbd5e1"}`, 
          padding: "0.5rem 0.75rem",
          borderRadius: "8px",
          color: disabled ? "#94a3b8" : (isOpen ? accentColor : "#0f172a"), 
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between", 
          alignItems: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "0.82rem",
          fontWeight: 600,
          transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease", 
          boxShadow: isOpen ? `0 0 0 3px rgba(37, 99, 235, 0.12)` : "0 1px 2px rgba(15, 23, 42, 0.04)",
          opacity: disabled ? 0.6 : 1,
          userSelect: "none"
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.01em" }}>
          {displayLabel || "SELECT..."}
        </span>
        <ChevronDown 
          size={15} 
          style={{ 
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", 
            transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)", 
            color: isOpen ? accentColor : "#64748b", 
            marginLeft: "6px",
            flexShrink: 0
          }} 
        />
      </div>
      
      {isOpen && !disabled && (
        <div 
          className="clean-scroll" 
          style={{ 
            position: "absolute", 
            top: "calc(100% + 6px)", 
            left: 0, 
            right: 0, 
            backgroundColor: "#ffffff", 
            border: "1px solid #bfdbfe", 
            borderRadius: "10px", 
            maxHeight: "240px", 
            overflowY: "auto", 
            boxShadow: "0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(37, 99, 235, 0.08)", 
            zIndex: 999999,
            padding: "4px"
          }}
        >
          {options.map((opt: any) => {
            const isSelected = opt.value === value;
            return (
              <div 
                key={opt.value} 
                onClick={() => { onChange(opt.value); setIsOpen(false); }} 
                style={{ 
                  padding: "0.5rem 0.7rem", 
                  color: isSelected ? "#1d4ed8" : "#334155", 
                  backgroundColor: isSelected ? "#eff6ff" : "transparent",
                  fontFamily: "'Inter', -apple-system, sans-serif", 
                  fontSize: "0.82rem", 
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer", 
                  borderRadius: "6px",
                  transition: "background-color 0.12s ease, color 0.12s ease" 
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.color = "#2563eb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#334155";
                  }
                }}
              >
                {opt.label}
              </div>
            );
          })}
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
  
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);
  const [showSecurityLogs, setShowSecurityLogs] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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

  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackEpsList, setTrackEpsList] = useState("");
  const [trackYear, setTrackYear] = useState<string | number>("ALL");
  const [trackMonth, setTrackMonth] = useState<string | number>("ALL");
  const [trackEtat, setTrackEtat] = useState<string>("ALL"); 
  const [availableEtats, setAvailableEtats] = useState<string[]>([]); 
  const [isTrackingGlobal, setIsTrackingGlobal] = useState(false);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamEpsList, setTeamEpsList] = useState("");
  const [teamYear, setTeamYear] = useState<string | number>("ALL");
  const [teamMonth, setTeamMonth] = useState<string | number>("ALL");
  const [isExportingTeam, setIsExportingTeam] = useState(false);

  const [isOmniSearchModalOpen, setIsOmniSearchModalOpen] = useState(false);
  const [omniSearchEpsList, setOmniSearchEpsList] = useState("");
  const [isExportingOmniSearch, setIsExportingOmniSearch] = useState(false);

  const [validationAlerts, setValidationAlerts] = useState<string[]>([]);
  const [commentAlerts, setCommentAlerts] = useState<string[]>([]);
  const [isScanningAlerts, setIsScanningAlerts] = useState(false);
  const [showValidationDetails, setShowValidationDetails] = useState(false);
  const [showCommentDetails, setShowCommentDetails] = useState(false);
  
  const [isExportingAlerts, setIsExportingAlerts] = useState(false); 
  const [isExportingComments, setIsExportingComments] = useState(false); 

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const bgOverlayRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  
  const formattedMonth = useMemo(() => globalMonth.toString().padStart(2, '0'), [globalMonth]);

  const changeBgTheme = useCallback((color: string) => {
    if (bgOverlayRef.current) bgOverlayRef.current.style.backgroundColor = color;
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setServerEps(epsInputValue);
      setPage(0);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [epsInputValue]);

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
    } catch (e) {} finally {
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
    setRecords([]);
    setServerVersion("");
    setPage(0);
    fetchVersions();
    fetchAlertsData(globalCategory, globalYear, globalMonth);
  }, [globalCategory, globalYear, globalMonth, fetchAlertsData, refreshTrigger]);

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
          setRecords(data.content || []);
          setTotalPages(data.totalPages || 0);
          setTotalItems(data.totalItems || 0);
        }
      } catch (error) {} finally {
        setLoading(false);
      } 
    };
    fetchRecords();
  }, [globalCategory, globalYear, globalMonth, page, pageSize, serverVersion, serverEps, refreshTrigger]);

  const handleUploadSuccess = (isTotalSuccess: boolean = true) => {
    setRefreshTrigger(prev => prev + 1);
    if (isTotalSuccess) {
      setIsModalOpen(false);
      setSuccessMsg(`CORE MATRIX UPDATED SECURELY!`);
      setTimeout(() => setSuccessMsg(""), 5000); 
    }
  };

  const handleSecurityAlert = (errors: string[]) => {
    setSecurityLogs(prev => [...prev, ...errors]);
    setShowSecurityLogs(true);
  };

  const handleClearSecurityLogs = () => setSecurityLogs([]);

  const fetchEpsHistory = async (overrideEps?: string) => {
    const targetEps = (typeof overrideEps === 'string' ? overrideEps : historyEpsInput)?.trim();
    if (!targetEps) return;
    setHistoryEpsInput(targetEps);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    setEpsHistoryData([]);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/history/${targetEps}?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) setEpsHistoryData(await res.json());
    } catch (error) {} finally {
      setLoadingHistory(false);
    }
  };

  const handleClearDB = async () => {
    if (!window.confirm(`CRITICAL OVERRIDE\n\nPURGE FOR SECTOR [ ${globalCategory} - ${formattedMonth}/${globalYear} ] ?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/clear?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg(`SYSTEM: Sector obliterated.`);
        setTimeout(() => setSuccessMsg(""), 5000);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {}
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/export/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Matrix_Export_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`SYSTEM: Matrix Extracted!`);
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally {
      setIsExporting(false);
    }
  };

  const handleExportValidationAlerts = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExportingAlerts(true);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/export-alerts?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Anomalies_Statut_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`STATUS ANOMALIES EXTRACTED SUCCESSFULLY!`);
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally {
      setIsExportingAlerts(false);
    }
  };

  const handleExportCommentAlerts = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExportingComments(true);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/export-alerts-comments?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Anomalies_Commentaires_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`COMMENTS ANOMALIES EXTRACTED SUCCESSFULLY!`);
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally {
      setIsExportingComments(false);
    }
  };

  useEffect(() => {
    if (isTrackModalOpen) {
      fetch(`${API_BASE}/api/pilot-records/etats?category=${globalCategory}&year=${trackYear}&month=${trackMonth}`)
        .then(res => res.json())
        .then(data => setAvailableEtats(data || []))
        .catch(err => console.error(err));
    }
  }, [isTrackModalOpen, globalCategory, trackYear, trackMonth]);

  const executeGlobalTrack = async () => {
    const epsArray = trackEpsList.split(/[\n,]+/).map(e => e.trim()).filter(e => e !== "");
    if (epsArray.length === 0 && trackEtat === "ALL") {
      alert("⚠️ ERROR: PROVIDE EPS OR STATUS.");
      return;
    }
    
    setIsTrackingGlobal(true);
    try {
      const queryParams = new URLSearchParams({ category: globalCategory, year: trackYear.toString(), month: trackMonth.toString() });
      if (trackEtat !== "ALL") queryParams.append("etat", trackEtat);

      const res = await fetch(`${API_BASE}/api/pilot-records/export-track-global?${queryParams.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(epsArray)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Global_Timeline_${globalCategory}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`GLOBAL TIMELINE EXTRACTED!`);
        setIsTrackModalOpen(false);
        setTrackEpsList("");
        setTrackEtat("ALL");
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        alert("❌ CRITICAL ERROR IN EXTRACTION.");
      }
    } catch (error) {} finally {
      setIsTrackingGlobal(false);
    }
  };

  const executeTeamExport = async () => {
    const epsArray = teamEpsList.split(/[\n,]+/).map(e => e.trim()).filter(e => e !== "");
    if (epsArray.length === 0) {
      alert("⚠️ ERROR: NO EPS IDENTIFIED IN THE PAYLOAD.");
      return;
    }
    
    setIsExportingTeam(true);
    try {
      const queryParams = new URLSearchParams({ category: globalCategory, year: teamYear.toString(), month: teamMonth.toString() });

      const res = await fetch(`${API_BASE}/api/equipe-export/track?${queryParams.toString()}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(epsArray) 
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Export_Equipe_${globalCategory}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`TEAM EXPORT EXTRACTED SUCCESSFULLY!`);
        setIsTeamModalOpen(false);
        setTeamEpsList("");
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        alert("❌ CRITICAL ERROR IN TEAM EXTRACTION.");
      }
    } catch (error) {} finally {
      setIsExportingTeam(false);
    }
  };

  const executeOmniSearchExport = async () => {
    const epsArray = omniSearchEpsList.split(/[\n,]+/).map(e => e.trim()).filter(e => e !== "");
    if (epsArray.length === 0) {
      alert("⚠️ ERROR: NO EPS IDENTIFIED IN THE PAYLOAD.");
      return;
    }
    
    setIsExportingOmniSearch(true);
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/export-global-search`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(epsArray) 
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Global_Omni_Search_Extract.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`OMNI SEARCH EXTRACTED SUCCESSFULLY!`);
        setIsOmniSearchModalOpen(false);
        setOmniSearchEpsList("");
        setTimeout(() => setSuccessMsg(""), 5000);
      } else {
        alert("❌ CRITICAL ERROR IN OMNI EXTRACTION.");
      }
    } catch (error) {} finally {
      setIsExportingOmniSearch(false);
    }
  };

  const clearFilters = () => {
    setServerVersion("");
    setEpsInputValue("");
    setPage(0);
  };

  const categoryOptions = useMemo(() => [
    { value: "RACC", label: "CAT: RACC" },
    { value: "SAV", label: "CAT: SAV" },
    { value: "FTTH", label: "CAT: FTTH" },
    { value: "AUTRE", label: "CAT: AUTRE" },
    { value: "PRESTA", label: "CAT: PRESTA" }
  ], []);
  const yearOptions = useMemo(() => [2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => ({ value: y, label: `${y}` })), []);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `M-${String(i + 1).padStart(2, '0')}` })), []);
  const versionOptions = useMemo(() => [{ value: "", label: "All Versions" }, ...dynamicVersions.map(v => ({ value: v, label: `${v}` }))], [dynamicVersions]);
  
  const trackYearOptions = useMemo(() => [{ value: "ALL", label: "All Years" }, ...yearOptions], [yearOptions]);
  const trackMonthOptions = useMemo(() => [{ value: "ALL", label: "All Months" }, ...monthOptions], [monthOptions]);
  const etatOptions = useMemo(() => [{ value: "ALL", label: "All Statuses" }, ...availableEtats.map(e => ({ value: e, label: e.toUpperCase() }))], [availableEtats]);

  return (
    <main 
      ref={mainRef} 
      style={{ 
        padding: "1.75rem 2rem", 
        minHeight: "100vh", 
        position: "relative", 
        overflowX: "hidden",
        backgroundColor: "#f8fafc",
        color: "#0f172a",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* Static Zero-Repaint Architectural Background (70% White / 30% Soft Blue Ambient) */}
      <div 
        ref={bgOverlayRef} 
        style={{ 
          position: "fixed", 
          inset: 0, 
          backgroundColor: "transparent", 
          transition: "background-color 0.35s ease", 
          zIndex: 0, 
          pointerEvents: "none" 
        }} 
      />
      <div 
        style={{ 
          position: "fixed", 
          inset: 0, 
          zIndex: 0, 
          pointerEvents: "none",
          backgroundImage: `
            radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.08) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(2, 132, 199, 0.07) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(59, 130, 246, 0.05) 0px, transparent 50%),
            linear-gradient(to right, rgba(226, 232, 240, 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(226, 232, 240, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px"
        }} 
      />

      <style>{`
        .hardware-accelerated {
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
        }

        .nexus-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03), 0 8px 24px -4px rgba(37, 99, 235, 0.05);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .nexus-card:hover {
          border-color: #bfdbfe;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04), 0 12px 32px -4px rgba(37, 99, 235, 0.08);
        }

        .nexus-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.55rem 1rem;
          background-color: #ffffff;
          color: #1e293b;
          border: 1px solid #cbd5e1;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.01em;
          border-radius: 9px;
          transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
          user-select: none;
        }
        .nexus-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .nexus-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        .nexus-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Primary Royal Blue Button (30% Blue Hero Accent) */
        .btn-primary-blue {
          background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
          color: #ffffff;
          border-color: #1d4ed8;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        .btn-primary-blue:hover:not(:disabled) {
          background: linear-gradient(180deg, #1d4ed8 0%, #1e40af 100%);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        /* Soft Blue Outline Button */
        .btn-soft-blue {
          background-color: #eff6ff;
          border-color: #bfdbfe;
          color: #1d4ed8;
        }
        .btn-soft-blue:hover:not(:disabled) {
          background-color: #dbeafe;
          border-color: #60a5fa;
          color: #1e3a8a;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
        }

        /* Sky / Omni Blue Button */
        .btn-sky-blue {
          background-color: #f0f9ff;
          border-color: #bae6fd;
          color: #0369a1;
        }
        .btn-sky-blue:hover:not(:disabled) {
          background-color: #e0f2fe;
          border-color: #38bdf8;
          color: #075985;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.14);
        }

        /* Danger Subtle Button */
        .btn-danger-clean {
          background-color: #ffffff;
          border-color: #fecaca;
          color: #dc2626;
        }
        .btn-danger-clean:hover:not(:disabled) {
          background-color: #fef2f2;
          border-color: #f87171;
          color: #b91c1c;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.1);
        }

        .clean-input {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
        }
        .clean-input::placeholder {
          color: #94a3b8;
        }
        .clean-input:focus {
          background-color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }

        .clean-textarea {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 0.9rem 1rem;
          border-radius: 10px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.85rem;
          line-height: 1.5;
          outline: none;
          resize: vertical;
          width: 100%;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
        }
        .clean-textarea:focus {
          background-color: #ffffff;
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
        }

        .clean-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .clean-scroll::-webkit-scrollbar-track {
          background-color: #f1f5f9;
          border-radius: 6px;
        }
        .clean-scroll::-webkit-scrollbar-thumb {
          background-color: #93c5fd;
          border-radius: 6px;
        }
        .clean-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #2563eb;
        }

        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      <div style={{ position: "relative", zIndex: 20, maxWidth: "1480px", margin: "0 auto" }}>
        
        {/* SECURITY BREACH LOGS */}
        {securityLogs.length > 0 && showSecurityLogs && (
          <div 
            className="hardware-accelerated" 
            style={{ 
              backgroundColor: "#ffffff", 
              border: "1px solid #fecaca", 
              borderLeft: "5px solid #dc2626",
              borderRadius: "12px", 
              padding: "1.25rem 1.5rem", 
              marginBottom: "1.25rem", 
              boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.08)" 
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ color: "#dc2626", margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, letterSpacing: "0.03em" }}>
                <ShieldAlert size={20} /> SECURITY BREACH LOGS ({securityLogs.length})
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setShowSecurityLogs(false)} className="nexus-btn" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Minimize</button>
                <button onClick={handleClearSecurityLogs} className="nexus-btn btn-danger-clean" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Clear Logs</button>
              </div>
            </div>
            <ul className="clean-scroll" style={{ margin: 0, paddingLeft: "18px", color: "#991b1b", fontFamily: "monospace", fontSize: "0.82rem", maxHeight: "110px", overflowY: "auto" }}>
              {securityLogs.map((err, i) => (
                <li key={i} style={{ marginBottom: "6px", paddingBottom: "6px", borderBottom: "1px dashed #fee2e2" }}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {securityLogs.length > 0 && !showSecurityLogs && (
          <button 
            onClick={() => setShowSecurityLogs(true)} 
            style={{ 
              width: "100%", 
              backgroundColor: "#fef2f2", 
              border: "1px solid #fecaca", 
              color: "#dc2626", 
              padding: "0.75rem", 
              borderRadius: "10px", 
              fontWeight: 700, 
              fontSize: "0.82rem",
              letterSpacing: "0.03em", 
              marginBottom: "1.25rem", 
              cursor: "pointer" 
            }}
          >
            ⚠️ {securityLogs.length} SECURITY BREACHES DETECTED — CLICK TO EXPAND
          </button>
        )}

        {/* TOP ENTERPRISE NAVIGATION BAR (White Surface + Blue Identity) */}
        <header 
          className="nexus-card hardware-accelerated" 
          style={{ 
            padding: "1.1rem 1.5rem", 
            marginBottom: "1rem", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: "16px",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            borderBottom: "2px solid #dbeafe"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div 
              style={{ 
                width: "44px", 
                height: "44px", 
                borderRadius: "12px", 
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                boxShadow: "0 6px 16px rgba(37, 99, 235, 0.28)"
              }}
            >
              <LayoutDashboard size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1 style={{ color: "#0f172a", margin: 0, fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  KYNTUS <span style={{ color: "#2563eb" }}>NEXUS</span>
                </h1>
                <span 
                  style={{ 
                    backgroundColor: "#eff6ff", 
                    color: "#2563eb", 
                    border: "1px solid #bfdbfe", 
                    fontSize: "0.68rem", 
                    fontWeight: 700, 
                    padding: "2px 8px", 
                    borderRadius: "999px",
                    letterSpacing: "0.04em"
                  }}
                >
                  ENTERPRISE V2.6
                </span>
              </div>
              <div style={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 500, marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#2563eb", display: "inline-block" }} />
                High-Frequency Pilot Operations & Matrix Intelligence
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button 
              className="nexus-btn btn-danger-clean" 
              onClick={handleClearDB} 
              onMouseEnter={() => changeBgTheme("rgba(239, 68, 68, 0.03)")} 
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <ShieldAlert size={15} /> Purge DB
            </button>

            <button 
              className="nexus-btn btn-soft-blue" 
              onClick={handleExport} 
              disabled={isExporting} 
              onMouseEnter={() => changeBgTheme("rgba(37, 99, 235, 0.03)")} 
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <DownloadCloud size={15} /> {isExporting ? "Exporting..." : "Extract Excel"}
            </button>

            <button 
              className="nexus-btn btn-soft-blue" 
              onClick={() => setIsTrackModalOpen(true)}
            >
              <Crosshair size={15} /> Global Track
            </button>

            <button 
              className="nexus-btn btn-soft-blue" 
              onClick={() => setIsTeamModalOpen(true)}
            >
              <Users size={15} /> Team Export
            </button>

            <button 
              className="nexus-btn btn-sky-blue" 
              onClick={() => setIsOmniSearchModalOpen(true)}
            >
              <Globe size={15} /> Omni Search
            </button>

            <button 
              className="nexus-btn btn-primary-blue" 
              onClick={() => setIsModalOpen(true)}
            >
              <UploadCloud size={15} /> Inject Batch
            </button>
          </div>
        </header>

        {/* FILTER & SEARCH BAR (Bento Split Layout) */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "1.25rem", alignItems: "stretch", flexWrap: "wrap" }}>
          <div 
            className="nexus-card hardware-accelerated" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "10px", 
              padding: "0.75rem 1.1rem",
              background: "#ffffff"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontWeight: 700, fontSize: "0.78rem" }}>
              <Folder size={17} color="#2563eb" />
              <span>SECTOR</span>
            </div>
            <CyberSelect width="135px" value={globalCategory} options={categoryOptions} onChange={(val: string) => setGlobalCategory(val)} variant="purple" />
            
            <div style={{ width: "1px", height: "22px", backgroundColor: "#e2e8f0", margin: "0 4px" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0284c7", fontWeight: 700, fontSize: "0.78rem" }}>
              <Calendar size={17} color="#0284c7" />
              <span>CYCLE</span>
            </div>
            <CyberSelect width="95px" value={globalYear} options={yearOptions} onChange={setGlobalYear} variant="green" />
            <CyberSelect width="95px" value={globalMonth} options={monthOptions} onChange={setGlobalMonth} variant="green" />
          </div>

          <div 
            className="nexus-card hardware-accelerated" 
            style={{ 
              display: "flex", 
              gap: "10px", 
              padding: "0.75rem 1.1rem", 
              alignItems: "center", 
              flex: 1, 
              minWidth: "300px",
              background: "#ffffff"
            }}
          >
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
              <Search size={17} color="#2563eb" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input 
                type="text" 
                placeholder="Search by EPS Reference ID..." 
                value={epsInputValue} 
                onChange={(e) => setEpsInputValue(e.target.value)} 
                className="clean-input" 
                style={{ width: "100%", paddingLeft: "2.35rem" }} 
              />
            </div>

            <CyberSelect width="160px" value={serverVersion} options={versionOptions} onChange={(val: string) => { setServerVersion(val); setPage(0); }} />
            
            {(serverVersion || epsInputValue) && ( 
              <button 
                className="nexus-btn btn-danger-clean" 
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem" }} 
                onClick={clearFilters}
              >
                <X size={14} /> Reset
              </button> 
            )}
          </div>
        </div>

        {/* ALERTS & DIAGNOSTICS SECTION */}
        {isScanningAlerts ? (
          <div 
            className="nexus-card" 
            style={{ 
              marginBottom: "1.25rem", 
              padding: "0.9rem 1.25rem", 
              backgroundColor: "#eff6ff", 
              borderColor: "#bfdbfe", 
              display: "flex", 
              alignItems: "center", 
              gap: "12px" 
            }}
          >
            <Activity size={20} color="#2563eb" style={{ animation: "pulse-subtle 1.2s infinite" }} />
            <span style={{ color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 600 }}>
              Scanning active matrix for status and comment anomalies...
            </span>
          </div>
        ) : (
          <>
            {!isScanningAlerts && validationAlerts.length > 0 && (
              <div 
                onClick={() => setShowValidationDetails(!showValidationDetails)} 
                className="hardware-accelerated" 
                style={{ 
                  marginBottom: "1rem", 
                  cursor: "pointer", 
                  backgroundColor: "#ffffff",
                  border: "1px solid #fecaca", 
                  borderLeft: "5px solid #dc2626", 
                  padding: "1rem 1.25rem", 
                  borderRadius: "12px",
                  boxShadow: "0 4px 16px -2px rgba(220, 38, 38, 0.08)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ backgroundColor: "#fef2f2", padding: "8px", borderRadius: "10px", border: "1px solid #fecaca" }}>
                      <AlertTriangle size={22} color="#dc2626" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#991b1b" }}>
                        CRITICAL STATUS ALERT
                      </h3>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", fontWeight: 500, color: "#dc2626" }}>
                        <strong>{validationAlerts.length} EPS</strong> stuck in &quot;EN_ATTENTE_VALIDATION&quot;.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button onClick={handleExportValidationAlerts} disabled={isExportingAlerts} className="nexus-btn btn-danger-clean">
                      <DownloadCloud size={15} /> {isExportingAlerts ? "Extracting..." : "Export Logs"}
                    </button>
                    <span style={{ fontSize: "0.76rem", color: "#dc2626", backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "0.45rem 0.85rem", fontWeight: 700, borderRadius: "8px" }}>
                      {showValidationDetails ? "Hide Targets" : "View Targets"}
                    </span>
                  </div>
                </div>
                {showValidationDetails && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #fee2e2", backgroundColor: "#fffafa", padding: "12px", borderRadius: "8px" }}>
                    <div className="clean-scroll" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "140px", overflowY: "auto" }}>
                      {validationAlerts.map((eps, idx) => (
                        <span 
                          key={idx} 
                          onClick={(e) => { e.stopPropagation(); setEpsInputValue(eps); }} 
                          style={{ 
                            backgroundColor: "#ffffff", 
                            border: "1px solid #fca5a5", 
                            padding: "4px 10px", 
                            borderRadius: "6px", 
                            fontSize: "0.78rem", 
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#b91c1c", 
                            cursor: "pointer" 
                          }}
                        >
                          {eps}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isScanningAlerts && commentAlerts.length > 0 && (
              <div 
                onClick={() => setShowCommentDetails(!showCommentDetails)} 
                className="hardware-accelerated" 
                style={{ 
                  marginBottom: "1rem", 
                  cursor: "pointer", 
                  backgroundColor: "#ffffff",
                  border: "1px solid #fde68a", 
                  borderLeft: "5px solid #d97706", 
                  padding: "1rem 1.25rem", 
                  borderRadius: "12px",
                  boxShadow: "0 4px 16px -2px rgba(217, 119, 6, 0.08)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ backgroundColor: "#fffbeb", padding: "8px", borderRadius: "10px", border: "1px solid #fde68a" }}>
                      <MessageSquare size={22} color="#d97706" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#92400e" }}>
                        STALE COMMENTS DETECTED
                      </h3>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", fontWeight: 500, color: "#b45309" }}>
                        <strong>{commentAlerts.length} EPS</strong> have duplicated or unchanged pilot comments across versions.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button onClick={handleExportCommentAlerts} disabled={isExportingComments} className="nexus-btn" style={{ borderColor: "#fcd34d", color: "#b45309", backgroundColor: "#fffbeb" }}>
                      <DownloadCloud size={15} /> {isExportingComments ? "Extracting..." : "Export Logs"}
                    </button>
                    <span style={{ fontSize: "0.76rem", color: "#b45309", backgroundColor: "#fffbeb", border: "1px solid #fde68a", padding: "0.45rem 0.85rem", fontWeight: 700, borderRadius: "8px" }}>
                      {showCommentDetails ? "Hide Targets" : "View Targets"}
                    </span>
                  </div>
                </div>
                {showCommentDetails && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #fef3c7", backgroundColor: "#fffdf5", padding: "12px", borderRadius: "8px" }}>
                    <div className="clean-scroll" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "140px", overflowY: "auto" }}>
                      {commentAlerts.map((eps, idx) => (
                        <span 
                          key={idx} 
                          onClick={(e) => { e.stopPropagation(); setEpsInputValue(eps); }} 
                          style={{ 
                            backgroundColor: "#ffffff", 
                            border: "1px solid #fcd34d", 
                            padding: "4px 10px", 
                            borderRadius: "6px", 
                            fontSize: "0.78rem", 
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#92400e", 
                            cursor: "pointer" 
                          }}
                        >
                          {eps}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isScanningAlerts && !loading && records.length > 0 && validationAlerts.length === 0 && commentAlerts.length === 0 && (
              <div 
                className="hardware-accelerated" 
                style={{ 
                  marginBottom: "1.25rem", 
                  padding: "0.85rem 1.25rem", 
                  backgroundColor: "#eff6ff", 
                  border: "1px solid #bfdbfe", 
                  borderLeft: "4px solid #2563eb", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  borderRadius: "10px" 
                }}
              >
                <ShieldCheck size={20} color="#2563eb" />
                <span style={{ color: "#1e40af", fontSize: "0.84rem", fontWeight: 700, letterSpacing: "0.02em" }}>
                  SECTOR VERIFIED SECURE — 0 STATUS OR COMMENT ANOMALIES DETECTED
                </span>
              </div>
            )}
          </>
        )}

        {/* SUCCESS TOAST BANNER */}
        {successMsg && (
          <div 
            style={{ 
              marginBottom: "1.25rem", 
              color: "#1e40af", 
              display: "flex", 
              alignItems: "center", 
              gap: "10px", 
              padding: "0.95rem 1.25rem", 
              backgroundColor: "#eff6ff", 
              border: "1px solid #93c5fd",
              borderLeft: "4px solid #2563eb", 
              borderRadius: "10px", 
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.1)" 
            }}
          >
            <CheckCircle size={20} color="#2563eb" />
            <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>{successMsg}</span>
          </div>
        )}

        {/* MAIN SMART TABLE */}
        <div style={{ position: "relative", zIndex: 10 }}>
          <SmartTable 
            data={records} 
            loading={loading} 
            page={page} 
            setPage={setPage} 
            pageSize={pageSize} 
            setPageSize={setPageSize} 
            totalPages={totalPages} 
            totalItems={totalItems} 
            onEpsClick={(epsId) => fetchEpsHistory(epsId)}
          />
        </div>
      </div>
      
      {/* UPLOAD MODAL */}
      <FileUploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onUploadSuccess={handleUploadSuccess} 
        onSecurityAlert={handleSecurityAlert}
        defaultCategory={globalCategory} 
        defaultYear={globalYear} 
        defaultMonth={globalMonth}
        onFileDeleted={() => {
          setSuccessMsg("Target payload eliminated.");
          setTimeout(() => setSuccessMsg(""), 5000);
          setRefreshTrigger(prev => prev + 1); 
        }}
      />

      {/* MODAL 1: SINGLE EPS QUANTUM TIMELINE */}
      {isHistoryModalOpen && (
        <div 
          style={{ 
            position: "fixed", 
            inset: 0, 
            backgroundColor: "rgba(15, 23, 42, 0.45)", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            zIndex: 9999999, 
            backdropFilter: "blur(6px)" 
          }}
        >
          <div 
            className="hardware-accelerated" 
            style={{ 
              backgroundColor: "#ffffff", 
              border: "1px solid #bfdbfe", 
              borderRadius: "16px", 
              width: "700px", 
              maxWidth: "95%", 
              maxHeight: "85vh", 
              display: "flex", 
              flexDirection: "column", 
              boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(37, 99, 235, 0.08)",
              overflow: "hidden"
            }}
          >
            <div 
              style={{ 
                padding: "1.25rem 1.5rem", 
                borderBottom: "1px solid #e2e8f0", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                background: "linear-gradient(90deg, #eff6ff 0%, #ffffff 100%)" 
              }}
            >
              <h2 style={{ color: "#0f172a", margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Crosshair color="#2563eb" size={22} /> EPS VERSION TIMELINE
              </h2>
              <button 
                onClick={() => { setIsHistoryModalOpen(false); setEpsHistoryData([]); setHistoryEpsInput(""); }} 
                className="nexus-btn" 
                style={{ padding: "0.4rem" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: "1rem 1.5rem", display: "flex", gap: "10px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <input 
                type="text" 
                placeholder="Enter EPS Reference ID..." 
                value={historyEpsInput} 
                onChange={(e) => setHistoryEpsInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && fetchEpsHistory()} 
                className="clean-input" 
                style={{ flex: 1, backgroundColor: "#ffffff" }} 
                autoFocus
              />
              <button className="nexus-btn btn-primary-blue" style={{ padding: "0 1.4rem" }} onClick={() => fetchEpsHistory()}>
                Scan History
              </button>
            </div>

            <div className="clean-scroll" style={{ padding: "1.75rem", overflowY: "auto", flex: 1, backgroundColor: "#ffffff" }}>
              {loadingHistory && (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <Activity size={36} color="#2563eb" style={{ margin: "0 auto 1rem", animation: "pulse-subtle 1s infinite" }} />
                  <p style={{ color: "#2563eb", fontSize: "0.9rem", fontWeight: 600 }}>Retrieving version history...</p>
                </div>
              )}
              
              {!loadingHistory && epsHistoryData.length === 0 && historyEpsInput && (
                <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed #cbd5e1", backgroundColor: "#f8fafc", borderRadius: "12px" }}>
                  <ShieldAlert size={42} color="#64748b" style={{ margin: "0 auto 0.75rem" }} />
                  <p style={{ color: "#0f172a", fontSize: "1rem", fontWeight: 700, margin: 0 }}>No Version History Found</p>
                  <p style={{ color: "#64748b", fontSize: "0.82rem", marginTop: "4px" }}>Verify the EPS identifier or active sector cycle.</p>
                </div>
              )}

              {!loadingHistory && epsHistoryData.length > 0 && (
                <div style={{ position: "relative", paddingLeft: "32px", marginLeft: "10px" }}>
                  <div style={{ position: "absolute", left: "7px", top: "10px", bottom: "10px", width: "2px", background: "linear-gradient(to bottom, #93c5fd, #2563eb)" }} />
                  {epsHistoryData.map((item, index) => {
                    const isLatest = index === epsHistoryData.length - 1;
                    return (
                      <div 
                        key={index} 
                        style={{ 
                          marginBottom: "1.25rem", 
                          position: "relative", 
                          padding: "1.1rem 1.25rem", 
                          backgroundColor: isLatest ? "#eff6ff" : "#f8fafc", 
                          border: `1px solid ${isLatest ? "#93c5fd" : "#e2e8f0"}`, 
                          borderRadius: "12px" 
                        }}
                      >
                        <div 
                          style={{ 
                            position: "absolute", 
                            left: "-31px", 
                            top: "20px", 
                            width: "14px", 
                            height: "14px", 
                            borderRadius: "50%", 
                            backgroundColor: isLatest ? "#2563eb" : "#93c5fd", 
                            border: "3px solid #ffffff", 
                            boxShadow: "0 0 0 2px #bfdbfe" 
                          }} 
                        />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                          <span 
                            style={{ 
                              backgroundColor: isLatest ? "#2563eb" : "#dbeafe", 
                              color: isLatest ? "#ffffff" : "#1e40af", 
                              padding: "4px 12px", 
                              borderRadius: "6px", 
                              fontSize: "0.78rem", 
                              fontWeight: 800 
                            }}
                          >
                            {item.version} {isLatest ? "• LATEST" : ""}
                          </span>
                          <span style={{ color: "#64748b", fontSize: "0.78rem", fontFamily: "monospace", fontWeight: 600 }}>
                            {new Date(item.importedAt).toLocaleString()}
                          </span>
                        </div>
                        <div 
                          style={{ 
                            backgroundColor: "#ffffff", 
                            padding: "12px", 
                            borderRadius: "8px", 
                            color: "#1e293b", 
                            fontSize: "0.86rem", 
                            border: "1px solid #e2e8f0",
                            borderLeft: `3px solid ${isLatest ? "#2563eb" : "#94a3b8"}`,
                            fontFamily: "'Inter', sans-serif" 
                          }}
                        >
                          {item.commentaire || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No comment recorded for this version.</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GLOBAL TRACK */}
      {isTrackModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(6px)" }}>
          <div className="hardware-accelerated" style={{ backgroundColor: "#ffffff", border: "1px solid #bfdbfe", borderRadius: "16px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
              <h2 style={{ color: "#0f172a", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Layers color="#2563eb" size={24} /> Global Tracking Protocol
              </h2>
              <button onClick={() => setIsTrackModalOpen(false)} disabled={isTrackingGlobal} className="nexus-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem", alignItems: "center", background: "#f8fafc", padding: "0.85rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
              <span style={{ color: "#2563eb", fontSize: "0.82rem", fontWeight: 800, backgroundColor: "#eff6ff", padding: "4px 10px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                SECTOR: {globalCategory}
              </span>
              <CyberSelect width="145px" value={trackYear} options={trackYearOptions} onChange={setTrackYear} variant="purple" />
              <CyberSelect width="145px" value={trackMonth} options={trackMonthOptions} onChange={setTrackMonth} variant="purple" />
              <CyberSelect width="220px" value={trackEtat} options={etatOptions} onChange={setTrackEtat} variant="purple" />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#334155", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
                EPS Reference List (One per line or comma-separated)
              </label>
              <textarea 
                className="clean-textarea clean-scroll" 
                rows={7} 
                placeholder={trackEtat !== "ALL" ? "✅ Status filter active: Leave empty to extract all EPS matching this status, or paste specific EPS IDs." : "EPS-001424\nEPS-001425\nEPS-001426"} 
                value={trackEpsList} 
                onChange={(e) => setTrackEpsList(e.target.value)} 
                disabled={isTrackingGlobal}
              />
            </div>

            <button 
              onClick={executeGlobalTrack} 
              disabled={isTrackingGlobal || (trackEpsList.trim() === "" && trackEtat === "ALL")} 
              className="nexus-btn btn-primary-blue" 
              style={{ width: "100%", justifyContent: "center", padding: "0.9rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isTrackingGlobal ? "Extracting Global Timeline..." : "Generate Global Timeline Excel"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: TEAM EXPORT PROTOCOL */}
      {isTeamModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(6px)" }}>
          <div className="hardware-accelerated" style={{ backgroundColor: "#ffffff", border: "1px solid #bfdbfe", borderRadius: "16px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
              <h2 style={{ color: "#0f172a", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Users color="#2563eb" size={24} /> Team Export Protocol
              </h2>
              <button onClick={() => setIsTeamModalOpen(false)} disabled={isExportingTeam} className="nexus-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem", alignItems: "center", background: "#f8fafc", padding: "0.85rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
              <span style={{ color: "#2563eb", fontSize: "0.82rem", fontWeight: 800, backgroundColor: "#eff6ff", padding: "4px 10px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                SECTOR: {globalCategory}
              </span>
              <CyberSelect width="160px" value={teamYear} options={trackYearOptions} onChange={setTeamYear} variant="matrix" />
              <CyberSelect width="160px" value={teamMonth} options={trackMonthOptions} onChange={setTeamMonth} variant="matrix" />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#334155", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
                Team EPS Payload
              </label>
              <textarea 
                className="clean-textarea clean-scroll" 
                rows={7} 
                placeholder={"EPS-001424\nEPS-001425\nEPS-001426"} 
                value={teamEpsList} 
                onChange={(e) => setTeamEpsList(e.target.value)} 
                disabled={isExportingTeam}
              />
            </div>

            <button 
              onClick={executeTeamExport} 
              disabled={isExportingTeam || teamEpsList.trim() === ""} 
              className="nexus-btn btn-primary-blue" 
              style={{ width: "100%", justifyContent: "center", padding: "0.9rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isExportingTeam ? "Extracting Team Timelines..." : "Generate Team Export Excel"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: OMNI SEARCH PROTOCOL */}
      {isOmniSearchModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.45)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(6px)" }}>
          <div className="hardware-accelerated" style={{ backgroundColor: "#ffffff", border: "1px solid #bae6fd", borderRadius: "16px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 24px 48px -12px rgba(2, 132, 199, 0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
              <h2 style={{ color: "#0f172a", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Globe color="#0284c7" size={24} /> Omni Search Protocol
              </h2>
              <button onClick={() => setIsOmniSearchModalOpen(false)} disabled={isExportingOmniSearch} className="nexus-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "1.25rem", background: "#f0f9ff", padding: "0.9rem 1.1rem", borderRadius: "10px", border: "1px solid #bae6fd" }}>
              <p style={{ color: "#0369a1", margin: 0, fontSize: "0.84rem", lineHeight: 1.5, fontWeight: 500 }}>
                <strong style={{ color: "#075985" }}>CROSS-SECTOR SEARCH:</strong> This protocol bypasses Category, Year, and Month filters to scan the <span style={{ textDecoration: "underline", fontWeight: 700 }}>entire database</span> and extract every version of the requested EPS IDs.
              </p>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#334155", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
                Global EPS Payload
              </label>
              <textarea 
                className="clean-textarea clean-scroll" 
                rows={7} 
                placeholder={"EPS-100200\nEPS-100201\nEPS-100202"} 
                value={omniSearchEpsList} 
                onChange={(e) => setOmniSearchEpsList(e.target.value)} 
                disabled={isExportingOmniSearch}
              />
            </div>

            <button 
              onClick={executeOmniSearchExport} 
              disabled={isExportingOmniSearch || omniSearchEpsList.trim() === ""} 
              className="nexus-btn btn-primary-blue" 
              style={{ width: "100%", justifyContent: "center", padding: "0.9rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isExportingOmniSearch ? "Scanning Global Matrix..." : "Execute Global Omni Search"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}