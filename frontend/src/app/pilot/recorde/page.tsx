"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import SmartTable from "./components/SmartTable";
import FileUploadModal from "./ui/FileUploadModal";
import CyberSelect from "./CyberSelect";
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
  Globe
} from "lucide-react";

const API_BASE = "";

/**
 * 🔥 120 FPS INTERACTIVE DARK-MODE CANVAS 🔥
 * Specifically tuned to blend with the parent's `#02040a` deep black background.
 * Uses a deep Midnight Blue gradient and Electric Cyan interactive nodes.
 */
const InteractiveDarkCanvas = React.memo(({ overlayRef }: { overlayRef: React.RefObject<HTMLDivElement | null> }) => {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      active: false
    };

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
    }

    interface Shockwave {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
    }

    // High-contrast neon palette for dark mode
    const palette = ["#0ea5e9", "#0284c7", "#38bdf8", "#7dd3fc", "#0369a1"];
    const particleCount = Math.min(65, Math.floor((width * height) / 22000));
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.75,
      vy: (Math.random() - 0.5) * 0.75,
      radius: Math.random() * 2.2 + 1.2,
      color: palette[Math.floor(Math.random() * palette.length)],
      alpha: Math.random() * 0.6 + 0.3
    }));

    const shockwaves: Shockwave[] = [];

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseDown = (e: MouseEvent) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 4,
        maxRadius: 240,
        alpha: 0.55
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      mouse.x += (mouse.targetX - mouse.x) * 0.12;
      mouse.y += (mouse.targetY - mouse.y) * 0.12;

      // 1. Ambient Cursor Spotlight (Electric Blue Glow on Deep Black)
      const spotlight = ctx.createRadialGradient(mouse.x, mouse.y, 10, mouse.x, mouse.y, 450);
      spotlight.addColorStop(0, "rgba(2, 132, 199, 0.15)");
      spotlight.addColorStop(0.45, "rgba(14, 165, 233, 0.05)");
      spotlight.addColorStop(1, "rgba(2, 4, 10, 0)"); // Matches your PilotLayout background
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);

      // 2. Interactive Dot Matrix
      const gridSpacing = 48;
      const startX = Math.max(0, Math.floor((mouse.x - 280) / gridSpacing) * gridSpacing);
      const endX = Math.min(width, Math.ceil((mouse.x + 280) / gridSpacing) * gridSpacing);
      const startY = Math.max(0, Math.floor((mouse.y - 280) / gridSpacing) * gridSpacing);
      const endY = Math.min(height, Math.ceil((mouse.y + 280) / gridSpacing) * gridSpacing);

      for (let gx = startX; gx <= endX; gx += gridSpacing) {
        for (let gy = startY; gy <= endY; gy += gridSpacing) {
          const dx = gx - mouse.x;
          const dy = gy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 260) {
            const intensity = (1 - dist / 260) * 0.55;
            ctx.fillStyle = `rgba(56, 189, 248, ${intensity})`;
            ctx.beginPath();
            ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += 6.5;
        sw.alpha *= 0.93;
        ctx.strokeStyle = `rgba(56, 189, 248, ${sw.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        if (sw.radius >= sw.maxRadius || sw.alpha < 0.01) {
          shockwaves.splice(i, 1);
        }
      }

      // 4. Constellation Nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < 220 && distMouse > 5) {
          const force = (220 - distMouse) / 220;
          ctx.strokeStyle = `rgba(14, 165, 233, ${force * 0.4})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const lineAlpha = (1 - dist / 140) * 0.25;
            ctx.strokeStyle = `rgba(2, 132, 199, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, [mounted]);

  if (!mounted) return null;

  // Render directly into the page layer (not via portal) to respect the layout bounds
  return (
    <div 
      style={{ 
        position: "fixed", 
        inset: 0, 
        zIndex: -1, 
        pointerEvents: "none", 
        overflow: "hidden"
      }}
    >
      {/* Base Architectural Gradient matching parent #02040a */}
      <div 
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(at 0% 0%, rgba(2, 132, 199, 0.08) 0px, transparent 60%),
            radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.06) 0px, transparent 60%),
            linear-gradient(to right, rgba(15, 23, 42, 0.8) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(15, 23, 42, 0.8) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
          zIndex: 1
        }}
      />
      <div 
        ref={overlayRef} 
        style={{ 
          position: "absolute", 
          inset: 0, 
          backgroundColor: "transparent", 
          transition: "background-color 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 2
        }} 
      />
      <canvas 
        ref={canvasRef} 
        style={{ 
          position: "absolute", 
          inset: 0, 
          width: "100%", 
          height: "100%",
          zIndex: 3 
        }} 
      />
    </div>
  );
});

InteractiveDarkCanvas.displayName = "InteractiveDarkCanvas";

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
        minHeight: "100%", 
        position: "relative", 
        color: "#f8fafc",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <InteractiveDarkCanvas overlayRef={bgOverlayRef} />

      <style>{`
        @keyframes pageEntrance {
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

        .nexus-stage {
          animation: pageEntrance 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* 
          Dark Theme Cards: Deep dark surface with slight blue tint,
          blends perfectly into the #02040a background while maintaining
          the high-end stripe/linear glass feel.
        */
        .nexus-card {
          position: relative;
          background: rgba(11, 15, 25, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(56, 189, 248, 0.15);
          border-radius: 16px;
          box-shadow: 
            0 1px 3px rgba(0, 0, 0, 0.2),
            0 10px 30px -6px rgba(2, 132, 199, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: 
            transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
            border-color 0.28s cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .nexus-card:hover {
          border-color: rgba(56, 189, 248, 0.35);
          box-shadow: 
            0 8px 24px -4px rgba(0, 0, 0, 0.3),
            0 16px 40px -8px rgba(2, 132, 199, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        /* Buttons tuned for dark mode */
        .nexus-btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0.58rem 1.08rem;
          background-color: rgba(15, 23, 42, 0.6);
          color: #f1f5f9;
          border: 1px solid rgba(148, 163, 184, 0.3);
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.01em;
          border-radius: 10px;
          transition: 
            transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            background-color 0.2s ease,
            border-color 0.2s ease,
            box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            color 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          user-select: none;
        }

        .nexus-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -120%;
          width: 65%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
          transform: skewX(-20deg);
          transition: left 0.55s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }

        .nexus-btn:hover:not(:disabled)::before {
          left: 140%;
        }

        .nexus-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background-color: rgba(30, 41, 59, 0.8);
          border-color: rgba(148, 163, 184, 0.5);
        }

        .nexus-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.97);
        }

        .nexus-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-primary-blue {
          background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
          color: #ffffff;
          border-color: #0369a1;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
        .btn-primary-blue:hover:not(:disabled) {
          background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
          border-color: #0ea5e9;
          box-shadow: 0 8px 22px rgba(14, 165, 233, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        }

        .btn-soft-blue {
          background-color: rgba(2, 132, 199, 0.15);
          border-color: rgba(2, 132, 199, 0.4);
          color: #38bdf8;
        }
        .btn-soft-blue:hover:not(:disabled) {
          background-color: rgba(2, 132, 199, 0.25);
          border-color: #38bdf8;
          color: #bae6fd;
          box-shadow: 0 6px 16px rgba(2, 132, 199, 0.25);
        }

        .btn-sky-blue {
          background-color: rgba(56, 189, 248, 0.1);
          border-color: rgba(56, 189, 248, 0.3);
          color: #7dd3fc;
        }
        .btn-sky-blue:hover:not(:disabled) {
          background-color: rgba(56, 189, 248, 0.2);
          border-color: #7dd3fc;
          color: #e0f2fe;
          box-shadow: 0 6px 16px rgba(56, 189, 248, 0.25);
        }

        .btn-danger-clean {
          background-color: rgba(220, 38, 38, 0.1);
          border-color: rgba(220, 38, 38, 0.3);
          color: #f87171;
        }
        .btn-danger-clean:hover:not(:disabled) {
          background-color: rgba(220, 38, 38, 0.2);
          border-color: #f87171;
          color: #fca5a5;
          box-shadow: 0 6px 16px rgba(220, 38, 38, 0.25);
        }

        .clean-input {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #f8fafc;
          padding: 0.55rem 0.85rem;
          border-radius: 10px;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          outline: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .clean-input::placeholder {
          color: #64748b;
        }
        .clean-input:hover {
          border-color: rgba(56, 189, 248, 0.4);
          background-color: rgba(15, 23, 42, 0.8);
        }
        .clean-input:focus {
          background-color: rgba(15, 23, 42, 0.9);
          border-color: #38bdf8;
          box-shadow: 0 0 0 3.5px rgba(56, 189, 248, 0.15), 0 4px 12px rgba(2, 132, 199, 0.2);
        }

        .clean-textarea {
          background-color: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.3);
          color: #f8fafc;
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
        .clean-textarea:focus {
          background-color: rgba(15, 23, 42, 0.9);
          border-color: #38bdf8;
          box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
        }

        .clean-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .clean-scroll::-webkit-scrollbar-track { background-color: rgba(15, 23, 42, 0.5); border-radius: 6px; }
        .clean-scroll::-webkit-scrollbar-thumb { background-color: rgba(56, 189, 248, 0.3); border-radius: 6px; }
        .clean-scroll::-webkit-scrollbar-thumb:hover { background-color: #38bdf8; }

        .modal-backdrop-anim { animation: modalBackdropIn 0.22s ease forwards; }
        .modal-panel-anim { animation: modalSpringPop 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      <div className="nexus-stage" style={{ position: "relative", zIndex: 10, maxWidth: "1480px", margin: "0 auto" }}>
        
        {/* SECURITY BREACH LOGS */}
        {securityLogs.length > 0 && showSecurityLogs && (
          <div 
            className="modal-panel-anim" 
            style={{ 
              backgroundColor: "rgba(15, 23, 42, 0.9)", 
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(239, 68, 68, 0.3)", 
              borderLeft: "5px solid #ef4444",
              borderRadius: "14px", 
              padding: "1.25rem 1.5rem", 
              marginBottom: "1.25rem", 
              boxShadow: "0 12px 28px -6px rgba(220, 38, 38, 0.15)" 
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 style={{ color: "#ef4444", margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, letterSpacing: "0.03em" }}>
                <ShieldAlert size={20} /> SECURITY BREACH LOGS ({securityLogs.length})
              </h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setShowSecurityLogs(false)} className="nexus-btn" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Minimize</button>
                <button onClick={handleClearSecurityLogs} className="nexus-btn btn-danger-clean" style={{ padding: "4px 10px", fontSize: "0.75rem" }}>Clear Logs</button>
              </div>
            </div>
            <ul className="clean-scroll" style={{ margin: 0, paddingLeft: "18px", color: "#fca5a5", fontFamily: "monospace", fontSize: "0.82rem", maxHeight: "110px", overflowY: "auto" }}>
              {securityLogs.map((err, i) => (
                <li key={i} style={{ marginBottom: "6px", paddingBottom: "6px", borderBottom: "1px dashed rgba(239, 68, 68, 0.2)" }}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {securityLogs.length > 0 && !showSecurityLogs && (
          <button 
            onClick={() => setShowSecurityLogs(true)} 
            style={{ 
              width: "100%", 
              backgroundColor: "rgba(220, 38, 38, 0.1)", 
              border: "1px solid rgba(220, 38, 38, 0.3)", 
              color: "#f87171", 
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
            ⚠️ {securityLogs.length} SECURITY BREACHES DETECTED — CLICK TO EXPAND
          </button>
        )}

        {/* TOP ENTERPRISE NAVIGATION BAR */}
        <header 
          className="nexus-card" 
          style={{ 
            padding: "1.15rem 1.5rem", 
            marginBottom: "1rem", 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div 
              style={{ 
                width: "46px", 
                height: "46px", 
                borderRadius: "13px", 
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                boxShadow: "0 8px 20px -4px rgba(2, 132, 199, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.2)"
              }}
            >
              <LayoutDashboard size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1 style={{ color: "#f8fafc", margin: 0, fontSize: "1.38rem", fontWeight: 800, letterSpacing: "-0.025em" }}>
                  KYNTUS <span style={{ color: "#38bdf8" }}>NEXUS</span>
                </h1>
                <span 
                  style={{ 
                    backgroundColor: "rgba(2, 132, 199, 0.2)", 
                    color: "#7dd3fc", 
                    border: "1px solid rgba(56, 189, 248, 0.3)", 
                    fontSize: "0.68rem", 
                    fontWeight: 700, 
                    padding: "2px 9px", 
                    borderRadius: "999px",
                    letterSpacing: "0.04em"
                  }}
                >
                  PRO MATRIX
                </span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.76rem", fontWeight: 500, marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#38bdf8", display: "inline-block", boxShadow: "0 0 0 3px rgba(56, 189, 248, 0.2)" }} />
                Interactive 120FPS Telemetry & Version Synchronization
              </div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button 
              className="nexus-btn btn-danger-clean" 
              onClick={handleClearDB} 
              onMouseEnter={() => changeBgTheme("rgba(239, 68, 68, 0.05)")} 
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <ShieldAlert size={15} /> Purge DB
            </button>

            <button 
              className="nexus-btn btn-soft-blue" 
              onClick={handleExport} 
              disabled={isExporting} 
              onMouseEnter={() => changeBgTheme("rgba(2, 132, 199, 0.05)")} 
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <DownloadCloud size={15} /> {isExporting ? "Exporting..." : "Extract Excel"}
            </button>

            <button 
              className="nexus-btn btn-soft-blue" 
              onClick={() => setIsTrackModalOpen(true)}
              onMouseEnter={() => changeBgTheme("rgba(2, 132, 199, 0.05)")} 
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <Crosshair size={15} /> Global Track
            </button>

            <button 
              className="nexus-btn btn-soft-blue" 
              onClick={() => setIsTeamModalOpen(true)}
              onMouseEnter={() => changeBgTheme("rgba(2, 132, 199, 0.05)")} 
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <Users size={15} /> Team Export
            </button>

            <button 
              className="nexus-btn btn-sky-blue" 
              onClick={() => setIsOmniSearchModalOpen(true)}
              onMouseEnter={() => changeBgTheme("rgba(56, 189, 248, 0.05)")} 
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <Globe size={15} /> Omni Search
            </button>

            <button 
              className="nexus-btn btn-primary-blue" 
              onClick={() => setIsModalOpen(true)}
              onMouseEnter={() => changeBgTheme("rgba(2, 132, 199, 0.08)")} 
              onMouseLeave={() => changeBgTheme("transparent")}
            >
              <UploadCloud size={15} /> Inject Batch
            </button>
          </div>
        </header>

        {/* FILTER & SEARCH BAR */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "1.25rem", alignItems: "stretch", flexWrap: "wrap" }}>
          <div 
            className="nexus-card" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "10px", 
              padding: "0.75rem 1.15rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: 700, fontSize: "0.78rem" }}>
              <Folder size={17} />
              <span>SECTOR</span>
            </div>
            <CyberSelect width="135px" value={globalCategory} options={categoryOptions} onChange={(val: string) => setGlobalCategory(val)} variant="sky" />
            
            <div style={{ width: "1px", height: "22px", backgroundColor: "rgba(148, 163, 184, 0.2)", margin: "0 4px" }} />
            
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#7dd3fc", fontWeight: 700, fontSize: "0.78rem" }}>
              <Calendar size={17} />
              <span>CYCLE</span>
            </div>
            <CyberSelect width="95px" value={globalYear} options={yearOptions} onChange={setGlobalYear} variant="matrix" />
            <CyberSelect width="95px" value={globalMonth} options={monthOptions} onChange={setGlobalMonth} variant="matrix" />
          </div>

          <div 
            className="nexus-card" 
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
              <Search size={17} color="#38bdf8" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
              <input 
                type="text" 
                placeholder="Search by EPS Reference ID..." 
                value={epsInputValue} 
                onChange={(e) => setEpsInputValue(e.target.value)} 
                className="clean-input" 
                style={{ width: "100%", paddingLeft: "2.35rem" }} 
              />
            </div>

            <CyberSelect width="165px" value={serverVersion} options={versionOptions} onChange={(val: string) => { setServerVersion(val); setPage(0); }} variant="sky" />
            
            {(serverVersion || epsInputValue) && ( 
              <button 
                className="nexus-btn btn-danger-clean" 
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
            className="nexus-card" 
            style={{ 
              marginBottom: "1.25rem", 
              padding: "0.9rem 1.25rem", 
              backgroundColor: "rgba(2, 132, 199, 0.1)", 
              display: "flex", 
              alignItems: "center", 
              gap: "12px" 
            }}
          >
            <Activity size={20} color="#38bdf8" style={{ animation: "pulse-subtle 1.2s infinite" }} />
            <span style={{ color: "#7dd3fc", fontSize: "0.85rem", fontWeight: 600 }}>
              Scanning active matrix for status and comment anomalies...
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
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(239, 68, 68, 0.3)", 
                  borderLeft: "5px solid #ef4444", 
                  padding: "1rem 1.25rem", 
                  borderRadius: "14px",
                  boxShadow: "0 8px 24px -4px rgba(220, 38, 38, 0.15)",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", padding: "8px", borderRadius: "10px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                      <AlertTriangle size={22} color="#f87171" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#fca5a5" }}>
                        CRITICAL STATUS ALERT
                      </h3>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", fontWeight: 500, color: "#f87171" }}>
                        <strong>{validationAlerts.length} EPS</strong> stuck in &quot;EN_ATTENTE_VALIDATION&quot;.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button onClick={handleExportValidationAlerts} disabled={isExportingAlerts} className="nexus-btn btn-danger-clean">
                      <DownloadCloud size={15} /> {isExportingAlerts ? "Extracting..." : "Export Logs"}
                    </button>
                    <span style={{ fontSize: "0.76rem", color: "#f87171", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "0.45rem 0.85rem", fontWeight: 700, borderRadius: "8px" }}>
                      {showValidationDetails ? "Hide Targets" : "View Targets"}
                    </span>
                  </div>
                </div>
                {showValidationDetails && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(239, 68, 68, 0.2)", backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "12px", borderRadius: "10px" }}>
                    <div className="clean-scroll" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "140px", overflowY: "auto" }}>
                      {validationAlerts.map((eps, idx) => (
                        <span 
                          key={idx} 
                          onClick={(e) => { e.stopPropagation(); setEpsInputValue(eps); }} 
                          style={{ 
                            backgroundColor: "rgba(239, 68, 68, 0.1)", 
                            border: "1px solid rgba(239, 68, 68, 0.3)", 
                            padding: "4px 10px", 
                            borderRadius: "6px", 
                            fontSize: "0.78rem", 
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#fca5a5", 
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
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(245, 158, 11, 0.3)", 
                  borderLeft: "5px solid #f59e0b", 
                  padding: "1rem 1.25rem", 
                  borderRadius: "14px",
                  boxShadow: "0 8px 24px -4px rgba(245, 158, 11, 0.15)",
                  transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", padding: "8px", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                      <MessageSquare size={22} color="#fbbf24" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#fcd34d" }}>
                        STALE COMMENTS DETECTED
                      </h3>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", fontWeight: 500, color: "#fbbf24" }}>
                        <strong>{commentAlerts.length} EPS</strong> have duplicated or unchanged pilot comments across versions.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button onClick={handleExportCommentAlerts} disabled={isExportingComments} className="nexus-btn" style={{ borderColor: "rgba(245, 158, 11, 0.4)", color: "#fcd34d", backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
                      <DownloadCloud size={15} /> {isExportingComments ? "Extracting..." : "Export Logs"}
                    </button>
                    <span style={{ fontSize: "0.76rem", color: "#fbbf24", backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.45rem 0.85rem", fontWeight: 700, borderRadius: "8px" }}>
                      {showCommentDetails ? "Hide Targets" : "View Targets"}
                    </span>
                  </div>
                </div>
                {showCommentDetails && (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(245, 158, 11, 0.2)", backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "12px", borderRadius: "10px" }}>
                    <div className="clean-scroll" style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "140px", overflowY: "auto" }}>
                      {commentAlerts.map((eps, idx) => (
                        <span 
                          key={idx} 
                          onClick={(e) => { e.stopPropagation(); setEpsInputValue(eps); }} 
                          style={{ 
                            backgroundColor: "rgba(245, 158, 11, 0.1)", 
                            border: "1px solid rgba(245, 158, 11, 0.3)", 
                            padding: "4px 10px", 
                            borderRadius: "6px", 
                            fontSize: "0.78rem", 
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#fcd34d", 
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
                  backgroundColor: "rgba(16, 185, 129, 0.1)", 
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(16, 185, 129, 0.3)", 
                  borderLeft: "4px solid #10b981", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  borderRadius: "12px" 
                }}
              >
                <ShieldCheck size={20} color="#34d399" />
                <span style={{ color: "#6ee7b7", fontSize: "0.84rem", fontWeight: 700, letterSpacing: "0.02em" }}>
                  SECTOR VERIFIED SECURE — 0 STATUS OR COMMENT ANOMALIES DETECTED
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
              color: "#7dd3fc", 
              display: "flex", 
              alignItems: "center", 
              gap: "10px", 
              padding: "0.95rem 1.25rem", 
              backgroundColor: "rgba(2, 132, 199, 0.15)", 
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderLeft: "4px solid #0284c7", 
              borderRadius: "12px", 
              boxShadow: "0 8px 20px -4px rgba(2, 132, 199, 0.25)" 
            }}
          >
            <CheckCircle size={20} color="#38bdf8" />
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
          className="modal-backdrop-anim"
          style={{ 
            position: "fixed", 
            inset: 0, 
            backgroundColor: "rgba(2, 4, 10, 0.65)", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            zIndex: 99999, 
            backdropFilter: "blur(12px)" 
          }}
        >
          <div 
            className="modal-panel-anim" 
            style={{ 
              backgroundColor: "rgba(11, 15, 25, 0.95)", 
              border: "1px solid rgba(56, 189, 248, 0.3)", 
              borderRadius: "18px", 
              width: "700px", 
              maxWidth: "95%", 
              maxHeight: "85vh", 
              display: "flex", 
              flexDirection: "column", 
              boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(2, 132, 199, 0.2)",
              overflow: "hidden"
            }}
          >
            <div 
              style={{ 
                padding: "1.25rem 1.5rem", 
                borderBottom: "1px solid rgba(148, 163, 184, 0.15)", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                background: "linear-gradient(90deg, rgba(2, 132, 199, 0.15) 0%, rgba(11, 15, 25, 0) 100%)" 
              }}
            >
              <h2 style={{ color: "#f8fafc", margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Crosshair color="#38bdf8" size={22} /> EPS VERSION TIMELINE
              </h2>
              <button 
                onClick={() => { setIsHistoryModalOpen(false); setEpsHistoryData([]); setHistoryEpsInput(""); }} 
                className="nexus-btn" 
                style={{ padding: "0.4rem" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: "1rem 1.5rem", display: "flex", gap: "10px", backgroundColor: "rgba(15, 23, 42, 0.4)", borderBottom: "1px solid rgba(148, 163, 184, 0.15)" }}>
              <input 
                type="text" 
                placeholder="Enter EPS Reference ID..." 
                value={historyEpsInput} 
                onChange={(e) => setHistoryEpsInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && fetchEpsHistory()} 
                className="clean-input" 
                style={{ flex: 1 }} 
                autoFocus
              />
              <button className="nexus-btn btn-primary-blue" style={{ padding: "0 1.4rem" }} onClick={() => fetchEpsHistory()}>
                Scan History
              </button>
            </div>

            <div className="clean-scroll" style={{ padding: "1.75rem", overflowY: "auto", flex: 1, backgroundColor: "transparent" }}>
              {loadingHistory && (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <Activity size={36} color="#38bdf8" style={{ margin: "0 auto 1rem", animation: "pulse-subtle 1s infinite" }} />
                  <p style={{ color: "#7dd3fc", fontSize: "0.9rem", fontWeight: 600 }}>Retrieving version history...</p>
                </div>
              )}
              
              {!loadingHistory && epsHistoryData.length === 0 && historyEpsInput && (
                <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed rgba(148, 163, 184, 0.3)", backgroundColor: "rgba(15, 23, 42, 0.4)", borderRadius: "12px" }}>
                  <ShieldAlert size={42} color="#64748b" style={{ margin: "0 auto 0.75rem" }} />
                  <p style={{ color: "#f8fafc", fontSize: "1rem", fontWeight: 700, margin: 0 }}>No Version History Found</p>
                  <p style={{ color: "#94a3b8", fontSize: "0.82rem", marginTop: "4px" }}>Verify the EPS identifier or active sector cycle.</p>
                </div>
              )}

              {!loadingHistory && epsHistoryData.length > 0 && (
                <div style={{ position: "relative", paddingLeft: "32px", marginLeft: "10px" }}>
                  <div style={{ position: "absolute", left: "7px", top: "10px", bottom: "10px", width: "2px", background: "linear-gradient(to bottom, #0284c7, #38bdf8)" }} />
                  {epsHistoryData.map((item, index) => {
                    const isLatest = index === epsHistoryData.length - 1;
                    return (
                      <div 
                        key={index} 
                        style={{ 
                          marginBottom: "1.25rem", 
                          position: "relative", 
                          padding: "1.1rem 1.25rem", 
                          backgroundColor: isLatest ? "rgba(2, 132, 199, 0.15)" : "rgba(15, 23, 42, 0.4)", 
                          border: `1px solid ${isLatest ? "rgba(56, 189, 248, 0.4)" : "rgba(148, 163, 184, 0.2)"}`, 
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
                            backgroundColor: isLatest ? "#38bdf8" : "#0284c7", 
                            border: "3px solid #0f172a", 
                            boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.3)" 
                          }} 
                        />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                          <span 
                            style={{ 
                              backgroundColor: isLatest ? "#0284c7" : "rgba(2, 132, 199, 0.2)", 
                              color: isLatest ? "#ffffff" : "#7dd3fc", 
                              padding: "4px 12px", 
                              borderRadius: "6px", 
                              fontSize: "0.78rem", 
                              fontWeight: 800 
                            }}
                          >
                            {item.version} {isLatest ? "• LATEST" : ""}
                          </span>
                          <span style={{ color: "#94a3b8", fontSize: "0.78rem", fontFamily: "monospace", fontWeight: 600 }}>
                            {new Date(item.importedAt).toLocaleString()}
                          </span>
                        </div>
                        <div 
                          style={{ 
                            backgroundColor: "rgba(15, 23, 42, 0.6)", 
                            padding: "12px", 
                            borderRadius: "8px", 
                            color: "#f8fafc", 
                            fontSize: "0.86rem", 
                            border: "1px solid rgba(148, 163, 184, 0.2)",
                            borderLeft: `3px solid ${isLatest ? "#38bdf8" : "#475569"}`,
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
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(2, 4, 10, 0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(12px)" }}>
          <div className="modal-panel-anim" style={{ backgroundColor: "rgba(11, 15, 25, 0.95)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "18px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(148, 163, 184, 0.15)", paddingBottom: "14px" }}>
              <h2 style={{ color: "#f8fafc", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Layers color="#38bdf8" size={24} /> Global Tracking Protocol
              </h2>
              <button onClick={() => setIsTrackModalOpen(false)} disabled={isTrackingGlobal} className="nexus-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem", alignItems: "center", background: "rgba(15, 23, 42, 0.4)", padding: "0.85rem 1rem", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.15)", flexWrap: "wrap" }}>
              <span style={{ color: "#7dd3fc", fontSize: "0.82rem", fontWeight: 800, backgroundColor: "rgba(2, 132, 199, 0.2)", padding: "5px 10px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                SECTOR: {globalCategory}
              </span>
              <CyberSelect width="145px" value={trackYear} options={trackYearOptions} onChange={setTrackYear} variant="sky" />
              <CyberSelect width="145px" value={trackMonth} options={trackMonthOptions} onChange={setTrackMonth} variant="sky" />
              <CyberSelect width="220px" value={trackEtat} options={etatOptions} onChange={setTrackEtat} variant="sky" />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#94a3b8", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
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
              style={{ width: "100%", justifyContent: "center", padding: "0.95rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isTrackingGlobal ? "Extracting Global Timeline..." : "Generate Global Timeline Excel"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: TEAM EXPORT PROTOCOL */}
      {isTeamModalOpen && (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(2, 4, 10, 0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(12px)" }}>
          <div className="modal-panel-anim" style={{ backgroundColor: "rgba(11, 15, 25, 0.95)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "18px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(148, 163, 184, 0.15)", paddingBottom: "14px" }}>
              <h2 style={{ color: "#f8fafc", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Users color="#38bdf8" size={24} /> Team Export Protocol
              </h2>
              <button onClick={() => setIsTeamModalOpen(false)} disabled={isExportingTeam} className="nexus-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "1.25rem", alignItems: "center", background: "rgba(15, 23, 42, 0.4)", padding: "0.85rem 1rem", borderRadius: "12px", border: "1px solid rgba(148, 163, 184, 0.15)", flexWrap: "wrap" }}>
              <span style={{ color: "#7dd3fc", fontSize: "0.82rem", fontWeight: 800, backgroundColor: "rgba(2, 132, 199, 0.2)", padding: "5px 10px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                SECTOR: {globalCategory}
              </span>
              <CyberSelect width="160px" value={teamYear} options={trackYearOptions} onChange={setTeamYear} variant="matrix" />
              <CyberSelect width="160px" value={teamMonth} options={trackMonthOptions} onChange={setTeamMonth} variant="matrix" />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#94a3b8", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
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
              style={{ width: "100%", justifyContent: "center", padding: "0.95rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isExportingTeam ? "Extracting Team Timelines..." : "Generate Team Export Excel"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: OMNI SEARCH PROTOCOL */}
      {isOmniSearchModalOpen && (
        <div className="modal-backdrop-anim" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(2, 4, 10, 0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(12px)" }}>
          <div className="modal-panel-anim" style={{ backgroundColor: "rgba(11, 15, 25, 0.95)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "18px", width: "720px", maxWidth: "95%", padding: "2rem", boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid rgba(148, 163, 184, 0.15)", paddingBottom: "14px" }}>
              <h2 style={{ color: "#f8fafc", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
                <Globe color="#38bdf8" size={24} /> Omni Search Protocol
              </h2>
              <button onClick={() => setIsOmniSearchModalOpen(false)} disabled={isExportingOmniSearch} className="nexus-btn" style={{ padding: "6px" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "1.25rem", background: "rgba(2, 132, 199, 0.1)", padding: "0.9rem 1.1rem", borderRadius: "12px", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
              <p style={{ color: "#7dd3fc", margin: 0, fontSize: "0.84rem", lineHeight: 1.5, fontWeight: 500 }}>
                <strong style={{ color: "#38bdf8" }}>CROSS-SECTOR SEARCH:</strong> This protocol bypasses Category, Year, and Month filters to scan the <span style={{ textDecoration: "underline", fontWeight: 700 }}>entire database</span> and extract every version of the requested EPS IDs.
              </p>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", color: "#94a3b8", marginBottom: "8px", fontSize: "0.82rem", fontWeight: 700 }}>
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
              style={{ width: "100%", justifyContent: "center", padding: "0.95rem", fontSize: "0.92rem", fontWeight: 700 }}
            >
              {isExportingOmniSearch ? "Scanning Global Matrix..." : "Execute Global Omni Search"}
            </button>
          </div>
        </div>
      )}

    </main>
  );
}