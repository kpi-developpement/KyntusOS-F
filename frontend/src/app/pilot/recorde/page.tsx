"use client";

import React, { useEffect, useState } from "react";
import SmartTable from "./components/SmartTable";
import FileUploadModal from "./ui/FileUploadModal"; 
import { Terminal, UploadCloud, CheckCircle, Search, X } from "lucide-react";

export default function PilotRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Pagination & Server Filters States
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  
  // 🔥 L'FILTRE AVANCÉ
  const [serverVersion, setServerVersion] = useState("");
  const [serverEps, setServerEps] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Kan-lss9ou l'filtres f l'URL
      let url = `http://localhost:8080/api/pilot-records/1?page=${page}&size=${pageSize}`;
      if (serverVersion) url += `&version=${serverVersion}`;
      if (serverEps) url += `&eps=${serverEps}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.content || []); 
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || 0);
      }
    } catch (error) {
      console.error("Fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, pageSize, serverVersion, serverEps]); // Melli y-tbeddel l'filtre, y-fetchi direct

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`http://localhost:8080/api/pilot-records/import/1`, { method: "POST", body: formData });
      if (res.ok) {
        setIsModalOpen(false);
        setSuccessMsg("Importation MASSIVE réussie !");
        setTimeout(() => setSuccessMsg(""), 4000);
        setPage(0);
        fetchRecords(); 
      }
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  // Fonction bach t-msse7 l'filtres
  const clearFilters = () => {
    setServerVersion("");
    setServerEps("");
    setPage(0);
  };

  return (
    <main style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#020617" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Terminal size={28} color="#0ff" />
          <h1 style={{ color: "#e2e8f0", margin: 0, fontFamily: "monospace", fontSize: "1.8rem" }}>
            DATA <span style={{ color: "#0ff" }}>RECORDS</span>
          </h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(0, 255, 255, 0.05)", color: "#0ff",
            border: "1px solid #0ff", padding: "0.6rem 1.2rem", borderRadius: "4px", cursor: "pointer", fontFamily: "monospace"
          }}
        >
          <UploadCloud size={18} /> IMPORT EXCEL
        </button>
      </div>

      {/* 🔥 BARRE DE FILTRAGE AVANCÉ (SERVER-SIDE) 🔥 */}
      <div style={{ 
        display: "flex", gap: "15px", marginBottom: "1.5rem", padding: "1rem", 
        backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", alignItems: "center" 
      }}>
        <Search size={20} color="#64748b" />
        
        <input 
          type="text" 
          placeholder="Rechercher par idIntervention..." 
          value={serverEps}
          onChange={(e) => { setServerEps(e.target.value); setPage(0); }}
          style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.5rem 1rem", borderRadius: "4px", outline: "none", width: "300px" }}
        />

        <select 
          value={serverVersion}
          onChange={(e) => { setServerVersion(e.target.value); setPage(0); }}
          style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "0.5rem 1rem", borderRadius: "4px", outline: "none" }}
        >
          <option value="">Toutes les versions</option>
          <option value="V1">Version 1 (V1)</option>
          <option value="V2">Version 2 (V2)</option>
          <option value="V3">Version 3 (V3)</option>
        </select>

        {(serverVersion || serverEps) && (
          <button onClick={clearFilters} style={{ display: "flex", alignItems: "center", gap: "5px", background: "transparent", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>
            <X size={16} /> Effacer Filtres
          </button>
        )}
      </div>

      {successMsg && (
        <div style={{ marginBottom: "1rem", color: "#39ff14", fontFamily: "monospace", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      <SmartTable 
        data={records} 
        loading={loading}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalPages={totalPages}
        totalItems={totalItems}
      />

      <FileUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onUpload={handleUpload} />
    </main>
  );
}