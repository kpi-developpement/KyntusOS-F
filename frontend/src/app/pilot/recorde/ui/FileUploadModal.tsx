import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, UploadCloud, Database, CheckCircle, Terminal, ShieldAlert, Layers,
  Trash2, Activity, GripVertical, Save, XCircle, RefreshCw, Clock, History
} from 'lucide-react';

const API_BASE = "";

interface BatchFileResult {
  filename: string;
  status: 'PENDING' | 'UPLOADING' | 'SUCCESS' | 'DUPLICATE_ONLY' | 'ERROR';
  totalRows?: number;
  insertedRows?: number;
  duplicateRows?: number;
  routedMonths?: string;
  message?: string;
}

interface ImportLogEntry {
  id: number;
  filename: string;
  status: string;
  totalRows?: number;
  insertedRows?: number;
  duplicateRows?: number;
  routedMonths?: string;
  errorMessage?: string;
  importedAt: string;
}

export default function FileUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  onSecurityAlert,
  defaultCategory,
  defaultYear,
  defaultMonth,
  onFileDeleted
}: any) {
  const [files, setFiles] = useState<File[]>([]);

  const [category, setCategory] = useState<string>(defaultCategory || "RACC");
  const [year, setYear] = useState<number>(defaultYear || new Date().getFullYear());
  const [month, setMonth] = useState<number>(defaultMonth || new Date().getMonth() + 1);

  const [importedFiles, setImportedFiles] = useState<string[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLogEntry[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0, percentage: 0 });
  const [batchResults, setBatchResults] = useState<BatchFileResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [draggedImportedIndex, setDraggedImportedIndex] = useState<number | null>(null);
  const [isOrderModified, setIsOrderModified] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const fetchImportedFilesAndLogs = useCallback(() => {
    setLoadingFiles(true);
    Promise.all([
      fetch(`${API_BASE}/api/pilot-records/imported-files?category=${defaultCategory}&year=${defaultYear}&month=${defaultMonth}`)
        .then(res => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(`${API_BASE}/api/secure-upload/logs?category=${defaultCategory}&year=${defaultYear}&month=${defaultMonth}`)
        .then(res => (res.ok ? res.json() : []))
        .catch(() => [])
    ])
      .then(([filesData, logsData]) => {
        setImportedFiles(filesData || []);
        setImportLogs(logsData || []);
        setIsOrderModified(false);
      })
      .finally(() => setLoadingFiles(false));
  }, [defaultCategory, defaultYear, defaultMonth]);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setYear(defaultYear);
      setMonth(defaultMonth);
      fetchImportedFilesAndLogs();
      setUploadStats({ current: 0, total: 0, percentage: 0 });
      setBatchResults([]);
      setIsUploading(false);
    }
  }, [isOpen, defaultCategory, defaultYear, defaultMonth, fetchImportedFilesAndLogs]);

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setIsDraggingOver(false);
      setUploadStats({ current: 0, total: 0, percentage: 0 });
      setBatchResults([]);
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!isUploading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().match(/\.(xlsx|xls|csv)$/));
      if (droppedFiles.length > 0) {
        setFiles(prev => [...prev, ...droppedFiles]);
      } else {
        alert("CRITICAL ERROR: INVALID PAYLOAD FORMAT.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      e.target.value = "";
    }
  };

  const removeFile = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const executeBatchUpload = async () => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadStats({ current: 0, total: files.length, percentage: 0 });
    const currentErrors: string[] = [];
    let uploadHasErrors = false;

    const getFileRank = (filename: string) => {
      const pMatch = filename.match(/^(\d+)-/);
      if (pMatch) return parseInt(pMatch[1], 10);
      const dMatch = filename.match(/(\d{2})(\d{2})(\d{4})/);
      if (dMatch) return parseInt(`${dMatch[3]}${dMatch[2]}${dMatch[1]}`, 10);
      return 999999999;
    };
    const sortedNewFiles = [...files].sort((a, b) => getFileRank(a.name) - getFileRank(b.name));

    setBatchResults(sortedNewFiles.map(f => ({ filename: f.name, status: 'PENDING' })));

    try {
      for (let i = 0; i < sortedNewFiles.length; i++) {
        const file = sortedNewFiles[i];
        setUploadStats({
          current: i + 1,
          total: sortedNewFiles.length,
          percentage: Math.round((i / sortedNewFiles.length) * 100)
        });

        setBatchResults(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'UPLOADING', message: 'Traitement en cours...' } : item
        ));

        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch(`${API_BASE}/api/secure-upload/import/1?year=${year}&month=${month}&category=${category}&fileRank=${importedFiles.length + i + 1}`, {
            method: "POST",
            body: formData
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            const errMsg = data.error || `Erreur serveur (HTTP ${res.status})`;
            currentErrors.push(`[${file.name}] : ${errMsg}`);
            uploadHasErrors = true;
            setBatchResults(prev => prev.map((item, idx) =>
              idx === i ? { ...item, status: 'ERROR', message: errMsg } : item
            ));
          } else {
            const st = data.status === 'DUPLICATE_ONLY' ? 'DUPLICATE_ONLY' : 'SUCCESS';
            setBatchResults(prev => prev.map((item, idx) =>
              idx === i ? {
                ...item,
                status: st,
                totalRows: data.totalRows,
                insertedRows: data.insertedRows,
                duplicateRows: data.duplicateRows,
                routedMonths: data.routedMonths,
                message: data.message
              } : item
            ));
          }
        } catch (netErr: any) {
          const errMsg = netErr?.message || "Erreur réseau";
          currentErrors.push(`[${file.name}] : ${errMsg}`);
          uploadHasErrors = true;
          setBatchResults(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'ERROR', message: errMsg } : item
          ));
        }

        if (i < sortedNewFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }

      setUploadStats({ current: sortedNewFiles.length, total: sortedNewFiles.length, percentage: 100 });

      if (uploadHasErrors && onSecurityAlert) {
        onSecurityAlert(currentErrors);
      }

      // Refresh parent table + modal lists WITHOUT closing modal so user sees every file's status
      if (onUploadSuccess) onUploadSuccess(false);
      fetchImportedFilesAndLogs();
      setFiles([]);
    } catch (error) {
      console.error("BATCH UPLOAD ERROR:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImportedFile = async (filename: string) => {
    if (!window.confirm(`⚠️ ELIMINATE TARGET PAYLOAD?\n\n${filename}`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/delete-file?category=${category}&year=${year}&month=${month}&filename=${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) {
        fetchImportedFilesAndLogs();
        if (onFileDeleted) onFileDeleted();
      }
    } catch (error) {
      console.error("Error deleting file", error);
    }
  };

  const handleDragStartImported = (index: number) => {
    setDraggedImportedIndex(index);
  };

  const handleDragOverImported = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    if (draggedImportedIndex === null || draggedImportedIndex === index) return;

    const newFiles = [...importedFiles];
    const draggedFile = newFiles[draggedImportedIndex];
    newFiles.splice(draggedImportedIndex, 1);
    newFiles.splice(index, 0, draggedFile);

    setDraggedImportedIndex(index);
    setImportedFiles(newFiles);
    setIsOrderModified(true);
  };

  const handleDragEndImported = () => {
    setDraggedImportedIndex(null);
  };

  const saveNewOrder = async () => {
    setIsSavingOrder(true);
    try {
      const res = await fetch(`${API_BASE}/api/secure-upload/reorder?category=${category}&year=${year}&month=${month}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importedFiles)
      });
      if (res.ok) {
        setIsOrderModified(false);
        if (onUploadSuccess) onUploadSuccess(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'SUCCESS') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #34e474', whiteSpace: 'nowrap' }}>
          <CheckCircle size={12} /> PASSÉ
        </span>
      );
    }
    if (status === 'DUPLICATE_ONLY') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fbc71d', whiteSpace: 'nowrap' }}>
          <RefreshCw size={12} /> DÉJÀ INTÉGRÉ
        </span>
      );
    }
    if (status === 'ERROR') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f82121', whiteSpace: 'nowrap' }}>
          <XCircle size={12} /> ÉCHEC
        </span>
      );
    }
    if (status === 'UPLOADING') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #1e86fb', whiteSpace: 'nowrap' }}>
          <Activity size={12} /> EN COURS...
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}>
        <Clock size={12} /> EN ATTENTE
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1050,
        backdropFilter: "blur(8px)",
        animation: "uploadModalFadeIn 0.22s ease forwards"
      }}
    >
      <style>{`
        @keyframes uploadModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes uploadModalScaleIn {
          from { opacity: 0; transform: scale(0.94) translateY(14px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #1d80fb",
          borderRadius: "20px",
          width: "720px",
          maxWidth: "95%",
          padding: "1.75rem 2rem",
          boxShadow: "0 24px 48px -12px rgba(15, 30, 61, 0.07), 0 0 0 1px rgba(37, 99, 235, 0.05)",
          position: "relative",
          overflow: "hidden",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--k-font-display)",
          animation: "uploadModalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      >
        {/* Top Blue Accent Bar */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(90deg, #2563eb, #0284c7, #3b82f6)" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", flexShrink: 0 }}>
          <h2 style={{ color: "#0f172a", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
            <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "10px", border: "1px solid #1d80fb", display: "flex" }}>
              <Database color="#2563eb" size={20} />
            </div>
            Batch Payload Uplink — Kyntus
          </h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              color: "#475569",
              padding: "6px",
              borderRadius: "12px",
              cursor: isUploading ? "not-allowed" : "pointer",
              opacity: isUploading ? 0.5 : 1,
              transition: "all 0.15s ease"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }} className="clean-scroll">
          {/* Active Target & Cycle Pill Bar */}
          <div style={{ display: "flex", gap: "16px", backgroundColor: "#eff6ff", padding: "0.7rem 1.2rem", borderRadius: "12px", border: "1px solid #1d80fb", marginBottom: "1rem", justifyContent: "center", alignItems: "center" }}>
            <span style={{ color: "#1e40af", fontSize: "0.86rem", fontWeight: 700 }}>
              SECTOR: <strong style={{ color: "#0f3fa8" }}>[{category}]</strong>
            </span>
            <span style={{ color: "#0357b4" }}>•</span>
            <span style={{ color: "#1e40af", fontSize: "0.86rem", fontWeight: 700 }}>
              CYCLE: <strong style={{ color: "#0f3fa8" }}>{String(month).padStart(2, '0')}/{year}</strong>
            </span>
          </div>

          {/* LIVE BATCH RESULTS (Current Upload Session) */}
          {batchResults.length > 0 && (
            <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f8fafc", borderRadius: "14px", border: "1px solid #1e86fb", borderLeft: "4px solid #0284c7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Activity size={16} color="#0284c7" />
                  <span style={{ color: "#0f172a", fontSize: "0.84rem", fontWeight: 800 }}>
                    RÉSULTAT D&apos;INJECTION ({uploadStats.current} / {uploadStats.total})
                  </span>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => { setBatchResults([]); setUploadStats({ current: 0, total: 0, percentage: 0 }); }}
                    style={{ background: "#e2e8f0", border: "none", color: "#334155", padding: "3px 9px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Effacer ce résumé
                  </button>
                )}
              </div>

              {isUploading && (
                <div style={{ width: "100%", height: "8px", backgroundColor: "#dbeafe", borderRadius: "999px", overflow: "hidden", marginBottom: "10px" }}>
                  <div style={{ width: `${uploadStats.percentage}%`, height: "100%", backgroundColor: "#2563eb", transition: "width 0.35s ease" }} />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }} className="clean-scroll">
                {batchResults.map((res, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "9px",
                      backgroundColor: res.status === 'ERROR' ? '#fef2f2' : res.status === 'SUCCESS' ? '#f0fdf4' : res.status === 'DUPLICATE_ONLY' ? '#fffbeb' : '#ffffff',
                      border: `1px solid ${res.status === 'ERROR' ? '#fb1e1e' : res.status === 'SUCCESS' ? '#32e771' : res.status === 'DUPLICATE_ONLY' ? '#fbcf1d' : '#e2e8f0'}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#0f172a", fontFamily: "var(--k-font-mono)", fontSize: "0.8rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {res.filename}
                      </span>
                      {renderStatusBadge(res.status)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", fontSize: "0.74rem", color: res.status === 'ERROR' ? '#b91c1c' : '#475569' }}>
                      {res.status === 'ERROR' ? (
                        <span>{res.message}</span>
                      ) : res.totalRows !== undefined ? (
                        <>
                          <span>Lues: <strong>{res.totalRows}</strong></span>
                          <span style={{ color: '#15803d' }}>Nouvelles: <strong>+{res.insertedRows || 0}</strong></span>
                          <span style={{ color: '#b45309' }}>Doublons: <strong>{res.duplicateRows || 0}</strong></span>
                          {res.routedMonths && (
                            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                              → {res.routedMonths}
                            </span>
                          )}
                        </>
                      ) : (
                        <span>{res.message || "En file d'attente..."}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drag & Drop Zone */}
          {!isUploading && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => files.length === 0 && fileInputRef.current?.click()}
              style={{
                border: isDraggingOver ? "2px dashed #2d69ec" : (files.length > 0 ? "2px solid #2473f5" : "2px dashed #1e86fb"),
                borderRadius: "16px",
                padding: "1.4rem 1.25rem",
                textAlign: "center",
                cursor: files.length === 0 ? "pointer" : "default",
                backgroundColor: isDraggingOver ? "#eff6ff" : (files.length > 0 ? "#f8fafc" : "#f8fbff"),
                transform: isDraggingOver ? "scale(1.01)" : "scale(1)",
                transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative",
                marginBottom: "0.9rem"
              }}
            >
              <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" multiple style={{ display: 'none' }} onChange={handleFileSelect} />

              {files.length > 0 ? (
                <div>
                  <div style={{ position: "relative", width: "40px", height: "40px", margin: "0 auto 8px" }} onClick={() => fileInputRef.current?.click()}>
                    <Layers size={36} color="#2563eb" style={{ cursor: "pointer" }} />
                    <div style={{ position: "absolute", bottom: "-4px", right: "-10px", background: "#2563eb", borderRadius: "999px", padding: "2px 7px", color: "#0f1e3d", fontSize: "0.72rem", fontWeight: 800 }}>
                      {files.length}
                    </div>
                  </div>
                  <div className="clean-scroll" style={{ maxHeight: "105px", overflowY: "auto", textAlign: "left", background: "#ffffff", padding: "8px 10px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", padding: "5px 4px" }}>
                        <span style={{ color: "#0f172a", fontFamily: "var(--k-font-mono)", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "85%" }}>
                          {f.name}
                        </span>
                        <X size={15} color="#dc2626" onClick={(e) => removeFile(e, i)} style={{ cursor: "pointer" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud size={40} color="#2563eb" style={{ margin: "0 auto 6px", transition: "transform 0.2s ease", transform: isDraggingOver ? "translateY(-4px)" : "translateY(0)" }} />
                  <p style={{ color: "#1e3a8a", margin: "0 0 3px 0", fontSize: "0.92rem", fontWeight: 700 }}>
                    {isDraggingOver ? "Drop files to stage batch..." : "Drag & Drop Excel (.xlsx) or CSV (.csv) files here"}
                  </p>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "0.76rem" }}>
                    Supports .xlsx, .xls, and .csv (auto-detects &apos;;&apos; or &apos;,&apos; &amp; UTF-8 / Windows-1252)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Submit Button */}
          {!isUploading && (
            <button
              onClick={executeBatchUpload}
              disabled={files.length === 0}
              style={{
                width: "100%",
                background: files.length > 0 ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "#f1f5f9",
                color: files.length > 0 ? "#0f1e3d" : "#475569",
                border: files.length > 0 ? "1px solid #3563e4" : "1px solid #e2e8f0",
                padding: "0.85rem",
                borderRadius: "12px",
                cursor: files.length > 0 ? "pointer" : "not-allowed",
                fontWeight: 800,
                letterSpacing: "0.02em",
                marginBottom: "1.15rem",
                fontSize: "0.9rem",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: files.length > 0 ? "0 8px 20px rgba(37, 99, 235, 0.17)" : "none"
              }}
            >
              {files.length > 0 ? `Execute Secure Injection (${files.length} ${files.length === 1 ? 'File' : 'Files'})` : "Select Files to Enable Uplink"}
            </button>
          )}

          {/* PERSISTENT INJECTION HISTORY (EVERY FILE INJECTED) */}
          <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "4px solid #27b3f2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ color: "#0f172a", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px", margin: 0, fontWeight: 800, letterSpacing: "0.02em" }}>
                <History size={15} color="#0284c7" /> HISTORIQUE DES INJECTIONS ({importLogs.length})
              </h3>
            </div>

            {loadingFiles ? (
              <p style={{ color: "#0284c7", fontSize: "0.8rem", margin: 0, fontWeight: 600 }}>Chargement de l&apos;historique...</p>
            ) : importLogs.length > 0 ? (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: "170px", overflowY: "auto" }} className="clean-scroll">
                {importLogs.map((log) => (
                  <li
                    key={log.id}
                    style={{
                      padding: "8px 10px",
                      marginBottom: "5px",
                      borderRadius: "12px",
                      backgroundColor: "#ffffff",
                      border: `1px solid ${log.status === 'ERROR' ? '#fb1e1e' : log.status === 'DUPLICATE_ONLY' ? '#fbcf1d' : '#e2e8f0'}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#0f172a", fontFamily: "var(--k-font-mono)", fontSize: "0.78rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.filename}
                      </span>
                      {renderStatusBadge(log.status)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", fontSize: "0.72rem", color: "#64748b" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        {log.status === 'ERROR' ? (
                          <span style={{ color: "#9e1919", fontWeight: 600 }}>{log.errorMessage}</span>
                        ) : (
                          <>
                            <span>Lues: <strong>{log.totalRows ?? 0}</strong></span>
                            <span style={{ color: "#15803d" }}>+<strong>{log.insertedRows ?? 0}</strong> new</span>
                            <span style={{ color: "#b45309" }}><strong>{log.duplicateRows ?? 0}</strong> dup</span>
                            {log.routedMonths && (
                              <span style={{ backgroundColor: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: "8px", fontWeight: 700 }}>
                                → {log.routedMonths}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <span style={{ fontFamily: "var(--k-font-mono)", fontSize: "0.7rem" }}>
                        {log.importedAt ? new Date(log.importedAt).toLocaleString() : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: "0.8rem", margin: 0, color: "#64748b" }}>Aucune tentative d&apos;injection enregistrée pour ce cycle.</p>
            )}
          </div>

          {/* Integrated Payloads List (DB Active Files — Drag to Reorder) */}
          <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "4px solid #2d69ec" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ color: "#0f172a", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px", margin: 0, fontWeight: 800, letterSpacing: "0.02em" }}>
                <Terminal size={15} color="#2563eb" /> INTEGRATED PAYLOADS IN DB ({importedFiles.length})
              </h3>

              {isOrderModified && (
                <button
                  onClick={saveNewOrder}
                  disabled={isSavingOrder}
                  style={{
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    color: "#0f1e3d",
                    border: "none",
                    borderRadius: "12px",
                    padding: "0.38rem 0.85rem",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    display: "flex",
                    gap: "5px",
                    alignItems: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(37, 99, 235, 0.15)"
                  }}
                >
                  <Save size={13} /> {isSavingOrder ? "Saving..." : "Save New Order"}
                </button>
              )}
            </div>

            {loadingFiles ? (
              <p style={{ color: "#0f3fa8", fontSize: "0.8rem", margin: 0, fontWeight: 600 }}>Scanning integrated files...</p>
            ) : importedFiles.length > 0 ? (
              <div>
                <p style={{ color: "#64748b", fontSize: "0.74rem", marginBottom: "8px", marginTop: 0 }}>
                  Drag files below to reorder version sequence:
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: "140px", overflowY: "auto" }} className="clean-scroll">
                  {importedFiles.map((f, idx) => (
                    <li
                      key={f}
                      draggable
                      onDragStart={() => handleDragStartImported(idx)}
                      onDragOver={(e) => handleDragOverImported(e, idx)}
                      onDragEnd={handleDragEndImported}
                      style={{
                        color: "#1e293b",
                        fontSize: "0.8rem",
                        padding: "7px 10px",
                        marginBottom: "5px",
                        border: draggedImportedIndex === idx ? "1px solid #2473f5" : "1px solid #e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontFamily: "var(--k-font-mono)",
                        cursor: "grab",
                        backgroundColor: draggedImportedIndex === idx ? "#eff6ff" : "#ffffff",
                        borderRadius: "12px",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <GripVertical size={14} color="#64748b" />
                        <span style={{ color: "#0f3fa8", fontWeight: 800 }}>#{idx + 1}</span>
                        <CheckCircle size={14} color="#059669" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>{f}</span>
                      </div>
                      <Trash2
                        size={15}
                        color="#dc2626"
                        style={{ cursor: "pointer", flexShrink: 0 }}
                        onClick={() => handleDeleteImportedFile(f)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b" }}>
                <ShieldAlert size={15} />
                <p style={{ fontSize: "0.8rem", margin: 0 }}>No files stored in DB for this cycle yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
