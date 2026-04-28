import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, UploadCloud, Database, CheckCircle, Terminal, MoveDown, ShieldAlert, Layers, Trash2, Activity, GripVertical, Save, AlertTriangle } from 'lucide-react';

const API_BASE = "http://localhost:3000";

export default function FileUploadModal({ isOpen, onClose, onUploadSuccess, onSecurityAlert, defaultCategory, defaultYear, defaultMonth, onFileDeleted }: any) {
  const [files, setFiles] = useState<File[]>([]);
  
  const [category, setCategory] = useState<string>(defaultCategory || "RACC");
  const [year, setYear] = useState<number>(defaultYear || new Date().getFullYear());
  const [month, setMonth] = useState<number>(defaultMonth || new Date().getMonth() + 1);

  // Fichiers déjà importés (Homa li ghan-dirou lihom Drag & Drop)
  const [importedFiles, setImportedFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0, percentage: 0 });

  // States pour le Drag & Drop Post-Import
  const [draggedImportedIndex, setDraggedImportedIndex] = useState<number | null>(null);
  const [isOrderModified, setIsOrderModified] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const fetchImportedFiles = useCallback(() => {
    setLoadingFiles(true);
    fetch(`${API_BASE}/api/pilot-records/imported-files?category=${defaultCategory}&year=${defaultYear}&month=${defaultMonth}`)
      .then(res => res.json())
      .then(data => {
        setImportedFiles(data || []);
        setIsOrderModified(false); // Reset modif state
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
      setFiles([]); setIsDraggingOver(false); setUploadStats({ current: 0, total: 0, percentage: 0 });
    }
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); if (uploadStats.total === 0) setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDraggingOver(false); };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDraggingOver(false);
    if (uploadStats.total === 0 && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().match(/\.(xlsx|xls|csv)$/));
      if (droppedFiles.length > 0) { setFiles(prev => [...prev, ...droppedFiles]); } 
      else { alert("CRITICAL ERROR: INVALID PAYLOAD FORMAT."); }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation(); setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // 🚀 1. L'EXECUTION SECURISEE DE L'UPLOAD 🚀
  const executeBatchUpload = async () => {
    if (!files || files.length === 0) return;
    
    setUploadStats({ current: 0, total: files.length, percentage: 0 });
    let currentErrors: string[] = [];
    let uploadHasErrors = false;
    
    // Tri intelligent initial
    const getFileRank = (filename: string) => {
        const pMatch = filename.match(/^(\d+)-/); if (pMatch) return parseInt(pMatch[1], 10);
        const dMatch = filename.match(/(\d{2})(\d{2})(\d{4})/); if (dMatch) return parseInt(`${dMatch[3]}${dMatch[2]}${dMatch[1]}`, 10);
        return 999999999;
    };
    const sortedNewFiles = [...files].sort((a, b) => getFileRank(a.name) - getFileRank(b.name));

    try {
      for (let i = 0; i < sortedNewFiles.length; i++) {
        const file = sortedNewFiles[i];
        setUploadStats({ current: i + 1, total: sortedNewFiles.length, percentage: Math.round(((i) / sortedNewFiles.length) * 100) });

        const formData = new FormData(); 
        formData.append("file", file); 
        
        // On hit le nouveau controller sécurisé
        const res = await fetch(`${API_BASE}/api/secure-upload/import/1?year=${year}&month=${month}&category=${category}&fileRank=${importedFiles.length + i + 1}`, { 
            method: "POST", body: formData 
        });

        if (!res.ok) {
            const errorData = await res.json();
            currentErrors.push(`[${file.name}] : ${errorData.error || "Erreur inconnue"}`);
            uploadHasErrors = true;
        }

        // 🛡️ TACTIQUE DE RESPIRATION : On attend 1.5s pour laisser la RAM de Tomcat se vider (Garbage Collector)
        if (i < sortedNewFiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      setUploadStats({ current: sortedNewFiles.length, total: sortedNewFiles.length, percentage: 100 });
      
      // S'il y a des erreurs, on les envoie à page.tsx
      if (uploadHasErrors) {
          onSecurityAlert(currentErrors);
      }

      setTimeout(() => {
        onUploadSuccess(); // Rafraichir le tableau principal
        fetchImportedFiles(); // Rafraichir la liste du terminal
        setFiles([]); // Vider la file d'attente
        if (uploadHasErrors) onClose(); // Fermer le modal si erreur pour voir l'alerte sur la page principale !
      }, 1000);

    } catch (error) { console.error("BATCH UPLOAD ERROR:", error); }
  };

  const handleDeleteImportedFile = async (filename: string) => {
    if (!window.confirm(`⚠️ ELIMINATE TARGET PAYLOAD?\n\n${filename}`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/delete-file?category=${category}&year=${year}&month=${month}&filename=${encodeURIComponent(filename)}`, { method: "DELETE" });
      if (res.ok) { fetchImportedFiles(); if(onFileDeleted) onFileDeleted(); }
    } catch (error) { console.error("Error deleting file", error); }
  };

  // 🚀 2. LE SYSTEME DE DRAG & DROP DES FICHIERS IMPORTÉS (POST-IMPORT) 🚀
  const handleDragStartImported = (index: number) => { setDraggedImportedIndex(index); };
  
  const handleDragOverImported = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    if (draggedImportedIndex === null || draggedImportedIndex === index) return;
    
    const newFiles = [...importedFiles];
    const draggedFile = newFiles[draggedImportedIndex];
    newFiles.splice(draggedImportedIndex, 1);
    newFiles.splice(index, 0, draggedFile);
    
    setDraggedImportedIndex(index);
    setImportedFiles(newFiles);
    setIsOrderModified(true); // Active le bouton "SAVE ORDER"
  };
  
  const handleDragEndImported = () => { setDraggedImportedIndex(null); };

  // 🚀 3. SAUVEGARDER LE NOUVEL ORDRE 🚀
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
              onUploadSuccess(); // Refresh le tableau principal pour afficher le nouvel ordre !
          }
      } catch (error) {
          console.error(error);
      } finally {
          setIsSavingOrder(false);
      }
  }

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(12px)" }}>
      <div className="hardware-accelerated" style={{ backgroundColor: "rgba(6, 11, 25, 0.85)", border: "1px solid rgba(0, 255, 255, 0.6)", borderRadius: "16px", width: "650px", maxWidth: "95%", padding: "2.5rem", boxShadow: "0 0 50px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.2)", position: "relative", overflow: "hidden", backdropFilter: "blur(20px)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(90deg, transparent, #0ff, #a855f7, #0ff, transparent)", animation: "scanline 2s linear infinite" }}></div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid rgba(0, 255, 255, 0.3)", paddingBottom: "15px", flexShrink: 0 }}>
          <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", letterSpacing: "2px", fontFamily: "monospace", textShadow: "0 0 10px rgba(0,255,255,0.8)" }}>
            <Database color="#0ff" size={32} style={{ filter: "drop-shadow(0 0 8px #0ff)" }} /> BATCH UPLINK
          </h2>
          <button onClick={onClose} disabled={uploadStats.total > 0 && uploadStats.percentage < 100} className="mecha-element" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.5)", color: "#ff4d4d", padding: "6px", borderRadius: "8px", cursor: "pointer", boxShadow: "0 0 10px rgba(239,68,68,0.3)" }}><X size={26} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "5px" }} className="cyber-scroll">
            <div style={{ display: "flex", gap: "20px", backgroundColor: "rgba(15, 23, 42, 0.6)", padding: "1rem 1.5rem", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.4)", marginBottom: "1.5rem", justifyContent: "center", boxShadow: "inset 0 4px 20px rgba(0,0,0,0.5)" }}>
               <span style={{ color: "#0ff", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold", letterSpacing: "1px", textShadow: "0 0 8px rgba(0,255,255,0.6)" }}>TARGET: <span style={{ color: "#fff" }}>[{category}]</span></span>
               <span style={{ color: "#38bdf8" }}>///</span>
               <span style={{ color: "#a855f7", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold", letterSpacing: "1px", textShadow: "0 0 8px rgba(168,85,247,0.6)" }}>CYCLE: <span style={{ color: "#fff" }}>{String(month).padStart(2, '0')}/{year}</span></span>
            </div>

            {/* 🗄️ TERMINAL DE L'HISTORIQUE (AVEC DRAG & DROP) 🔥 */}
            <div style={{ marginBottom: "2rem", padding: "1.2rem", background: "rgba(10, 15, 30, 0.6)", borderRadius: "8px", border: "1px solid rgba(168, 85, 247, 0.5)", borderLeft: "4px solid #a855f7", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ color: "#d8b4fe", fontSize: "0.95rem", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "10px", margin: 0, textShadow: "0 0 8px rgba(168, 85, 247, 0.8)", fontWeight: "bold" }}>
                    <Terminal size={18} /> NEON LOG: INTEGRATED PAYLOADS
                  </h3>
                  
                  {/* BOUTON SAVE ORDER APPEARAIT SI MODIFICATION */}
                  {isOrderModified && (
                      <button onClick={saveNewOrder} disabled={isSavingOrder} className="mecha-btn btn-success" style={{ padding: "0.3rem 0.8rem", fontSize: "0.75rem", display: "flex", gap: "5px", alignItems: "center" }}>
                          <Save size={14} /> {isSavingOrder ? "SAVING..." : "SAVE NEW ORDER"}
                      </button>
                  )}
              </div>
              
              {loadingFiles ? (
                <p style={{ color: "#a855f7", fontSize: "0.85rem", margin: 0, fontStyle: "italic", fontFamily: "monospace", animation: "pulse-op 1.5s infinite" }}>[ Scanning quantum records... ]</p>
              ) : importedFiles.length > 0 ? (
                <div>
                  <p style={{ color: "#94a3b8", fontSize: "0.75rem", fontFamily: "monospace", marginBottom: "10px", fontStyle: "italic" }}>[ Drag files below to reorder your database sequence ]</p>
                  <ul style={{ margin: 0, padding: "0", listStyle: "none", maxHeight: "150px", overflowY: "auto" }} className="cyber-scroll">
                    {importedFiles.map((f, idx) => (
                      <li 
                        key={f} 
                        draggable // 🔥 ACTIVE LE DRAG & DROP POST-IMPORT
                        onDragStart={() => handleDragStartImported(idx)}
                        onDragOver={(e) => handleDragOverImported(e, idx)}
                        onDragEnd={handleDragEndImported}
                        style={{ 
                            color: "#e2e8f0", fontSize: "0.85rem", padding: "8px 10px", 
                            borderBottom: "1px dashed rgba(51,65,85,0.6)", display: "flex", alignItems: "center", justifyContent: "space-between", 
                            fontFamily: "monospace", cursor: "grab", transition: "background-color 0.2s",
                            backgroundColor: draggedImportedIndex === idx ? "rgba(168, 85, 247, 0.2)" : "transparent",
                            borderRadius: "4px"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                          <GripVertical size={14} color="#a855f7" style={{ cursor: "grab" }} />
                          <span style={{ color: "#a855f7", fontWeight: "bold" }}>#{idx + 1}</span>
                          <CheckCircle size={14} color="#39ff14" style={{ filter: "drop-shadow(0 0 5px #39ff14)", flexShrink: 0 }} /> 
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.5px" }}>{f}</span>
                        </div>
                        <Trash2 size={16} color="#ef4444" style={{ cursor: "pointer", flexShrink: 0, filter: "drop-shadow(0 0 5px #ef4444)" }} onClick={() => handleDeleteImportedFile(f)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                   <ShieldAlert size={16} color="#94a3b8" />
                   <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0, fontFamily: "monospace" }}>Memory matrix empty for this cycle.</p>
                </div>
              )}
            </div>

            {/* ZONE UPLOAD */}
            {uploadStats.total === 0 && (
              <div 
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => files.length === 0 && fileInputRef.current?.click()}
                style={{ 
                  border: isDraggingOver ? "2px dashed #0ff" : (files.length > 0 ? "2px solid #0ff" : "2px dashed #38bdf8"), 
                  borderRadius: "12px", padding: "2rem 1rem", textAlign: "center", 
                  cursor: files.length === 0 ? "pointer" : "default", 
                  backgroundColor: isDraggingOver ? "rgba(0, 255, 255, 0.15)" : (files.length > 0 ? "rgba(0, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.4)"), 
                  transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                  boxShadow: isDraggingOver ? "0 0 50px rgba(0,255,255,0.3)" : "none",
                  position: "relative", minHeight: "140px"
                }} 
              >
                <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
                
                {files.length > 0 ? (
                   <div>
                     <div style={{ position: "relative", width: "40px", height: "40px", margin: "0 auto 10px" }} onClick={() => fileInputRef.current?.click()}>
                       <Layers size={40} color="#0ff" style={{ filter: "drop-shadow(0 0 10px rgba(0, 255, 255, 0.8))", cursor: "pointer" }} />
                       <div style={{ position: "absolute", bottom: "-5px", right: "-15px", background: "#0f172a", borderRadius: "50%", padding: "2px 6px", border: "1px solid #0ff", color: "#0ff", fontSize: "0.75rem", fontWeight: "bold" }}>{files.length}</div>
                     </div>
                     <div className="cyber-scroll" style={{ maxHeight: "100px", overflowY: "auto", textAlign: "left", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,255,255,0.2)" }}>
                        {files.map((f, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(0,255,255,0.2)", padding: "5px 0" }}>
                             <span style={{ color: "#fff", fontFamily: "monospace", fontSize: "0.85rem", textShadow: "0 0 5px rgba(0,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>{f.name}</span>
                             <X size={16} color="#ef4444" onClick={(e) => removeFile(e, i)} style={{ cursor: "pointer" }} />
                          </div>
                        ))}
                     </div>
                   </div>
                ) : (
                   <div style={{ marginTop: "10px" }}>
                     <UploadCloud size={50} color={isDraggingOver ? "#0ff" : "#38bdf8"} style={{ filter: isDraggingOver ? "drop-shadow(0 0 15px #0ff)" : "none", margin: "0 auto 10px" }} />
                     <p style={{ color: isDraggingOver ? "#fff" : "#0ea5e9", margin: "0 0 5px 0", fontSize: "1.1rem", fontFamily: "monospace", fontWeight: "bold", textShadow: isDraggingOver ? "0 0 10px #0ff" : "none" }}>
                       {isDraggingOver ? "DROP TO INJECT..." : "DRAG & DROP NEW PAYLOADS"}
                     </p>
                   </div>
                )}
              </div>
            )}

            {/* 🔥 PROGRESS BAR 🔥 */}
            {uploadStats.total > 0 && (
              <div style={{ marginTop: "20px", padding: "1.5rem", background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.3)", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Activity size={24} color="#00f0ff" style={{ animation: uploadStats.percentage < 100 ? "pulse-neon 1s infinite" : "none" }} />
                    <span style={{ color: "#00f0ff", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold", textShadow: "0 0 8px rgba(0,255,255,0.5)" }}>
                      {uploadStats.percentage < 100 ? `INJECTING SECURE BATCH...` : `INJECTION COMPLETE`}
                    </span>
                  </div>
                  <span style={{ color: "#39ff14", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "900" }}>{uploadStats.current} / {uploadStats.total}</span>
                </div>
                
                <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(15, 23, 42, 0.8)", borderRadius: "4px", overflow: "hidden", position: "relative", boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}>
                  <div style={{ width: `${uploadStats.percentage}%`, height: "100%", backgroundColor: uploadStats.percentage === 100 ? "#39ff14" : "#00f0ff", transition: "width 0.3s ease", boxShadow: uploadStats.percentage === 100 ? "0 0 15px #39ff14" : "0 0 15px #00f0ff" }}></div>
                </div>
              </div>
            )}

            {uploadStats.total === 0 && (
              <button 
                onClick={executeBatchUpload} 
                disabled={files.length === 0} 
                className="mecha-element"
                style={{ 
                  width: "100%", backgroundColor: files.length > 0 ? "rgba(0, 255, 255, 0.2)" : "rgba(15, 23, 42, 0.6)", 
                  color: files.length > 0 ? "#0ff" : "#64748b", border: files.length > 0 ? "1px solid #0ff" : "1px solid #334155", 
                  padding: "1.2rem", borderRadius: "8px", cursor: files.length > 0 ? "pointer" : "not-allowed", 
                  fontFamily: "monospace", fontWeight: "900", letterSpacing: "3px", marginTop: "1.5rem", fontSize: "1.1rem",
                  transition: "all 0.2s ease", boxShadow: files.length > 0 ? "0 0 30px rgba(0, 255, 255, 0.4)" : "none"
                }}
              >
                {files.length > 0 ? `⚡ EXECUTE SECURE INJECTION ⚡` : "AWAITING PAYLOADS"}
              </button>
            )}
        </div>
      </div>
    </div>
  );
}