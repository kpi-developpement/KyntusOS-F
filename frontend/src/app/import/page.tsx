"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Cpu, Zap, CheckCircle2, AlertTriangle, FileSpreadsheet, DatabaseZap } from "lucide-react";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import styles from "./Import.module.css";

export default function ImportPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Templates
  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data || []))
      .catch((err) => console.error("Error fetching templates:", err));
  }, []);

  // 2. Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setMessage(null);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  // 3. Injection Logic
  const handleImport = async () => {
    if (!selectedTemplate) {
      setMessage({ text: "SYSTEM HALT: Veuillez choisir un Protocole Cible.", type: "error" });
      return;
    }
    if (!file) {
      setMessage({ text: "SYSTEM HALT: Aucun payload (Fichier Excel) détecté.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/import/${selectedTemplate}`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const text = await res.text();
        setMessage({ text: `[SUCCESS] PAYLOAD INJECTED: ${text}`, type: "success" });
        setFile(null); 
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const errorText = await res.text();
        setMessage({ text: `[ERROR] INJECTION FAILED: ${errorText}`, type: "error" });
      }
    } catch (error) {
      setMessage({ text: "[FATAL] CONNECTION TO NEXUS CORE LOST.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Background Global */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <InteractiveBackground />
      </div>

      <div className={styles.container}>
        <motion.div 
          className={styles.terminal}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          
          {/* HEADER */}
          <div className={styles.header}>
            <h1 className={styles.title}>DATA <span>INJECTION</span></h1>
            <p className={styles.subtitle}>
              <Cpu size={16} /> UPLOAD EXCEL PAYLOAD TO WORKFLOW CORE
            </p>
          </div>

          {/* STEP 1: SELECT TEMPLATE */}
          <div className={styles.stepBox}>
            <div className={styles.stepLabel}>
              <span className={styles.stepNumber}>1</span> TARGET PROTOCOL
            </div>
            <select 
              className={styles.cyberSelect}
              value={selectedTemplate}
              onChange={(e) => { setSelectedTemplate(e.target.value); setMessage(null); }}
              disabled={loading}
            >
              <option value="" disabled>-- INITIALIZE PROTOCOL --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (ID: {t.id})
                </option>
              ))}
            </select>
          </div>

          {/* STEP 2: DROPZONE REACTOR */}
          <div className={styles.stepBox}>
            <div className={styles.stepLabel}>
              <span className={styles.stepNumber}>2</span> UPLOAD PAYLOAD (.XLSX)
            </div>
            
            <div 
              className={`${styles.dropzone} ${isDragging ? styles.active : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !loading && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".xlsx, .xls, .csv" 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
                disabled={loading}
              />
              
              {file ? (
                <div className={styles.fileReady}>
                  <FileSpreadsheet size={60} color="#39ff14" />
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.dropSub}>{(file.size / 1024 / 1024).toFixed(2)} MB - Ready for injection</div>
                </div>
              ) : (
                <>
                  <UploadCloud size={60} color={isDragging ? "#00f0ff" : "#64748b"} className={styles.dropIcon} />
                  <h3 className={styles.dropTitle}>
                    {isDragging ? "DROP TO LOCK TARGET" : "DRAG & DROP EXCEL FILE HERE"}
                  </h3>
                  <p className={styles.dropSub}>or click to browse local system</p>
                </>
              )}
            </div>
          </div>

          {/* ACTION BUTTON */}
          <button 
            className={styles.injectBtn} 
            onClick={handleImport}
            disabled={loading || !file || !selectedTemplate}
          >
            {loading ? (
              <>
                <Zap size={24} className={styles.spin} /> INJECTING DATA...
              </>
            ) : (
              <>
                <DatabaseZap size={24} /> ENGAGE INJECTION
              </>
            )}
          </button>

          {/* TERMINAL LOGS (MESSAGES) */}
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`${styles.terminalLog} ${message.type === 'success' ? styles.logSuccess : styles.logError}`}
              >
                {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                <div>
                  <strong style={{ display: 'block', marginBottom: '4px' }}>
                    {message.type === 'success' ? 'SYSTEM OVERRIDE SUCCESSFUL' : 'CRITICAL ERROR DETECTED'}
                  </strong>
                  {message.text}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </>
  );
}