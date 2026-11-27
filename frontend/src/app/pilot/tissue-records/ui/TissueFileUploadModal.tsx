import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, UploadCloud, Layers, CheckCircle, Terminal, ShieldAlert, Trash2,
  Activity, GripVertical, Save, XCircle, RefreshCw, Clock, History
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

export default function TissueFileUploadModal({
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
      fetch(`${API_BASE}/api/tissue-records/imported-files?category=${defaultCategory}&year=${defaultYear}&month=${defaultMonth}`)
        .then(res => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(`${API_BASE}/api/tissue-secure-upload/logs?category=${defaultCategory}&year=${defaultYear}&month=${defaultMonth}`)
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
          const res = await fetch(`${API_BASE}/api/tissue-secure-upload/import/1?year=${year}&month=${month}&category=${category}&fileRank=${importedFiles.length + i + 1}`, {
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
      console.error("TISSUE BATCH UPLOAD ERROR:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImportedFile = async (filename: string) => {
    if (!window.confirm(`⚠️ ELIMINATE TISSUE PAYLOAD?\n\n${filename}`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/tissue-records/delete-file?category=${category}&year=${year}&month=${month}&filename=${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) {
        fetchImportedFilesAndLogs();
        if (onFileDeleted) onFileDeleted();
      }
    } catch (error) {
      console.error("Error deleting Tissue file", error);
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
      const res = await fetch(`${API_BASE}/api/tissue-secure-upload/reorder?category=${category}&year=${year}&month=${month}`, {
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#1a9e69', border: '1px solid rgba(52, 211, 153, 0.45)', whiteSpace: 'nowrap' }}>
          <CheckCircle size={12} /> PASSÉ
        </span>
      );
    }
    if (status === 'DUPLICATE_ONLY') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#0f1e3d', border: '1px solid rgba(251, 191, 36, 0.45)', whiteSpace: 'nowrap' }}>
          <RefreshCw size={12} /> DÉJÀ INTÉGRÉ
        </span>
      );
    }
    if (status === 'ERROR') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#b4041a', border: '1px solid rgba(251, 113, 133, 0.45)', whiteSpace: 'nowrap' }}>
          <XCircle size={12} /> ÉCHEC
        </span>
      );
    }
    if (status === 'UPLOADING') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, backgroundColor: 'rgba(20, 184, 166, 0.22)', color: '#15a28c', border: '1px solid rgba(45, 212, 191, 0.45)', whiteSpace: 'nowrap' }}>
          <Activity size={12} /> EN COURS...
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#475569', border: '1px solid rgba(148, 163, 184, 0.3)', whiteSpace: 'nowrap' }}>
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
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1050,
        backdropFilter: "blur(14px)",
        animation: "tissueUploadFadeIn 0.22s ease forwards"
      }}
    >
      <style>{`
        @keyframes tissueUploadFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tissueUploadScaleIn {
          from { opacity: 0; transform: scale(0.94) translateY(14px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.92) 100%)",
          border: "1px solid rgba(52, 211, 153, 0.35)",
          borderRadius: "22px",
          width: "720px",
          maxWidth: "95%",
          padding: "1.75rem 2rem",
          boxShadow: "0 28px 60px -12px rgba(15, 30, 61, 0.18), 0 0 36px -10px rgba(16, 185, 129, 0.18)",
          position: "relative",
          overflow: "hidden",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          animation: "tissueUploadScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      >
        {/* Top Emerald-Teal Aurora Bar */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(90deg, #10b981, #14b8a6, #34d399)" }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid rgba(52, 211, 153, 0.16)", paddingBottom: "12px", flexShrink: 0 }}>
          <h2 style={{ color: "#0f1e3d", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "11px", fontWeight: 800 }}>
            <div style={{ background: "linear-gradient(135deg, #10b981 0%, #0f766e 100%)", padding: "8px", borderRadius: "11px", display: "flex", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.24)" }}>
              <Layers color="#ffffff" size={20} />
            </div>
            Tissue Batch Payload Uplink
          </h2>
          <button
            onClick={onClose}
            disabled={isUploading}
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(52, 211, 153, 0.25)",
              color: "#0f1e3d",
              padding: "6px",
              borderRadius: "9px",
              cursor: isUploading ? "not-allowed" : "pointer",
              opacity: isUploading ? 0.5 : 1,
              transition: "all 0.15s ease"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }} className="tissue-scroll">
          {/* Active Target & Cycle Pill Bar */}
          <div style={{ display: "flex", gap: "16px", backgroundColor: "rgba(16, 185, 129, 0.12)", padding: "0.7rem 1.2rem", borderRadius: "12px", border: "1px solid rgba(52, 211, 153, 0.28)", marginBottom: "1rem", justifyContent: "center", alignItems: "center" }}>
            <span style={{ color: "#0f1e3d", fontSize: "0.86rem", fontWeight: 700 }}>
              TISSUE SECTOR: <strong style={{ color: "#21976c" }}>[{category}]</strong>
            </span>
            <span style={{ color: "rgba(33, 151, 108, 0.4)" }}>•</span>
            <span style={{ color: "#0f1e3d", fontSize: "0.86rem", fontWeight: 700 }}>
              CYCLE: <strong style={{ color: "#1f9889" }}>{String(month).padStart(2, '0')}/{year}</strong>
            </span>
          </div>

          {/* LIVE BATCH RESULTS (Current Upload Session) */}
          {batchResults.length > 0 && (
            <div style={{ marginBottom: "1rem", padding: "1rem", background: "rgba(255, 255, 255, 0.92)", borderRadius: "14px", border: "1px solid rgba(52, 211, 153, 0.35)", borderLeft: "4px solid #42d6a0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Activity size={16} color="#34d399" />
                  <span style={{ color: "#0f1e3d", fontSize: "0.84rem", fontWeight: 800 }}>
                    RÉSULTAT D&apos;INJECTION ({uploadStats.current} / {uploadStats.total})
                  </span>
                </div>
                {!isUploading && (
                  <button
                    onClick={() => { setBatchResults([]); setUploadStats({ current: 0, total: 0, percentage: 0 }); }}
                    style={{ background: "rgba(52, 211, 153, 0.15)", border: "1px solid rgba(52, 211, 153, 0.3)", color: "#0f1e3d", padding: "3px 9px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Effacer ce résumé
                  </button>
                )}
              </div>

              {isUploading && (
                <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(255, 255, 255, 0.92)", borderRadius: "999px", overflow: "hidden", marginBottom: "10px", border: "1px solid rgba(52, 211, 153, 0.2)" }}>
                  <div style={{ width: `${uploadStats.percentage}%`, height: "100%", background: "linear-gradient(90deg, #0d9488, #10b981, #34d399)", transition: "width 0.35s ease" }} />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }} className="tissue-scroll">
                {batchResults.map((res, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "9px",
                      backgroundColor: res.status === 'ERROR' ? 'rgba(244, 63, 94, 0.12)' : res.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.12)' : res.status === 'DUPLICATE_ONLY' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.9)',
                      border: `1px solid ${res.status === 'ERROR' ? 'rgba(244, 63, 94, 0.4)' : res.status === 'SUCCESS' ? 'rgba(52, 211, 153, 0.35)' : res.status === 'DUPLICATE_ONLY' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(52, 211, 153, 0.18)'}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#0f1e3d", fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {res.filename}
                      </span>
                      {renderStatusBadge(res.status)}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", fontSize: "0.74rem", color: res.status === 'ERROR' ? '#b4041a' : '#475569' }}>
                      {res.status === 'ERROR' ? (
                        <span>{res.message}</span>
                      ) : res.totalRows !== undefined ? (
                        <>
                          <span>Lues: <strong style={{ color: '#0f1e3d' }}>{res.totalRows}</strong></span>
                          <span style={{ color: '#1a9e69' }}>Nouvelles: <strong>+{res.insertedRows || 0}</strong></span>
                          <span style={{ color: '#0f1e3d' }}>Doublons: <strong>{res.duplicateRows || 0}</strong></span>
                          {res.routedMonths && (
                            <span style={{ backgroundColor: 'rgba(20, 184, 166, 0.22)', color: '#15a28c', padding: '1px 6px', borderRadius: '5px', fontWeight: 700 }}>
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
                border: isDraggingOver ? "2px dashed #42d6a0" : (files.length > 0 ? "2px solid #10b981" : "2px dashed rgba(52, 211, 153, 0.35)"),
                borderRadius: "16px",
                padding: "1.4rem 1.25rem",
                textAlign: "center",
                cursor: files.length === 0 ? "pointer" : "default",
                backgroundColor: isDraggingOver ? "rgba(16, 185, 129, 0.16)" : (files.length > 0 ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.75)"),
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
                    <Layers size={36} color="#34d399" style={{ cursor: "pointer" }} />
                    <div style={{ position: "absolute", bottom: "-4px", right: "-10px", background: "#10b981", borderRadius: "999px", padding: "2px 7px", color: "#0f1e3d", fontSize: "0.72rem", fontWeight: 800 }}>
                      {files.length}
                    </div>
                  </div>
                  <div className="tissue-scroll" style={{ maxHeight: "105px", overflowY: "auto", textAlign: "left", background: "rgba(255, 255, 255, 0.92)", padding: "8px 10px", borderRadius: "10px", border: "1px solid rgba(52, 211, 153, 0.22)" }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(52, 211, 153, 0.1)", padding: "5px 4px" }}>
                        <span style={{ color: "#0f1e3d", fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "85%" }}>
                          {f.name}
                        </span>
                        <X size={15} color="#fb7185" onClick={(e) => removeFile(e, i)} style={{ cursor: "pointer" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud size={40} color="#34d399" style={{ margin: "0 auto 6px", transition: "transform 0.2s ease", transform: isDraggingOver ? "translateY(-4px)" : "translateY(0)" }} />
                  <p style={{ color: "#0f1e3d", margin: "0 0 3px 0", fontSize: "0.92rem", fontWeight: 700 }}>
                    {isDraggingOver ? "Drop Tissue files to stage batch..." : "Drag & Drop Tissue Excel (.xlsx) or CSV (.csv) files here"}
                  </p>
                  <p style={{ color: "#475569", margin: 0, fontSize: "0.76rem" }}>
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
                background: files.length > 0 ? "linear-gradient(135deg, #10b981 0%, #0f766e 100%)" : "rgba(255, 255, 255, 0.75)",
                color: files.length > 0 ? "#0f1e3d" : "#64748b",
                border: files.length > 0 ? "1px solid #42d6a0" : "1px solid rgba(148, 163, 184, 0.2)",
                padding: "0.85rem",
                borderRadius: "12px",
                cursor: files.length > 0 ? "pointer" : "not-allowed",
                fontWeight: 800,
                letterSpacing: "0.02em",
                marginBottom: "1.15rem",
                fontSize: "0.9rem",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: files.length > 0 ? "0 8px 22px rgba(16, 185, 129, 0.21)" : "none"
              }}
            >
              {files.length > 0 ? `Execute Tissue Secure Injection (${files.length} ${files.length === 1 ? 'File' : 'Files'})` : "Select Files to Enable Tissue Uplink"}
            </button>
          )}

          {/* PERSISTENT INJECTION HISTORY (EVERY FILE INJECTED) */}
          <div style={{ marginBottom: "1rem", padding: "1rem", background: "rgba(255, 255, 255, 0.92)", borderRadius: "14px", border: "1px solid rgba(52, 211, 153, 0.2)", borderLeft: "4px solid #14b8a6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ color: "#0f1e3d", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px", margin: 0, fontWeight: 800, letterSpacing: "0.02em" }}>
                <History size={15} color="#2dd4bf" /> HISTORIQUE DES INJECTIONS TISSUE ({importLogs.length})
              </h3>
            </div>

            {loadingFiles ? (
              <p style={{ color: "#1f9889", fontSize: "0.8rem", margin: 0, fontWeight: 600 }}>Chargement de l&apos;historique...</p>
            ) : importLogs.length > 0 ? (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: "170px", overflowY: "auto" }} className="tissue-scroll">
                {importLogs.map((log) => (
                  <li
                    key={log.id}
                    style={{
                      padding: "8px 10px",
                      marginBottom: "5px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(255, 255, 255, 0.92)",
                      border: `1px solid ${log.status === 'ERROR' ? 'rgba(244, 63, 94, 0.35)' : log.status === 'DUPLICATE_ONLY' ? 'rgba(245, 158, 11, 0.32)' : 'rgba(52, 211, 153, 0.18)'}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: "#0f1e3d", fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.filename}
                      </span>
                      {renderStatusBadge(log.status)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px", fontSize: "0.72rem", color: "#475569" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        {log.status === 'ERROR' ? (
                          <span style={{ color: "#b4041a", fontWeight: 600 }}>{log.errorMessage}</span>
                        ) : (
                          <>
                            <span>Lues: <strong style={{ color: "#0f1e3d" }}>{log.totalRows ?? 0}</strong></span>
                            <span style={{ color: "#1a9e69" }}>+<strong>{log.insertedRows ?? 0}</strong> new</span>
                            <span style={{ color: "#0f1e3d" }}><strong>{log.duplicateRows ?? 0}</strong> dup</span>
                            {log.routedMonths && (
                              <span style={{ backgroundColor: "rgba(20, 184, 166, 0.22)", color: "#15a28c", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                → {log.routedMonths}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                        {log.importedAt ? new Date(log.importedAt).toLocaleString() : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: "0.8rem", margin: 0, color: "#475569" }}>Aucune tentative d&apos;injection enregistrée pour ce cycle.</p>
            )}
          </div>

          {/* Integrated Payloads List (DB Active Files — Drag to Reorder) */}
          <div style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.92)", borderRadius: "14px", border: "1px solid rgba(52, 211, 153, 0.18)", borderLeft: "4px solid #10b981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ color: "#0f1e3d", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px", margin: 0, fontWeight: 800, letterSpacing: "0.02em" }}>
                <Terminal size={15} color="#34d399" /> INTEGRATED TISSUE PAYLOADS IN DB ({importedFiles.length})
              </h3>

              {isOrderModified && (
                <button
                  onClick={saveNewOrder}
                  disabled={isSavingOrder}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
                    color: "#0f1e3d",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.38rem 0.85rem",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    display: "flex",
                    gap: "5px",
                    alignItems: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.21)"
                  }}
                >
                  <Save size={13} /> {isSavingOrder ? "Saving..." : "Save New Order"}
                </button>
              )}
            </div>

            {loadingFiles ? (
              <p style={{ color: "#21976c", fontSize: "0.8rem", margin: 0, fontWeight: 600 }}>Scanning integrated Tissue files...</p>
            ) : importedFiles.length > 0 ? (
              <div>
                <p style={{ color: "#475569", fontSize: "0.74rem", marginBottom: "8px", marginTop: 0 }}>
                  Drag files below to reorder version sequence:
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: "140px", overflowY: "auto" }} className="tissue-scroll">
                  {importedFiles.map((f, idx) => (
                    <li
                      key={f}
                      draggable
                      onDragStart={() => handleDragStartImported(idx)}
                      onDragOver={(e) => handleDragOverImported(e, idx)}
                      onDragEnd={handleDragEndImported}
                      style={{
                        color: "#0f1e3d",
                        fontSize: "0.8rem",
                        padding: "7px 10px",
                        marginBottom: "5px",
                        border: draggedImportedIndex === idx ? "1px solid #42d6a0" : "1px solid rgba(52, 211, 153, 0.16)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontFamily: "monospace",
                        cursor: "grab",
                        backgroundColor: draggedImportedIndex === idx ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.9)",
                        borderRadius: "9px",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <GripVertical size={14} color="#64748b" />
                        <span style={{ color: "#21976c", fontWeight: 800 }}>#{idx + 1}</span>
                        <CheckCircle size={14} color="#2dd4bf" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>{f}</span>
                      </div>
                      <Trash2
                        size={15}
                        color="#fb7185"
                        style={{ cursor: "pointer", flexShrink: 0 }}
                        onClick={() => handleDeleteImportedFile(f)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569" }}>
                <ShieldAlert size={15} color="#34d399" />
                <p style={{ fontSize: "0.8rem", margin: 0 }}>No Tissue files stored in DB for this cycle yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
