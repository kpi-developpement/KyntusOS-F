import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, UploadCloud, Database, CheckCircle, Terminal, MoveDown, ShieldAlert, Layers, Trash2, Activity } from 'lucide-react';
// 🔥 L'PROGRESS BAR KHASS YKOUN COMPOSANT KAY-AFFICHI "progress" f'l'Miya (%)
import CyberProgressBar from '../components/CyberProgressBar';

const API_BASE = "http://kyntusos.kyntus.fr:8082";

export default function FileUploadModal({ isOpen, onClose, onUpload, isUploading, defaultCategory, defaultYear, defaultMonth, onFileDeleted }: any) {
  const [files, setFiles] = useState<File[]>([]);
  
  const [category, setCategory] = useState<string>(defaultCategory || "RACC");
  const [year, setYear] = useState<number>(defaultYear || new Date().getFullYear());
  const [month, setMonth] = useState<number>(defaultMonth || new Date().getMonth() + 1);

  const [importedFiles, setImportedFiles] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 STATE L'JDID BASH N-TBE3OU L'UPLOADING B' T-TDEQIQ 🔥
  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0, percentage: 0 });

  const fetchImportedFiles = useCallback(() => {
    setLoadingFiles(true);
    fetch(`${API_BASE}/api/pilot-records/imported-files?category=${defaultCategory}&year=${defaultYear}&month=${defaultMonth}`)
      .then(res => res.json())
      .then(data => setImportedFiles(data || []))
      .catch(() => setImportedFiles([]))
      .finally(() => setLoadingFiles(false));
  }, [defaultCategory, defaultYear, defaultMonth]);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setYear(defaultYear);
      setMonth(defaultMonth);
      fetchImportedFiles();
      setUploadStats({ current: 0, total: 0, percentage: 0 }); // Reset UI
    }
  }, [isOpen, defaultCategory, defaultYear, defaultMonth, fetchImportedFiles]);

  useEffect(() => {
    if (!isOpen) { 
      setFiles([]); 
      setIsDragging(false);
      setUploadStats({ current: 0, total: 0, percentage: 0 });
    }
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isUploading && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(f => {
        const name = f.name.toLowerCase();
        return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
      });

      if (validFiles.length > 0) {
        setFiles(prev => [...prev, ...validFiles]);
      } else {
        alert("CRITICAL ERROR: INVALID PAYLOAD FORMAT. REQUIRE .XLSX OR .CSV");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDeleteImportedFile = async (filename: string) => {
    if (!window.confirm(`⚠️ ELIMINATE TARGET PAYLOAD?\n\nAre you sure you want to delete data from:\n${filename}`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/pilot-records/delete-file?category=${category}&year=${year}&month=${month}&filename=${encodeURIComponent(filename)}`, { 
        method: "DELETE" 
      });
      if (res.ok) {
        fetchImportedFiles(); 
        if(onFileDeleted) onFileDeleted(); 
      }
    } catch (error) {
      console.error("Error deleting file", error);
    }
  };

  // 🔥 L'INTELLIGENCE D'LES ARCHITECTES: TERTIB + MACHINE GUN UPLOAD + SMART PROGRESS BAR 🔥
  const executeBatchUpload = async () => {
    if (!files || files.length === 0) return;
    
    setUploadStats({ current: 0, total: files.length, percentage: 0 });
    
    // Sort en utilisant la fonction intelligente (Date ou Numero)
    const getFileRank = (filename: string) => {
      const prefixMatch = filename.match(/^(\d+)-/);
      if (prefixMatch) return parseInt(prefixMatch[1], 10);
      const dateMatch = filename.match(/(\d{2})(\d{2})(\d{4})/);
      if (dateMatch) return parseInt(`${dateMatch[3]}${dateMatch[2]}${dateMatch[1]}`, 10);
      return 999999999;
    };
    
    const sortedFiles = [...files].sort((a, b) => getFileRank(a.name) - getFileRank(b.name));

    // Lancement de l'Upload via la props, ms hna kan-gériw l'affichage
    try {
      for (let i = 0; i < sortedFiles.length; i++) {
        const file = sortedFiles[i];
        
        // Update UI Progress 
        setUploadStats({ 
           current: i + 1, 
           total: sortedFiles.length, 
           percentage: Math.round(((i) / sortedFiles.length) * 100) 
        });

        // Hna khassk d-dir logique dyal l'appel d'API (li dnay f'page.tsx, ghadi njibouha hna bash tbqa s-safi)
        // ⚠️ REMARQUE: Bima annek bghiti UI intelligente f'l'Modal, khass l'Fetch ykoun HNA machi b'Props bash yqder y-update l'State dyal Progress !
        const formData = new FormData(); 
        formData.append("file", file); 
        await fetch(`${API_BASE}/api/pilot-records/import/1?year=${year}&month=${month}&category=${category}`, { method: "POST", body: formData });
      }

      setUploadStats({ current: sortedFiles.length, total: sortedFiles.length, percentage: 100 });
      setTimeout(() => {
        if(onUpload) onUpload(); // Call parent to refresh table and close modal
      }, 1000);

    } catch (error) {
      console.error("BATCH UPLOAD ERROR:", error);
    }
  };


  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1050, backdropFilter: "blur(12px)" }}>
      <div className="hardware-accelerated" style={{ backgroundColor: "rgba(6, 11, 25, 0.85)", border: "1px solid rgba(0, 255, 255, 0.6)", borderRadius: "16px", width: "650px", maxWidth: "95%", padding: "2.5rem", boxShadow: "0 0 50px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.2)", position: "relative", overflow: "hidden", backdropFilter: "blur(20px)" }}>
        
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "4px", background: "linear-gradient(90deg, transparent, #0ff, #a855f7, #0ff, transparent)", animation: "scanline 2s linear infinite" }}></div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid rgba(0, 255, 255, 0.3)", paddingBottom: "15px" }}>
          <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", letterSpacing: "2px", fontFamily: "monospace", textShadow: "0 0 10px rgba(0,255,255,0.8)" }}>
            <Database color="#0ff" size={32} style={{ filter: "drop-shadow(0 0 8px #0ff)" }} /> BATCH UPLINK
          </h2>
          <button onClick={onClose} disabled={uploadStats.current > 0 && uploadStats.current < uploadStats.total} className="mecha-element" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.5)", color: "#ff4d4d", padding: "6px", borderRadius: "8px", cursor: (uploadStats.current > 0 && uploadStats.current < uploadStats.total) ? "not-allowed" : "pointer", boxShadow: "0 0 10px rgba(239,68,68,0.3)" }}><X size={26} /></button>
        </div>

        <div style={{ display: "flex", gap: "20px", backgroundColor: "rgba(15, 23, 42, 0.6)", padding: "1rem 1.5rem", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.4)", marginBottom: "1.5rem", justifyContent: "center", boxShadow: "inset 0 4px 20px rgba(0,0,0,0.5)" }}>
           <span style={{ color: "#0ff", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold", letterSpacing: "1px", textShadow: "0 0 8px rgba(0,255,255,0.6)" }}>TARGET: <span style={{ color: "#fff" }}>[{category}]</span></span>
           <span style={{ color: "#38bdf8" }}>///</span>
           <span style={{ color: "#a855f7", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold", letterSpacing: "1px", textShadow: "0 0 8px rgba(168,85,247,0.6)" }}>CYCLE: <span style={{ color: "#fff" }}>{String(month).padStart(2, '0')}/{year}</span></span>
        </div>

        <div style={{ marginBottom: "2rem", padding: "1.2rem", background: "rgba(10, 15, 30, 0.6)", borderRadius: "8px", border: "1px solid rgba(168, 85, 247, 0.5)", borderLeft: "4px solid #a855f7", boxShadow: "0 5px 15px rgba(0,0,0,0.3)" }}>
          <h3 style={{ color: "#d8b4fe", fontSize: "0.95rem", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "10px", margin: "0 0 12px 0", textShadow: "0 0 8px rgba(168, 85, 247, 0.8)", fontWeight: "bold" }}>
            <Terminal size={18} /> NEON LOG: INTEGRATED PAYLOADS
          </h3>
          
          {loadingFiles ? (
            <p style={{ color: "#a855f7", fontSize: "0.85rem", margin: 0, fontStyle: "italic", fontFamily: "monospace", animation: "pulse-op 1.5s infinite" }}>[ Scanning quantum records... ]</p>
          ) : importedFiles.length > 0 ? (
            <ul style={{ margin: 0, padding: "0 5px", listStyle: "none", maxHeight: "110px", overflowY: "auto" }} className="cyber-scroll">
              {importedFiles.map((f, idx) => (
                <li key={idx} style={{ color: "#e2e8f0", fontSize: "0.9rem", padding: "8px 0", borderBottom: "1px dashed rgba(51,65,85,0.6)", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "monospace" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                    <CheckCircle size={15} color="#39ff14" style={{ filter: "drop-shadow(0 0 5px #39ff14)", flexShrink: 0 }} /> 
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.5px" }}>{f}</span>
                  </div>
                  <Trash2 size={16} color="#ef4444" style={{ cursor: "pointer", flexShrink: 0, filter: "drop-shadow(0 0 5px #ef4444)" }} onClick={() => handleDeleteImportedFile(f)} />
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
               <ShieldAlert size={16} color="#94a3b8" />
               <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0, fontFamily: "monospace" }}>Memory matrix empty for this cycle.</p>
            </div>
          )}
        </div>

        {uploadStats.total === 0 && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              border: isDragging ? "2px dashed #0ff" : (files.length > 0 ? "2px solid #0ff" : "2px dashed #38bdf8"), 
              borderRadius: "12px", 
              padding: "2rem 1rem", 
              textAlign: "center", 
              cursor: "pointer", 
              backgroundColor: isDragging ? "rgba(0, 255, 255, 0.15)" : (files.length > 0 ? "rgba(0, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.4)"), 
              transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
              transform: isDragging ? "scale(1.03)" : "scale(1)",
              boxShadow: isDragging ? "0 0 50px rgba(0,255,255,0.3), inset 0 0 30px rgba(0,255,255,0.2)" : (files.length > 0 ? "0 0 15px rgba(0, 255, 255, 0.1)" : "none"),
              position: "relative",
              minHeight: "160px"
            }} 
          >
            {isDragging && <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "4px", backgroundColor: "#0ff", boxShadow: "0 0 20px #0ff" }}></div>}
            {isDragging && <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: "4px", backgroundColor: "#0ff", boxShadow: "0 0 20px #0ff" }}></div>}

            <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
            
            {files.length > 0 ? (
               <div>
                 <div style={{ position: "relative", width: "50px", height: "50px", margin: "0 auto 15px" }}>
                   <Layers size={50} color="#0ff" style={{ filter: "drop-shadow(0 0 10px rgba(0, 255, 255, 0.8))" }} />
                   <div style={{ position: "absolute", bottom: "-5px", right: "-15px", background: "#0f172a", borderRadius: "50%", padding: "2px 6px", border: "1px solid #0ff", color: "#0ff", fontSize: "0.8rem", fontWeight: "bold" }}>{files.length}</div>
                 </div>
                 
                 <div className="cyber-scroll" style={{ maxHeight: "90px", overflowY: "auto", textAlign: "left", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,255,255,0.2)" }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed rgba(0,255,255,0.2)", padding: "5px 0" }}>
                         <span style={{ color: "#fff", fontFamily: "monospace", fontSize: "0.85rem", textShadow: "0 0 5px rgba(0,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "80%" }}>{f.name}</span>
                         <X size={16} color="#ef4444" onClick={(e) => removeFile(e, i)} style={{ cursor: "pointer" }} />
                      </div>
                    ))}
                 </div>
                 <p style={{ color: "#39ff14", margin: "10px 0 0 0", fontSize: "0.9rem", fontFamily: "monospace", letterSpacing: "2px", fontWeight: "bold", textShadow: "0 0 5px #39ff14" }}>READY FOR BATCH INJECTION</p>
               </div>
            ) : (
               <div style={{ marginTop: "15px" }}>
                 <div style={{ position: "relative", width: "70px", height: "70px", margin: "0 auto 20px" }}>
                   <UploadCloud size={60} color={isDragging ? "#0ff" : "#38bdf8"} style={{ transition: "all 0.3s", position: "absolute", zIndex: 2, top: 0, left: "5px", filter: isDragging ? "drop-shadow(0 0 15px #0ff)" : "drop-shadow(0 0 5px rgba(56,189,248,0.5))" }} />
                   {isDragging && <MoveDown size={32} color="#fff" style={{ position: "absolute", top: "-30px", left: "18px", animation: "bounce 1s infinite", filter: "drop-shadow(0 0 8px #fff)" }} />}
                 </div>
                 <p style={{ color: isDragging ? "#fff" : "#0ea5e9", margin: "0 0 8px 0", fontSize: "1.2rem", fontFamily: "monospace", fontWeight: "900", letterSpacing: "1px", transition: "color 0.3s", textShadow: isDragging ? "0 0 10px #0ff" : "none" }}>
                   {isDragging ? "INITIATING TRACTOR BEAM..." : "DRAG & DROP PAYLOADS HERE"}
                 </p>
                 <p style={{ color: "#94a3b8", margin: 0, fontSize: "0.95rem", fontFamily: "monospace" }}>[ Click to browse manual override multiple files ]</p>
               </div>
            )}
          </div>
        )}

        {/* 🔥 L'UI M-JNOUNA DYAL PROGRESS BAR 🔥 */}
        {uploadStats.total > 0 && (
          <div style={{ marginTop: "20px", padding: "1.5rem", background: "rgba(0, 240, 255, 0.05)", border: "1px solid rgba(0, 240, 255, 0.3)", borderRadius: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Activity size={24} color="#00f0ff" style={{ animation: uploadStats.percentage < 100 ? "pulse-neon 1s infinite" : "none" }} />
                <span style={{ color: "#00f0ff", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "bold", textShadow: "0 0 8px rgba(0,255,255,0.5)" }}>
                  {uploadStats.percentage < 100 ? `SYNCHRONIZING BATCH...` : `SYNCHRONIZATION COMPLETE!`}
                </span>
              </div>
              <span style={{ color: "#39ff14", fontFamily: "monospace", fontSize: "1.1rem", fontWeight: "900", letterSpacing: "2px" }}>
                {uploadStats.current} / {uploadStats.total} FILES
              </span>
            </div>
            
            {/* The Actual Progress Bar */}
            <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(15, 23, 42, 0.8)", borderRadius: "4px", overflow: "hidden", position: "relative", boxShadow: "inset 0 0 5px rgba(0,0,0,0.5)" }}>
              <div style={{ 
                width: `${uploadStats.percentage}%`, 
                height: "100%", 
                backgroundColor: uploadStats.percentage === 100 ? "#39ff14" : "#00f0ff", 
                transition: "width 0.3s ease",
                boxShadow: uploadStats.percentage === 100 ? "0 0 15px #39ff14" : "0 0 15px #00f0ff"
              }}></div>
            </div>
            <div style={{ textAlign: "right", marginTop: "8px", color: uploadStats.percentage === 100 ? "#39ff14" : "#00f0ff", fontFamily: "monospace", fontWeight: "bold" }}>
              {uploadStats.percentage}%
            </div>
          </div>
        )}

        {uploadStats.total === 0 && (
          <button 
            onClick={executeBatchUpload} 
            disabled={files.length === 0} 
            className={`mecha-element`}
            style={{ 
              width: "100%", 
              backgroundColor: files.length > 0 ? "rgba(0, 255, 255, 0.2)" : "rgba(15, 23, 42, 0.6)", 
              color: files.length > 0 ? "#0ff" : "#64748b", 
              border: files.length > 0 ? "1px solid #0ff" : "1px solid #334155", 
              padding: "1.2rem", 
              borderRadius: "8px", 
              cursor: files.length > 0 ? "pointer" : "not-allowed", 
              fontFamily: "monospace",
              fontWeight: "900", 
              letterSpacing: "3px",
              marginTop: "2.5rem", 
              fontSize: "1.2rem",
              transition: "all 0.2s ease",
              boxShadow: files.length > 0 ? "0 0 30px rgba(0, 255, 255, 0.4)" : "none",
              textTransform: "uppercase"
            }}
          >
            {files.length > 0 ? `⚡ EXECUTE BATCH OVERRIDE ⚡` : "AWAITING CORE PAYLOADS"}
          </button>
        )}
      </div>
    </div>
  );
}