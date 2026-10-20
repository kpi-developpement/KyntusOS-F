import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, UploadCloud, Database, CheckCircle, Terminal, ShieldAlert, Layers, Trash2, Activity, GripVertical, Save } from 'lucide-react';

const API_BASE = "";

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
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0, percentage: 0 });

  const [draggedImportedIndex, setDraggedImportedIndex] = useState<number | null>(null);
  const [isOrderModified, setIsOrderModified] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const getUploadApiUrl = () => {
    if (typeof window !== 'undefined') {
      return `http://${window.location.hostname}:8082`;
    }
    return 'http://localhost:8082';
  };

  const fetchImportedFiles = useCallback(() => {
    setLoadingFiles(true);
    fetch(`${API_BASE}/api/pilot-records/imported-files?category=${defaultCategory}&year=${defaultYear}&month=${defaultMonth}`)
      .then(res => res.json())
      .then(data => {
        setImportedFiles(data || []);
        setIsOrderModified(false); 
      })
      .catch(() => setImportedFiles([]))
      .finally(() => setLoadingFiles(false));
  }, [defaultCategory, defaultYear, defaultMonth]);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setYear(defaultYear);
      setMonth(defaultMonth);
      fetchImportedFiles();
      setUploadStats({ current: 0, total: 0, percentage: 0 });
    }
  }, [isOpen, defaultCategory, defaultYear, defaultMonth, fetchImportedFiles]);

  useEffect(() => {
    if (!isOpen) { 
      setFiles([]);
      setIsDraggingOver(false);
      setUploadStats({ current: 0, total: 0, percentage: 0 });
    }
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadStats.total === 0) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (uploadStats.total === 0 && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
    }
  };

  const removeFile = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const executeBatchUpload = async () => {
    if (!files || files.length === 0) return;
    
    setUploadStats({ current: 0, total: files.length, percentage: 0 });
    let currentErrors: string[] = [];
    let uploadHasErrors = false;
    
    const getFileRank = (filename: string) => {
      const pMatch = filename.match(/^(\d+)-/);
      if (pMatch) return parseInt(pMatch[1], 10);
      const dMatch = filename.match(/(\d{2})(\d{2})(\d{4})/);
      if (dMatch) return parseInt(`${dMatch[3]}${dMatch[2]}${dMatch[1]}`, 10);
      return 999999999;
    };
    const sortedNewFiles = [...files].sort((a, b) => getFileRank(a.name) - getFileRank(b.name));

    try {
      const UPLOAD_API_URL = getUploadApiUrl();

      for (let i = 0; i < sortedNewFiles.length; i++) {
        const file = sortedNewFiles[i];
        setUploadStats({
          current: i + 1,
          total: sortedNewFiles.length,
          percentage: Math.round(((i) / sortedNewFiles.length) * 100)
        });

        const formData = new FormData(); 
        formData.append("file", file); 
        
        const res = await fetch(`${UPLOAD_API_URL}/api/secure-upload/import/1?year=${year}&month=${month}&category=${category}&fileRank=${importedFiles.length + i + 1}`, { 
          method: "POST",
          body: formData 
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Erreur serveur inconnue" }));
          currentErrors.push(`[${file.name}] : ${errorData.error || "Erreur inconnue"}`);
          uploadHasErrors = true;
        }

        if (i < sortedNewFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      setUploadStats({ current: sortedNewFiles.length, total: sortedNewFiles.length, percentage: 100 });
      
      if (uploadHasErrors && onSecurityAlert) {
        onSecurityAlert(currentErrors);
      }

      setTimeout(() => {
        if (onUploadSuccess) onUploadSuccess(); 
        fetchImportedFiles(); 
        setFiles([]); 
        if (uploadHasErrors) onClose(); 
      }, 1000);

    } catch (error) {
      console.error("BATCH UPLOAD ERROR:", error);
    }
  };

  const handleDeleteImportedFile = async (filename: string) => {
    if (!window.confirm(`⚠️ ELIMINATE TARGET PAYLOAD?\n\n${filename}`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/delete-file?category=${category}&year=${year}&month=${month}&filename=${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) {
        fetchImportedFiles();
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
        if (onUploadSuccess) onUploadSuccess(); 
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{ 
        position: "fixed", 
        inset: 0, 
        backgroundColor: "rgba(15, 23, 42, 0.45)", 
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
          border: "1px solid #bfdbfe", 
          borderRadius: "20px", 
          width: "650px", 
          maxWidth: "95%", 
          padding: "2rem", 
          boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(37, 99, 235, 0.08)", 
          position: "relative", 
          overflow: "hidden", 
          maxHeight: "90vh", 
          display: "flex", 
          flexDirection: "column",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          animation: "uploadModalScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards"
        }}
      >
        {/* Top Blue Accent Bar */}
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(90deg, #2563eb, #0284c7, #3b82f6)" }} />
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px", flexShrink: 0 }}>
          <h2 style={{ color: "#0f172a", margin: 0, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: 800 }}>
            <div style={{ backgroundColor: "#eff6ff", padding: "8px", borderRadius: "10px", border: "1px solid #bfdbfe", display: "flex" }}>
              <Database color="#2563eb" size={22} />
            </div>
            Batch Payload Uplink
          </h2>
          <button 
            onClick={onClose} 
            disabled={uploadStats.total > 0 && uploadStats.percentage < 100} 
            style={{ 
              background: "#f8fafc", 
              border: "1px solid #cbd5e1", 
              color: "#475569", 
              padding: "6px", 
              borderRadius: "8px", 
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }} className="clean-scroll">
          {/* Active Target & Cycle Pill Bar */}
          <div style={{ display: "flex", gap: "16px", backgroundColor: "#eff6ff", padding: "0.8rem 1.2rem", borderRadius: "12px", border: "1px solid #bfdbfe", marginBottom: "1.25rem", justifyContent: "center", alignItems: "center" }}>
            <span style={{ color: "#1e40af", fontSize: "0.88rem", fontWeight: 700 }}>
              SECTOR: <strong style={{ color: "#2563eb" }}>[{category}]</strong>
            </span>
            <span style={{ color: "#93c5fd" }}>•</span>
            <span style={{ color: "#1e40af", fontSize: "0.88rem", fontWeight: 700 }}>
              CYCLE: <strong style={{ color: "#2563eb" }}>{String(month).padStart(2, '0')}/{year}</strong>
            </span>
          </div>

          {/* Integrated Payloads List */}
          <div style={{ marginBottom: "1.5rem", padding: "1.1rem", background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0", borderLeft: "4px solid #2563eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ color: "#0f172a", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px", margin: 0, fontWeight: 800, letterSpacing: "0.02em" }}>
                <Terminal size={16} color="#2563eb" /> INTEGRATED PAYLOADS ({importedFiles.length})
              </h3>
              
              {isOrderModified && (
                <button 
                  onClick={saveNewOrder} 
                  disabled={isSavingOrder} 
                  style={{ 
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", 
                    color: "#ffffff", 
                    border: "none", 
                    borderRadius: "8px", 
                    padding: "0.4rem 0.85rem", 
                    fontSize: "0.75rem", 
                    fontWeight: 700, 
                    display: "flex", 
                    gap: "5px", 
                    alignItems: "center", 
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)"
                  }}
                >
                  <Save size={13} /> {isSavingOrder ? "Saving..." : "Save New Order"}
                </button>
              )}
            </div>
            
            {loadingFiles ? (
              <p style={{ color: "#2563eb", fontSize: "0.82rem", margin: 0, fontWeight: 600 }}>Scanning integrated files...</p>
            ) : importedFiles.length > 0 ? (
              <div>
                <p style={{ color: "#64748b", fontSize: "0.75rem", marginBottom: "8px", marginTop: 0 }}>
                  Drag files below to reorder version sequence:
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", maxHeight: "155px", overflowY: "auto" }} className="clean-scroll">
                  {importedFiles.map((f, idx) => (
                    <li 
                      key={f} 
                      draggable 
                      onDragStart={() => handleDragStartImported(idx)}
                      onDragOver={(e) => handleDragOverImported(e, idx)}
                      onDragEnd={handleDragEndImported}
                      style={{ 
                        color: "#1e293b", 
                        fontSize: "0.82rem", 
                        padding: "8px 10px", 
                        marginBottom: "5px",
                        border: draggedImportedIndex === idx ? "1px solid #3b82f6" : "1px solid #e2e8f0", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        fontFamily: "monospace", 
                        cursor: "grab", 
                        backgroundColor: draggedImportedIndex === idx ? "#eff6ff" : "#ffffff",
                        borderRadius: "8px",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <GripVertical size={14} color="#64748b" />
                        <span style={{ color: "#2563eb", fontWeight: 800 }}>#{idx + 1}</span>
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
                <ShieldAlert size={16} />
                <p style={{ fontSize: "0.82rem", margin: 0 }}>No files uploaded for this cycle yet.</p>
              </div>
            )}
          </div>

          {/* Drag & Drop Zone */}
          {uploadStats.total === 0 && (
            <div 
              onDragOver={handleDragOver} 
              onDragLeave={handleDragLeave} 
              onDrop={handleDrop}
              onClick={() => files.length === 0 && fileInputRef.current?.click()}
              style={{ 
                border: isDraggingOver ? "2px dashed #2563eb" : (files.length > 0 ? "2px solid #3b82f6" : "2px dashed #93c5fd"), 
                borderRadius: "16px", 
                padding: "1.75rem 1.25rem", 
                textAlign: "center", 
                cursor: files.length === 0 ? "pointer" : "default", 
                backgroundColor: isDraggingOver ? "#eff6ff" : (files.length > 0 ? "#f8fafc" : "#f8fbff"), 
                transform: isDraggingOver ? "scale(1.01)" : "scale(1)",
                transition: "all 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative", 
                minHeight: "135px"
              }} 
            >
              <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
              
              {files.length > 0 ? (
                <div>
                  <div style={{ position: "relative", width: "42px", height: "42px", margin: "0 auto 10px" }} onClick={() => fileInputRef.current?.click()}>
                    <Layers size={38} color="#2563eb" style={{ cursor: "pointer" }} />
                    <div style={{ position: "absolute", bottom: "-4px", right: "-10px", background: "#2563eb", borderRadius: "999px", padding: "2px 7px", color: "#ffffff", fontSize: "0.72rem", fontWeight: 800 }}>
                      {files.length}
                    </div>
                  </div>
                  <div className="clean-scroll" style={{ maxHeight: "110px", overflowY: "auto", textAlign: "left", background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid #dbeafe" }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", padding: "6px 4px" }}>
                        <span style={{ color: "#0f172a", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "85%" }}>
                          {f.name}
                        </span>
                        <X size={15} color="#dc2626" onClick={(e) => removeFile(e, i)} style={{ cursor: "pointer" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: "6px" }}>
                  <UploadCloud size={44} color="#2563eb" style={{ margin: "0 auto 8px", transition: "transform 0.2s ease", transform: isDraggingOver ? "translateY(-4px)" : "translateY(0)" }} />
                  <p style={{ color: "#1e3a8a", margin: "0 0 4px 0", fontSize: "0.95rem", fontWeight: 700 }}>
                    {isDraggingOver ? "Drop files to stage batch..." : "Drag & Drop Excel or CSV files here"}
                  </p>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "0.78rem" }}>
                    Supports .xlsx, .xls, and .csv multi-file batch sequencing
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload Progress Bar */}
          {uploadStats.total > 0 && (
            <div style={{ marginTop: "16px", padding: "1.25rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Activity size={20} color="#2563eb" />
                  <span style={{ color: "#1e40af", fontSize: "0.9rem", fontWeight: 800 }}>
                    {uploadStats.percentage < 100 ? "Injecting Secure Batch..." : "Batch Injection Complete"}
                  </span>
                </div>
                <span style={{ color: "#2563eb", fontFamily: "monospace", fontSize: "0.95rem", fontWeight: 800 }}>
                  {uploadStats.current} / {uploadStats.total}
                </span>
              </div>
              
              <div style={{ width: "100%", height: "10px", backgroundColor: "#dbeafe", borderRadius: "999px", overflow: "hidden" }}>
                <div 
                  style={{ 
                    width: `${uploadStats.percentage}%`, 
                    height: "100%", 
                    backgroundColor: uploadStats.percentage === 100 ? "#059669" : "#2563eb", 
                    transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1)" 
                  }} 
                />
              </div>
            </div>
          )}

          {/* Action Submit Button */}
          {uploadStats.total === 0 && (
            <button 
              onClick={executeBatchUpload} 
              disabled={files.length === 0} 
              style={{ 
                width: "100%", 
                background: files.length > 0 ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" : "#f1f5f9", 
                color: files.length > 0 ? "#ffffff" : "#94a3b8", 
                border: files.length > 0 ? "1px solid #1d4ed8" : "1px solid #e2e8f0", 
                padding: "0.95rem", 
                borderRadius: "12px", 
                cursor: files.length > 0 ? "pointer" : "not-allowed", 
                fontWeight: 800, 
                letterSpacing: "0.02em", 
                marginTop: "1.25rem", 
                fontSize: "0.92rem",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", 
                boxShadow: files.length > 0 ? "0 8px 20px rgba(37, 99, 235, 0.28)" : "none"
              }}
            >
              {files.length > 0 ? `Execute Secure Injection (${files.length} ${files.length === 1 ? 'File' : 'Files'})` : "Select Files to Enable Uplink"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}