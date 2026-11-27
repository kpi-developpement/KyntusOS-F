"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import TissueSmartTable from "./components/TissueSmartTable";
import TissueFileUploadModal from "./ui/TissueFileUploadModal";
import TissueSelect from "./TissueSelect";
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
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  Layers,
  Users,
  Globe,
  Hexagon
} from "lucide-react";

const API_BASE = "";

export default function TissueRecordsPage() {
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
        fetch(`${API_BASE}/api/tissue-records/alerts?category=${cat}&year=${yr}&month=${mo}`),
        fetch(`${API_BASE}/api/tissue-records/alerts-comments?category=${cat}&year=${yr}&month=${mo}`)
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
        const res = await fetch(`${API_BASE}/api/tissue-records/versions?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
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
        let url = `${API_BASE}/api/tissue-records/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}&page=${page}&size=${pageSize}`;
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
      setSuccessMsg(`TISSUE MATRIX UPDATED SECURELY!`);
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
      const res = await fetch(`${API_BASE}/api/tissue-records/history/${targetEps}?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) setEpsHistoryData(await res.json());
    } catch (error) {} finally {
      setLoadingHistory(false);
    }
  };

  const handleClearDB = async () => {
    if (!window.confirm(`CRITICAL OVERRIDE — TISSUE DB\n\nPURGE FOR SECTOR [ ${globalCategory} - ${formattedMonth}/${globalYear} ] ?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/tissue-records/clear?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg(`TISSUE SYSTEM: Sector obliterated.`);
        setTimeout(() => setSuccessMsg(""), 5000);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {}
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`${API_BASE}/api/tissue-records/export/1?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tissue_Matrix_Export_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`TISSUE SYSTEM: Matrix Extracted!`);
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
      const res = await fetch(`${API_BASE}/api/tissue-records/export-alerts?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tissue_Anomalies_Statut_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`TISSUE STATUS ANOMALIES EXTRACTED SUCCESSFULLY!`);
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
      const res = await fetch(`${API_BASE}/api/tissue-records/export-alerts-comments?category=${globalCategory}&year=${globalYear}&month=${globalMonth}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tissue_Anomalies_Commentaires_${globalCategory}_${globalYear}_${formattedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`TISSUE COMMENTS ANOMALIES EXTRACTED SUCCESSFULLY!`);
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (error) {} finally {
      setIsExportingComments(false);
    }
  };

  useEffect(() => {
    if (isTrackModalOpen) {
      fetch(`${API_BASE}/api/tissue-records/etats?category=${globalCategory}&year=${trackYear}&month=${trackMonth}`)
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

      const res = await fetch(`${API_BASE}/api/tissue-records/export-track-global?${queryParams.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(epsArray)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tissue_Global_Timeline_${globalCategory}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`TISSUE GLOBAL TIMELINE EXTRACTED!`);
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

      const res = await fetch(`${API_BASE}/api/tissue-equipe-export/track?${queryParams.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(epsArray)
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tissue_Export_Equipe_${globalCategory}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`TISSUE TEAM EXPORT EXTRACTED SUCCESSFULLY!`);
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
      const res = await fetch(`${API_BASE}/api/tissue-records/export-global-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(epsArray)
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tissue_Global_Omni_Search_Extract.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg(`TISSUE OMNI SEARCH EXTRACTED SUCCESSFULLY!`);
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
        minHeight: "100%",
        position: "relative",
        color: "#0f1e3d",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >

      <style>{`
        @keyframes tissueEntrance {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes modalBackdropIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes modalSpringPop {
          0% { opacity: 0; transform: scale(0.94) translateY(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .tissue-stage {
          animation: tissueEntrance 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Signature Emerald-Obsidian Glass Cards */
        .tissue-card {
          position: relative;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.92) 100%);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(52, 211, 153, 0.2);
          border-radius: 18px;
          box-shadow:
            0 1px 3px rgba(15, 30, 61, 0.07),
            0 12px 34px -8px rgba(16, 185, 129, 0.11),
            inset 0 1px 0 rgba(167, 243, 208, 0.05);
          transition:
            transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.28s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .tissue-card:hover {
          border-color: rgba(52, 211, 153, 0.42);
          box-shadow:
            0 8px 26px -4px rgba(15, 30, 61, 0.1),
            0 18px 44px -10px rgba(16, 185, 129, 0.17),
            inset 0 1px 0 rgba(167, 243, 208, 0.08);
        }

        .tissue-btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.58rem 1.1rem;
          background-color: rgba(255, 255, 255, 0.92);
          color: #0f1e3d;
          border: 1px solid rgba(52, 211, 153, 0.28);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.015em;
          border-radius: 11px;
          transition:
            transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            background-color 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            color 0.2s ease;
          box-shadow: 0 2px 4px rgba(15, 30, 61, 0.07);
          user-select: none;
        }

        .tissue-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -120%;
          width: 65%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(167, 243, 208, 0.2), transparent);
          transform: skewX(-20deg);
          transition: left 0.55s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        .tissue-btn:hover:not(:disabled)::before {
          left: 140%;
        }

        .tissue-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background-color: rgba(16, 185, 129, 0.18);
          border-color: rgba(52, 211, 153, 0.55);
        }

        .tissue-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.97);
        }

        .tissue-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-tissue-primary {
          background: linear-gradient(135deg, #10b981 0%, #0f766e 100%);
          color: #0f1e3d;
          border-color: #14b8a6;
          box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.22);
        }
        .btn-tissue-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
          border-color: #3ade9d;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .btn-tissue-emerald {
          background-color: rgba(16, 185, 129, 0.13);
          border-color: rgba(16, 185, 129, 0.38);
          color: #21976c;
        }
        .btn-tissue-emerald:hover:not(:disabled) {
          background-color: rgba(16, 185, 129, 0.24);
          border-color: #42d6a0;
          color: #0f1e3d;
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.17);
        }

        .btn-tissue-teal {
          background-color: rgba(20, 184, 166, 0.12);
          border-color: rgba(45, 212, 191, 0.34);
          color: #15a28c;
        }
        .btn-tissue-teal:hover:not(:disabled) {
          background-color: rgba(20, 184, 166, 0.22);
          border-color: #34e5c9;
          color: #0f1e3d;
          box-shadow: 0 6px 18px rgba(20, 184, 166, 0.17);
        }

        .btn-tissue-danger {
          background-color: rgba(244, 63, 94, 0.11);
          border-color: rgba(244, 63, 94, 0.34);
          color: #b3051e;
        }
        .btn-tissue-danger:hover:not(:disabled) {
          background-color: rgba(244, 63, 94, 0.22);
          border-color: #f9203f;
          color: #0f1e3d;
          box-shadow: 0 6px 18px rgba(244, 63, 94, 0.17);
        }

        .tissue-input {
          background-color: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(52, 211, 153, 0.24);
          color: #0f1e3d;
          padding: 0.55rem 0.85rem;
          border-radius: 11px;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          outline: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tissue-input::placeholder { color: #64748b; }
        .tissue-input:hover {
          border-color: rgba(52, 211, 153, 0.45);
          background-color: rgba(255, 255, 255, 0.92);
        }
        .tissue-input:focus {
          background-color: rgba(255, 255, 255, 0.92);
          border-color: #42d6a0;
          box-shadow: 0 0 0 3.5px rgba(16, 185, 129, 0.11), 0 4px 14px rgba(16, 185, 129, 0.12);
        }

        .tissue-textarea {
          background-color: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(52, 211, 153, 0.24);
          color: #0f1e3d;
          padding: 0.9rem 1rem;
          border-radius: 12px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.85rem;
          line-height: 1.5;
          outline: none;
          resize: vertical;
          width: 100%;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .tissue-textarea:focus {
          background-color: rgba(255, 255, 255, 0.92);
          border-color: #42d6a0;
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.11);
        }

        .tissue-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .tissue-scroll::-webkit-scrollbar-track { background-color: rgba(255, 255, 255, 0.85); border-radius: 6px; }
        .tissue-scroll::-webkit-scrollbar-thumb { background-color: rgba(52, 211, 153, 0.32); border-radius: 6px; }
        .tissue-scroll::-webkit-scrollbar-thumb:hover { background-color: #34d399; }

        .modal-backdrop-anim { animation: modalBackdropIn 0.22s ease forwards; }
        .modal-panel-anim { animation: modalSpringPop 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      <div className="tissue-stage" style={{ position: "relative", zIndex: 10, maxWidth: "1480px", margin: "0 auto" }}>

        {/* SECURITY BREACH LOGS */}
        {securityLogs.length > 0 && showSecurityLogs && (
          <div
            className="modal-panel-anim"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              borderLeft: "5px solid #f32649",
              borderRadius: "14px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.25rem",
              boxShadow: "0 12px 28px -6px rgba(244, 63, 94, 0.11)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ color: "#b3051e", margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, letterSpacing: "0.03em" }}>
                <ShieldAlert size={20} /> TISSUE SECURITY BREACH LOGS ({securityLogs.length})
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setShowSecurityLogs(false)} className="tissue-btn" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Minimize</button>
                <button onClick={handleClearSecurityLogs} className="tissue-btn btn-tissue-danger" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Clear Logs</button>
              </div>
            </div>
            <ul className="tissue-scroll" style={{ margin: 0, paddingLeft: "18px", color: "#0f1e3d", fontFamily: "monospace", fontSize: "0.82rem", maxHeight: "110px", overflowY: "auto" }}>
              {securityLogs.map((err, i) => (
                <li key={i} style={{ marginBottom: "6px", paddingBottom: "6px", borderBottom: "1px dashed rgba(244, 63, 94, 0.25)" }}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {securityLogs.length > 0 && !showSecurityLogs && (
          <button
            onClick={() => setShowSecurityLogs(true)}
            style={{
              width: "100%",
              backgroundColor: "rgba(244, 63, 94, 0.1)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "#b3051e",
              padding: "0.75rem",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.82rem",
              letterSpacing: "0.03em",
              marginBottom: "1.25rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            ⚠️ {securityLogs.length} TISSUE SECURITY BREACHES DETECTED — CLICK TO EXPAND
          </button>
        )}

        {/* TOP ENTERPRISE NAVIGATION HEADER — TISSUE SIGNATURE */}
        <header
          className="tissue-card"
          style={{
            padding: "1.15rem 1.55rem",
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            overflow: "hidden"
          }}
        >
          {/* Subtle top-left aurora accent stripe */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, #10b981 0%, #2dd4bf 50%, transparent 100%)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #10b981 0%, #0f766e 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 22px -4px rgba(16, 185, 129, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.28)"
              }}
            >
              <Hexagon size={24} color="#ffffff" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "9px", flexWrap: "wrap" }}>
                <h1 style={{ color: "#0f1e3d", margin: 0, fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  TISSUE <span style={{ background: "linear-gradient(90deg, #34d399, #2dd4bf)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NEXUS</span>
                </h1>
                <span
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.18)",
                    color: "#1a9e69",
                    border: "1px solid rgba(52, 211, 153, 0.38)",
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    padding: "2px 10px",
                    borderRadius: "999px",
                    letterSpacing: "0.06em"
                  }}
                >
                  TISSUE MATRIX
                </span>
              </div>
              <div style={{ color: "#475569", fontSize: "0.76rem", fontWeight: 500, marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#34d399", display: "inline-block", boxShadow: "0 0 0 3px rgba(52, 211, 153, 0.13)" }} />
                Dedicated Tissue Dossiers • 120FPS Telemetry &amp; Version Synchronization
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="tissue-btn btn-tissue-danger"
              onClick={handleClearDB}
              onMouseEnter={() => changeBgTheme("rgba(244, 63, 94, 0.05)")}
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <ShieldAlert size={15} /> Purge DB
            </button>

            <button
              className="tissue-btn btn-tissue-emerald"
              onClick={handleExport}
              disabled={isExporting}
              onMouseEnter={() => changeBgTheme("rgba(16, 185, 129, 0.05)")}
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <DownloadCloud size={15} /> {isExporting ? "Exporting..." : "Extract Excel"}
            </button>

            <button
              className="tissue-btn btn-tissue-emerald"
              onClick={() => setIsTrackModalOpen(true)}
              onMouseEnter={() => changeBgTheme("rgba(16, 185, 129, 0.05)")}
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <Crosshair size={15} /> Global Track
            </button>

            <button
              className="tissue-btn btn-tissue-emerald"
              onClick={() => setIsTeamModalOpen(true)}
              onMouseEnter={() => changeBgTheme("rgba(16, 185, 129, 0.05)")}
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <Users size={15} /> Team Export
            </button>

            <button
              className="tissue-btn btn-tissue-teal"
              onClick={() => setIsOmniSearchModalOpen(true)}
              onMouseEnter={() => changeBgTheme("rgba(20, 184, 166, 0.06)")}
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <Globe size={15} /> Omni Search
            </button>

            <button
              className="tissue-btn btn-tissue-primary"
              onClick={() => setIsModalOpen(true)}
              onMouseEnter={() => changeBgTheme("rgba(16, 185, 129, 0.08)")}
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <UploadCloud size={15} /> Inject Batch
            </button>
          </div>
        </header>

        {/* FILTER & SEARCH BAR */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "1.25rem", alignItems: "stretch", flexWrap: "wrap" }}>
          <div
            className="tissue-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "0.75rem 1.15rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#21976c", fontWeight: 700, fontSize: "0.78rem" }}>
              <Folder size={17} />
              <span>SECTOR</span>
            </div>
            <TissueSelect width="135px" value={globalCategory} options={categoryOptions} onChange={(val: string) => setGlobalCategory(val)} variant="emerald" />

            <div style={{ width: "1px", height: "22px", backgroundColor: "rgba(52, 211, 153, 0.2)", margin: "0 4px" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#15a28c", fontWeight: 700, fontSize: "0.78rem" }}>
              <Calendar size={17} />
              <span>CYCLE</span>
            </div>
            <TissueSelect width="95px" value={globalYear} options={yearOptions} onChange={setGlobalYear} variant="teal" />
            <TissueSelect width="95px" value={globalMonth} options={monthOptions} onChange={setGlobalMonth} variant="teal" />
          </div>

          <div
            className="tissue-card"
            style={{
              display: "flex",
              gap: "10px",
              padding: "0.75rem 1.15rem",
              alignItems: "center",
              flex: 1,
              minWidth: "300px"
            }}
          >
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
              <Search size={17} color="#34d399" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Search Tissue records by EPS Reference ID..."
                value={epsInputValue}
                onChange={(e) => setEpsInputValue(e.target.value)}
                className="tissue-input"
                style={{ width: "100%", paddingLeft: "2.35rem" }}
              />
            </div>

            <TissueSelect width="165px" value={serverVersion} options={versionOptions} onChange={(val: string) => { setServerVersion(val); setPage(0); }} variant="emerald" />

            {(serverVersion || epsInputValue) && (
              <button
                className="tissue-btn btn-tissue-danger"
                style={{ padding: "0.52rem 0.8rem", fontSize: "0.75rem" }}
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
            className="tissue-card"
            style={{
              marginBottom: "1.25rem",
              padding: "0.9rem 1.25rem",
              background: "rgba(16, 185, 129, 0.1)",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <Activity size={20} color="#34d399" style={{ animation: "pulse-subtle 1.2s infinite" }} />
            <span style={{ color: "#1a9e69", fontSize: "0.85rem", fontWeight: 600 }}>
              Scanning active Tissue matrix for status and comment anomalies...
            </span>
          </div>
        ) : (
          <>
            {!isScanningAlerts && validationAlerts.length > 0 && (
              <div
                onClick={() => setShowValidationDetails(!showValidationDetails)}
                className="modal-panel-anim"
                style={{
                  marginBottom: "1rem",
                  cursor: "pointer",
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(244, 63, 94, 0.35)",
                  borderLeft: "5px solid #f32649",
                  padding: "1rem 1.25rem",
                  borderRadius: "14px",
                  boxShadow: "0 8px 24px -4px rgba(244, 63, 94, 0.09)",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ backgroundColor: "rgba(244, 63, 94, 0.12)", padding: "8px", borderRadius: "10px", border: "1px solid rgba(244, 63, 94, 0.25)" }}>
                      <AlertTriangle size={22} color="#fb7185" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#b4041a" }}>
                        CRITICAL TISSUE STATUS ALERT
                      </h3>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", fontWeight: 500, color: "#b3051e" }}>
                        <strong>{validationAlerts.length} EPS</strong> stuck in &quot;EN_ATTENTE_VALIDATION&quot;.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button onClick={handleExportValidationAlerts} disabled={isExportingAlerts} className="tissue-btn btn-tissue-danger">
                      <DownloadCloud size={15} /> {isExportingAlerts ? "Extracting..." : "Export Logs"}
                    </button>
                    <span style={{ fontSize: "0.76rem", color: "#b3051e", backgroundColor: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)", padding: "0.45rem 0.85rem", fontWeight: 700, borderRadius: "8px" }}>
                      {showValidationDetails ? "Hide Targets" : "View Targets"}
                    </span>
                  </div>
                </div>
                {showValidationDetails && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(244, 63, 94, 0.2)", backgroundColor: "rgba(255, 255, 255, 0.55)", padding: "12px", borderRadius: "10px" }}>
                    <div className="tissue-scroll" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "140px", overflowY: "auto" }}>
                      {validationAlerts.map((eps, idx) => (
                        <span
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setEpsInputValue(eps); }}
                          style={{
                            backgroundColor: "rgba(244, 63, 94, 0.12)",
                            border: "1px solid rgba(244, 63, 94, 0.35)",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#b4041a",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
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
                className="modal-panel-anim"
                style={{
                  marginBottom: "1rem",
                  cursor: "pointer",
                  backgroundColor: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(245, 158, 11, 0.35)",
                  borderLeft: "5px solid #f6a723",
                  padding: "1rem 1.25rem",
                  borderRadius: "14px",
                  boxShadow: "0 8px 24px -4px rgba(245, 158, 11, 0.09)",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ backgroundColor: "rgba(245, 158, 11, 0.12)", padding: "8px", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                      <MessageSquare size={22} color="#fbbf24" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f1e3d" }}>
                        STALE TISSUE COMMENTS DETECTED
                      </h3>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", fontWeight: 500, color: "#b48303" }}>
                        <strong>{commentAlerts.length} EPS</strong> have duplicated or unchanged pilot comments across versions.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button onClick={handleExportCommentAlerts} disabled={isExportingComments} className="tissue-btn" style={{ borderColor: "rgba(245, 158, 11, 0.4)", color: "#0f1e3d", backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                      <DownloadCloud size={15} /> {isExportingComments ? "Extracting..." : "Export Logs"}
                    </button>
                    <span style={{ fontSize: "0.76rem", color: "#b48303", backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.45rem 0.85rem", fontWeight: 700, borderRadius: "8px" }}>
                      {showCommentDetails ? "Hide Targets" : "View Targets"}
                    </span>
                  </div>
                </div>
                {showCommentDetails && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(245, 158, 11, 0.2)", backgroundColor: "rgba(255, 255, 255, 0.55)", padding: "12px", borderRadius: "10px" }}>
                    <div className="tissue-scroll" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "140px", overflowY: "auto" }}>
                      {commentAlerts.map((eps, idx) => (
                        <span
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); setEpsInputValue(eps); }}
                          style={{
                            backgroundColor: "rgba(245, 158, 11, 0.12)",
                            border: "1px solid rgba(245, 158, 11, 0.35)",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#0f1e3d",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
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
                className="modal-panel-anim"
                style={{
                  marginBottom: "1.25rem",
                  padding: "0.85rem 1.25rem",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(52, 211, 153, 0.35)",
                  borderLeft: "4px solid #10b981",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  borderRadius: "12px"
                }}
              >
                <ShieldCheck size={20} color="#34d399" />
                <span style={{ color: "#1a9e69", fontSize: "0.84rem", fontWeight: 700, letterSpacing: "0.02em" }}>
                  TISSUE SECTOR VERIFIED SECURE — 0 STATUS OR COMMENT ANOMALIES DETECTED
                </span>
              </div>
            )}
          </>
        )}

        {/* SUCCESS TOAST BANNER */}
        {successMsg && (
          <div
            className="modal-panel-anim"
            style={{
              marginBottom: "1.25rem",
              color: "#0f1e3d",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "0.95rem 1.25rem",
              backgroundColor: "rgba(16, 185, 129, 0.16)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              borderLeft: "4px solid #10b981",
              borderRadius: "12px",
              boxShadow: "0 8px 22px -4px rgba(16, 185, 129, 0.17)"
            }}
          >
            <CheckCircle size={20} color="#34d399" />
            <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>{successMsg}</span>
          </div>
        )}

        {/* MAIN TISSUE SMART TABLE */}
        <div style={{ position: "relative", zIndex: 10 }}>
          <TissueSmartTable
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
      <TissueFileUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onSecurityAlert={handleSecurityAlert}
        defaultCategory={globalCategory}
        defaultYear={globalYear}
        defaultMonth={globalMonth}
        onFileDeleted={() => {
          setSuccessMsg("Tissue target payload eliminated.");
          setTimeout(() => setSuccessMsg(""), 5000);
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* MODAL 1: SINGLE EPS VERSION TIMELINE */}
      {isHistoryModalOpen && (
        <div
          className="modal-backdrop-anim"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            backdropFilter: "blur(14px)"
          }}
        >
          <div
            className="modal-panel-anim"
            style={{
              background: "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.92) 100%)",
              border: "1px solid rgba(52, 211, 153, 0.35)",
              borderRadius: "20px",
              width: "700px",
              maxWidth: "95%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 28px 56px -12px rgba(15, 30, 61, 0.18), 0 0 32px -10px rgba(16, 185, 129, 0.15)",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid rgba(52, 211, 153, 0.16)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(90deg, rgba(16, 185, 129, 0.16) 0%, rgba(255, 255, 255, 0.55) 100%)"
              }}
            >
              <h2 style={{ color: "#0f1e3d", margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Crosshair color="#34d399" size={22} /> TISSUE EPS VERSION TIMELINE
              </h2>
              <button
                onClick={() => { setIsHistoryModalOpen(false); setEpsHistoryData([]); setHistoryEpsInput(""); }}
                className="tissue-btn"
                style={{ padding: "0.4rem" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "1rem 1.5rem", display: "flex", gap: "10px", backgroundColor: "rgba(255, 255, 255, 0.8)", borderBottom: "1px solid rgba(52, 211, 153, 0.15)" }}>
              <input
                type="text"
                placeholder="Enter Tissue EPS Reference ID..."
                value={historyEpsInput}
                onChange={(e) => setHistoryEpsInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEpsHistory()}
                className="tissue-input"
                style={{ flex: 1 }}
                autoFocus
              />
              <button className="tissue-btn btn-tissue-primary" style={{ padding: "0 1.4rem" }} onClick={() => fetchEpsHistory()}>
                Scan History
              </button>
            </div>

            <div className="tissue-scroll" style={{ padding: "1.75rem", overflowY: "auto", flex: 1, backgroundColor: "transparent" }}>
              {loadingHistory && (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <Activity size={36} color="#34d399" style={{ margin: "0 auto 1rem", animation: "pulse-subtle 1s infinite" }} />
                  <p style={{ color: "#1a9e69", fontSize: "0.9rem", fontWeight: 600 }}>Retrieving Tissue version history...</p>
                </div>
              )}

              {!loadingHistory && epsHistoryData.length === 0 && historyEpsInput && (
                <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed rgba(52, 211, 153, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.75)", borderRadius: "12px" }}>
                  <ShieldAlert size={42} color="#64748b" style={{ margin: "0 auto 0.75rem" }} />
                  <p style={{ color: "#0f1e3d", fontSize: "1rem", fontWeight: 700, margin: 0 }}>No Tissue Version History Found</p>
                  <p style={{ color: "#475569", fontSize: "0.82rem", marginTop: "4px" }}>Verify the EPS identifier or active sector cycle.</p>
                </div>
              )}

              {!loadingHistory && epsHistoryData.length > 0 && (
                <div style={{ position: "relative", paddingLeft: "32px", marginLeft: "10px" }}>
                  <div style={{ position: "absolute", left: "7px", top: "10px", bottom: "10px", width: "2px", background: "linear-gradient(to bottom, #10b981, #2dd4bf)" }} />
                  {epsHistoryData.map((item, index) => {
                    const isLatest = index === epsHistoryData.length - 1;
                    return (
                      <div
                        key={index}
                        style={{
                          marginBottom: "1.25rem",
                          position: "relative",
                          padding: "1.1rem 1.25rem",
                          backgroundColor: isLatest ? "rgba(16, 185, 129, 0.16)" : "rgba(255, 255, 255, 0.8)",
                          border: `1px solid ${isLatest ? "rgba(52, 211, 153, 0.45)" : "rgba(52, 211, 153, 0.18)"}`,
                          borderRadius: "12px",
                          transition: "transform 0.2s ease, box-shadow 0.2s ease"
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
                            backgroundColor: isLatest ? "#34d399" : "#0d9488",
                            border: "3px solid rgba(37, 99, 235, 0.14)",
                            boxShadow: "0 0 0 2px rgba(52, 211, 153, 0.21)"
                          }}
                        />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                          <span
                            style={{
                              backgroundColor: isLatest ? "#10b981" : "rgba(16, 185, 129, 0.2)",
                              color: isLatest ? "#0f1e3d" : "#1a9e69",
                              padding: "4px 12px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 800
                            }}
                          >
                            {item.version} {isLatest ? "• LATEST" : ""}
                          </span>
                          <span style={{ color: "#475569", fontSize: "0.78rem", fontFamily: "monospace", fontWeight: 600 }}>
                            {new Date(item.importedAt).toLocaleString()}
                          </span>
                        </div>
                        <div
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.92)",
                            padding: "12px",
                            borderRadius: "8px",
                            color: "#0f1e3d",
                            fontSize: "0.86rem",
                            border: "1px solid rgba(52, 211, 153, 0.18)",
                            borderLeft: `3px solid ${isLatest ? "#42d6a0" : "#475569"}`,
                            fontFamily: "'Inter', sans-serif"
                          }}
                        >
                          {item.commentaire || <span style={{ color: "#64748b", fontStyle: "italic" }}>No comment recorded for this version.</span>}
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
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(255, 255, 255, 0.92)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(14px)" }}>
          <div className="modal-panel-anim" style={{ background: "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.92) 100%)", border: "1px solid rgba(52, 211, 153, 0.35)", borderRadius: "20px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 28px 56px -12px rgba(15, 30, 61, 0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(52, 211, 153, 0.16)", paddingBottom: "14px" }}>
              <h2 style={{ color: "#0f1e3d", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Layers color="#34d399" size={24} /> Tissue Global Tracking Protocol
              </h2>
              <button onClick={() => setIsTrackModalOpen(false)} disabled={isTrackingGlobal} className="tissue-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem", alignItems: "center", background: "rgba(255, 255, 255, 0.85)", padding: "0.85rem 1rem", borderRadius: "12px", border: "1px solid rgba(52, 211, 153, 0.18)", flexWrap: "wrap" }}>
              <span style={{ color: "#1a9e69", fontSize: "0.82rem", fontWeight: 800, backgroundColor: "rgba(16, 185, 129, 0.18)", padding: "5px 10px", borderRadius: "8px", border: "1px solid rgba(52, 211, 153, 0.35)" }}>
                SECTOR: {globalCategory}
              </span>
              <TissueSelect width="145px" value={trackYear} options={trackYearOptions} onChange={setTrackYear} variant="emerald" />
              <TissueSelect width="145px" value={trackMonth} options={trackMonthOptions} onChange={setTrackMonth} variant="emerald" />
              <TissueSelect width="220px" value={trackEtat} options={etatOptions} onChange={setTrackEtat} variant="teal" />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#475569", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
                Tissue EPS Reference List (One per line or comma-separated)
              </label>
              <textarea
                className="tissue-textarea tissue-scroll"
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
              className="tissue-btn btn-tissue-primary"
              style={{ width: "100%", justifyContent: "center", padding: "0.95rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isTrackingGlobal ? "Extracting Tissue Global Timeline..." : "Generate Tissue Global Timeline Excel"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: TEAM EXPORT PROTOCOL */}
      {isTeamModalOpen && (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(255, 255, 255, 0.92)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(14px)" }}>
          <div className="modal-panel-anim" style={{ background: "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.92) 100%)", border: "1px solid rgba(52, 211, 153, 0.35)", borderRadius: "20px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 28px 56px -12px rgba(15, 30, 61, 0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(52, 211, 153, 0.16)", paddingBottom: "14px" }}>
              <h2 style={{ color: "#0f1e3d", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Users color="#34d399" size={24} /> Tissue Team Export Protocol
              </h2>
              <button onClick={() => setIsTeamModalOpen(false)} disabled={isExportingTeam} className="tissue-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem", alignItems: "center", background: "rgba(255, 255, 255, 0.85)", padding: "0.85rem 1rem", borderRadius: "12px", border: "1px solid rgba(52, 211, 153, 0.18)", flexWrap: "wrap" }}>
              <span style={{ color: "#1a9e69", fontSize: "0.82rem", fontWeight: 800, backgroundColor: "rgba(16, 185, 129, 0.18)", padding: "5px 10px", borderRadius: "8px", border: "1px solid rgba(52, 211, 153, 0.35)" }}>
                SECTOR: {globalCategory}
              </span>
              <TissueSelect width="160px" value={teamYear} options={trackYearOptions} onChange={setTeamYear} variant="teal" />
              <TissueSelect width="160px" value={teamMonth} options={trackMonthOptions} onChange={setTeamMonth} variant="teal" />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#475569", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
                Tissue Team EPS Payload
              </label>
              <textarea
                className="tissue-textarea tissue-scroll"
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
              className="tissue-btn btn-tissue-primary"
              style={{ width: "100%", justifyContent: "center", padding: "0.95rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isExportingTeam ? "Extracting Tissue Team Timelines..." : "Generate Tissue Team Export Excel"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: OMNI SEARCH PROTOCOL */}
      {isOmniSearchModalOpen && (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(255, 255, 255, 0.92)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(14px)" }}>
          <div className="modal-panel-anim" style={{ background: "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.92) 100%)", border: "1px solid rgba(52, 211, 153, 0.35)", borderRadius: "20px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 28px 56px -12px rgba(15, 30, 61, 0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(52, 211, 153, 0.16)", paddingBottom: "14px" }}>
              <h2 style={{ color: "#0f1e3d", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Globe color="#2dd4bf" size={24} /> Tissue Omni Search Protocol
              </h2>
              <button onClick={() => setIsOmniSearchModalOpen(false)} disabled={isExportingOmniSearch} className="tissue-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "1.25rem", background: "rgba(16, 185, 129, 0.12)", padding: "0.9rem 1.1rem", borderRadius: "12px", border: "1px solid rgba(52, 211, 153, 0.25)" }}>
              <p style={{ color: "#0f1e3d", margin: 0, fontSize: "0.84rem", lineHeight: 1.5, fontWeight: 500 }}>
                <strong style={{ color: "#21976c" }}>CROSS-SECTOR TISSUE SEARCH:</strong> This protocol bypasses Category, Year, and Month filters to scan the <span style={{ textDecoration: "underline", fontWeight: 700 }}>entire Tissue database</span> and extract every version of the requested EPS IDs.
              </p>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#475569", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
                Global Tissue EPS Payload
              </label>
              <textarea
                className="tissue-textarea tissue-scroll"
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
              className="tissue-btn btn-tissue-primary"
              style={{ width: "100%", justifyContent: "center", padding: "0.95rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isExportingOmniSearch ? "Scanning Tissue Matrix..." : "Execute Tissue Global Omni Search"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}
