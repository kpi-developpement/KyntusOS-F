"use client";

import React, { useEffect, useState, useRef } from "react";
import SmartTable from "./components/SmartTable";
import FileUploadModal from "./ui/FileUploadModal"; 
import { Terminal, UploadCloud, CheckCircle, Search, X, Trash2, DownloadCloud, History, Clock, FileText } from "lucide-react";

export default function PilotRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingHistory, setIsExportingHistory] = useState(false); 

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  const [serverVersion, setServerVersion] = useState("");
  const [serverEps, setServerEps] = useState("");
  
  const [dynamicVersions, setDynamicVersions] = useState<string[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyEpsInput, setHistoryEpsInput] = useState("");
  const [epsHistoryData, setEpsHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDynamicVersions = async () => {
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/versions`);
      if (res.ok) {
        const data = await res.json();
        setDynamicVersions(data);
      }
    } catch (error) {}
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let url = `http://kyntusos.kyntus.fr:8082/api/pilot-records/1?page=${page}&size=${pageSize}`;
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
  };

  useEffect(() => {
    fetchDynamicVersions();
    fetchRecords();
  }, [page, pageSize, serverVersion, serverEps]);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/import/1`, { method: "POST", body: formData });
      if (res.ok) {
        setIsModalOpen(false);
        setSuccessMsg("Importation MASSIVE réussie !");
        setTimeout(() => setSuccessMsg(""), 4000);
        setPage(0);
        fetchDynamicVersions(); 
        fetchRecords(); 
      }
    } catch (error) {}
  };

  const handleClearDB = async () => {
    const isConfirmed = window.confirm("⚠️ Voulez-vous vraiment supprimer TOUTE la base de données ?");
    if (!isConfirmed) return;
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/clear`, { method: "DELETE" });
      if (res.ok) {
        setSuccessMsg("Base de données nettoyée !");
        setTimeout(() => setSuccessMsg(""), 4000);
        setPage(0);
        fetchDynamicVersions();
        fetchRecords(); 
      }
    } catch (error) {}
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/export/1`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Kyntus_Export_${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        setSuccessMsg("Exportation Excel réussie !");
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (error) {} 
    finally { setIsExporting(false); }
  };

  const handleHistoryFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExportingHistory(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/export-history/1`, { 
        method: "POST", 
        body: formData 
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Historique_EPS_${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        
        setSuccessMsg("Historique généré avec succès !");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        alert("Erreur: Vérifiez votre fichier.");
      }
    } catch (error) {
      console.error("Export history failed", error);
    } finally {
      setIsExportingHistory(false);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  const clearFilters = () => {
    setServerVersion("");
    setServerEps("");
    setPage(0);
  };

  const fetchEpsHistory = async () => {
    if (!historyEpsInput) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`http://kyntusos.kyntus.fr:8082/api/pilot-records/history/${historyEpsInput.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setEpsHistoryData(data);
      }
    } catch (error) {} 
    finally { setLoadingHistory(false); }
  };

  return (
    <main style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#020617" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Terminal size={28} color="#0ff" />
          <h1 style={{ color: "#e2e8f0", margin: 0, fontFamily: "monospace", fontSize: "1.8rem" }}>
            DATA <span style={{ color: "#0ff" }}>RECORDS</span>
          </h1>
        </div>
        
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={handleClearDB} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(239, 68, 68, 0.05)", color: "#ef4444", border: "1px solid #ef4444", padding: "0.6rem 1.2rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace" }}>
            <Trash2 size={18} /> CLEAR DB
          </button>
          
          <button onClick={handleExport} disabled={isExporting} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: isExporting ? "rgba(57, 255, 20, 0.2)" : "rgba(57, 255, 20, 0.05)", color: "#39ff14", border: "1px solid #39ff14", padding: "0.6rem 1.2rem", borderRadius: "4px", cursor: isExporting ? "wait" : "pointer", fontFamily: "monospace" }}>
            <DownloadCloud size={18} /> {isExporting ? "GÉNÉRATION..." : "EXPORT EXCEL"}
          </button>
          
          <button onClick={() => setIsModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(0, 255, 255, 0.05)", color: "#0ff", border: "1px solid #0ff", padding: "0.6rem 1.2rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace" }}>
            <UploadCloud size={18} /> IMPORT EXCEL
          </button>

          {/* 🔥 BOUTON EXPORT HISTORIQUE HYBRIDE (.TXT, .CSV, .XLSX) */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleHistoryFileUpload} 
            accept=".txt, .csv, .xlsx, .xls" 
            style={{ display: 'none' }} 
          />
          <button onClick={() => fileInputRef.current?.click()} disabled={isExportingHistory} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: isExportingHistory ? "rgba(255, 165, 0, 0.2)" : "rgba(255, 165, 0, 0.05)", color: "#ffa500", border: "1px solid #ffa500", padding: "0.6rem 1.2rem", borderRadius: "4px", cursor: isExportingHistory ? "wait" : "pointer", fontFamily: "monospace" }}>
            <FileText size={18} /> {isExportingHistory ? "TRAITEMENT..." : "EXPORT HISTORIQUE PAR EPS"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "15px", marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <Search size={20} color="#64748b" />
        <input type="text" placeholder="Rechercher par idIntervention..." value={serverEps} onChange={(e) => { setServerEps(e.target.value); setPage(0); }} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.5rem 1rem", borderRadius: "4px", outline: "none", width: "300px" }} />
        
        <select value={serverVersion} onChange={(e) => { setServerVersion(e.target.value); setPage(0); }} style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.5rem 1rem", borderRadius: "4px", outline: "none" }}>
          <option value="">Toutes les versions</option>
          {dynamicVersions.map((v) => (
            <option key={v} value={v}>Version {v.replace('V', '')} ({v})</option>
          ))}
        </select>
        
        {(serverVersion || serverEps) && (
          <button onClick={clearFilters} style={{ display: "flex", alignItems: "center", gap: "5px", background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "0.9rem" }}><X size={16} /> Effacer</button>
        )}

        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setIsHistoryModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(168, 85, 247, 0.1)", color: "#a855f7", border: "1px solid #a855f7", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace" }}>
            <History size={18} /> HISTORIQUE (RECHERCHE RAPIDE)
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ marginBottom: "1rem", color: "#39ff14", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle size={16} /> {successMsg}</div>
      )}

      <SmartTable data={records} loading={loading} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalPages={totalPages} totalItems={totalItems} />
      
      <FileUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUpload={handleUpload} />

      {isHistoryModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", width: "600px", maxWidth: "90%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "1.5rem", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: "1.2rem", display: "flex", alignItems: "center", gap: "10px", fontFamily: "monospace" }}>
                <Clock color="#a855f7" /> TIMELINE EPS
              </h2>
              <button onClick={() => { setIsHistoryModalOpen(false); setEpsHistoryData([]); setHistoryEpsInput(""); }} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: "1.5rem", display: "flex", gap: "10px" }}>
              <input 
                type="text" placeholder="Entrez l'idIntervention (EPS)..." 
                value={historyEpsInput} onChange={(e) => setHistoryEpsInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchEpsHistory()}
                style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.8rem", borderRadius: "4px", outline: "none", fontFamily: "monospace" }} 
              />
              <button onClick={fetchEpsHistory} style={{ backgroundColor: "#a855f7", color: "#fff", border: "none", padding: "0 1.5rem", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
                CHERCHER
              </button>
            </div>

            <div style={{ padding: "0 1.5rem 1.5rem", overflowY: "auto", flex: 1 }}>
              {loadingHistory && <p style={{ color: "#0ff", fontFamily: "monospace", textAlign: "center" }}>Recherche dans la base...</p>}
              
              {!loadingHistory && epsHistoryData.length === 0 && historyEpsInput && (
                <p style={{ color: "#ef4444", fontFamily: "monospace", textAlign: "center" }}>Aucun historique trouvé pour cet EPS.</p>
              )}

              {!loadingHistory && epsHistoryData.length > 0 && (
                <div style={{ position: "relative", paddingLeft: "20px", borderLeft: "2px solid #334155", marginLeft: "10px" }}>
                  {epsHistoryData.map((item, index) => (
                    <div key={index} style={{ marginBottom: "1.5rem", position: "relative" }}>
                      <div style={{ position: "absolute", left: "-27px", top: "0", width: "12px", height: "12px", borderRadius: "50%", backgroundColor: index === epsHistoryData.length - 1 ? "#39ff14" : "#a855f7", border: "2px solid #0f172a" }}></div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "5px" }}>
                        <span style={{ backgroundColor: index === epsHistoryData.length - 1 ? "rgba(57, 255, 20, 0.1)" : "rgba(168, 85, 247, 0.1)", color: index === epsHistoryData.length - 1 ? "#39ff14" : "#a855f7", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>{item.version}</span>
                        <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{new Date(item.importedAt).toLocaleString()}</span>
                      </div>
                      <div style={{ backgroundColor: "#1e293b", padding: "10px", borderRadius: "4px", color: "#e2e8f0", fontSize: "0.95rem", borderLeft: `3px solid ${index === epsHistoryData.length - 1 ? "#39ff14" : "#a855f7"}` }}>
                        {item.commentaire || <span style={{ color: "#64748b", fontStyle: "italic" }}>Aucun commentaire</span>}
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