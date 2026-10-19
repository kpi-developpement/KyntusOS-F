"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Zap,
  Settings,
  Database,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import QuantumDataGrid from './ux/QuantumDataGrid';
import HoloSpreadsheet from './components/HoloSpreadsheet';

export default function FacturePage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [sheetsData, setSheetsData] = useState<Record<string, any[]> | null>(null);
  const [finalExcelBlob, setFinalExcelBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 📂 STATE DYAL LES FICHIERS
  const [filesMap, setFilesMap] = useState<{
    vide: File | null;
    tvc: File | null;
    rep: File | null;
    diag: File | null;
    qa: File | null;
    intervention: File | null;
  }>({
    vide: null,
    tvc: null,
    rep: null,
    diag: null,
    qa: null,
    intervention: null
  });

  // 💰 STATE DYAL DEVIS OVERRIDE
  const [devisMap, setDevisMap] = useState<Record<string, number>>({});
  const [epsInput, setEpsInput] = useState('');
  const [valInput, setValInput] = useState('');

  // --- 1. SELECTION DYAL LES FICHIERS ---
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    const newMap = { ...filesMap };

    Array.from(files).forEach((file) => {
      const name = file.name.toUpperCase();
      if (name.includes("VIDE")) newMap.vide = file;
      else if (name.includes("TVC")) newMap.tvc = file;
      else if (name.includes("REPETEUR") || name.includes("VALIDATION")) newMap.rep = file;
      else if (name.includes("DIAG")) newMap.diag = file;
      else if (name.includes("QUESTION") || name.includes("ANSWER")) newMap.qa = file;
      else if (name.includes("INTERVENTION") || name.includes("BOTE")) newMap.intervention = file;
    });

    setFilesMap(newMap);
  };

  // --- 2. GESTION DYAL DEVIS ---
  const handleAddDevis = () => {
    if (!epsInput.trim() || !valInput.trim()) return;
    const value = parseFloat(valInput);
    if (isNaN(value)) return;

    setDevisMap({ ...devisMap, [epsInput.trim().toUpperCase()]: value });
    setEpsInput('');
    setValInput('');
  };

  const handleRemoveDevis = (eps: string) => {
    const newMap = { ...devisMap };
    delete newMap[eps];
    setDevisMap(newMap);
  };

  // --- 3. LANCEMENT DYAL T-TRAITEMENT L-BACKEND ---
  const handleGenerate = async () => {
    if (!filesMap.vide || !filesMap.tvc || !filesMap.rep || !filesMap.diag || !filesMap.qa) {
      setErrorMessage("⚠️ PROTOCOLE REFUSÉ : Fichiers vitaux manquants (A VIDE, TVC, Repeteur, Diag Wifi, QA).");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const formData = new FormData();

    formData.append("fichierAVide", filesMap.vide);
    formData.append("fichierTVC", filesMap.tvc);
    formData.append("fichierRepeteur", filesMap.rep);
    formData.append("fichierDiagWifi", filesMap.diag);
    formData.append("fichierQA", filesMap.qa);
    if (filesMap.intervention) formData.append("fichierIntervention", filesMap.intervention);

    if (Object.keys(devisMap).length > 0) {
      formData.append("devisData", JSON.stringify(devisMap));
    }

    // 🛡️ ANTI-CRASH TIMEOUT (5 Minutes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const directBackendUrl = `http://10.10.10.25:8082/api/facture/generate`;
      console.log("🚀 Envoi direct vers le Backend :", directBackendUrl);

      const response = await fetch(directBackendUrl, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[CRASH SERVEUR ${response.status}] ${errorText || "Anomalie Inconnue."}`);
      }

      const blob = await response.blob();
      setFinalExcelBlob(blob);

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const parsedSheets: Record<string, any[]> = {};
      workbook.SheetNames.forEach((sheetName) => {
        parsedSheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
      });

      setSheetsData(parsedSheets);
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        setErrorMessage("⚠️ TIMEOUT : Le serveur a mis trop de temps à répondre.");
      } else if (err.message.includes("Failed to fetch")) {
        setErrorMessage("⚠️ ERREUR RÉSEAU : Impossible de contacter le port 8082. Vérifiez que le port est ouvert dans le pare-feu du serveur.");
      } else {
        setErrorMessage(err.message || "Erreur de connexion au serveur Backend.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    if (!finalExcelBlob) return;
    const url = window.URL.createObjectURL(finalExcelBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Facture_Kyntus_Nexus_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const fileItems = [
    { key: 'vide', label: 'A VIDE', required: true },
    { key: 'tvc', label: 'TVC', required: true },
    { key: 'rep', label: 'RÉPÉTEUR', required: true },
    { key: 'diag', label: 'DIAG WIFI', required: true },
    { key: 'qa', label: 'QA DONNÉES', required: true },
    { key: 'intervention', label: 'INTERVENTION', required: false }
  ];

  const loadedCount = fileItems.filter((item) => !!filesMap[item.key as keyof typeof filesMap]).length;

  return (
    <main className="nexus-lux-root">
      <style>{`
        .nexus-lux-root {
          padding: 2.5rem 2rem 4rem 2rem;
          min-height: 100vh;
          position: relative;
          color: #0F172A;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .nexus-container {
          max-width: 1420px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }
        .lux-card {
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(28px) saturate(190%);
          border: 1px solid rgba(0, 82, 255, 0.14);
          border-radius: 28px;
          padding: 2.2rem;
          box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(255, 255, 255, 0.95) inset;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .lux-card:hover {
          border-color: rgba(0, 82, 255, 0.28);
          box-shadow: 0 28px 60px -12px rgba(0, 82, 255, 0.1), 0 0 0 1px rgba(255, 255, 255, 1) inset;
        }
        .lux-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.2rem 1.5rem;
          border: 2px dashed rgba(0, 82, 255, 0.35);
          border-radius: 20px;
          cursor: pointer;
          background: linear-gradient(180deg, rgba(239, 246, 255, 0.7) 0%, rgba(255, 255, 255, 0.9) 100%);
          transition: all 0.25s ease;
          margin-bottom: 1.5rem;
        }
        .lux-dropzone:hover {
          border-color: #0052FF;
          background: linear-gradient(180deg, rgba(219, 234, 254, 0.65) 0%, rgba(255, 255, 255, 0.95) 100%);
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(0, 82, 255, 0.1);
        }
        .lux-input {
          background: #F8FAFC;
          border: 1px solid #CBD5E1;
          border-radius: 14px;
          padding: 13px 16px;
          color: #0F172A;
          font-size: 0.92rem;
          font-weight: 600;
          outline: none;
          transition: all 0.2s ease;
        }
        .lux-input:focus {
          background: #FFFFFF;
          border-color: #0052FF;
          box-shadow: 0 0 0 4px rgba(0, 82, 255, 0.12);
        }
      `}</style>

      {/* 3D LUXURY WHITE & SAPPHIRE BACKGROUND */}
      <QuantumDataGrid />

      <div className="nexus-container">
        {/* TOP NAVIGATION / EXECUTIVE HEADER */}
        <motion.header
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(0, 82, 255, 0.14)',
            borderRadius: '26px',
            padding: '1.5rem 2.2rem',
            marginBottom: '2.2rem',
            boxShadow: '0 20px 45px -15px rgba(0, 82, 255, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #0052FF 0%, #0EA5E9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 26px rgba(0, 82, 255, 0.3)'
              }}
            >
              <Cpu size={28} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    background: '#EFF6FF',
                    color: '#0052FF',
                    border: '1px solid rgba(0, 82, 255, 0.2)',
                    padding: '4px 12px',
                    borderRadius: '99px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em'
                  }}
                >
                  KYNTUS QUANTUM SUITE • 2026
                </span>
              </div>
              <h1
                style={{
                  fontSize: '2.35rem',
                  fontWeight: 900,
                  margin: '4px 0 0 0',
                  letterSpacing: '-0.03em',
                  color: '#0F172A'
                }}
              >
                NEXUS <span style={{ color: '#0052FF' }}>ENGINE</span>
              </h1>
            </div>
          </div>

          {/* STATUS TELEMETRY PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <FileSpreadsheet size={18} color="#0052FF" />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700 }}>MODULES CHARGÉS</div>
                <div style={{ fontSize: '0.95rem', color: '#0F172A', fontWeight: 800 }}>{loadedCount} / 6 Fichiers</div>
              </div>
            </div>

            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid rgba(0, 82, 255, 0.2)',
                borderRadius: '16px',
                padding: '10px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <ShieldCheck size={18} color="#0052FF" />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 700 }}>ÉTAT SYSTÈME</div>
                <div style={{ fontSize: '0.92rem', color: '#0052FF', fontWeight: 800 }}>PORT 8082 ACTIF</div>
              </div>
            </div>
          </div>
        </motion.header>

        {/* SYSTEM ERROR ALERT */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{
                background: 'rgba(254, 242, 242, 0.92)',
                border: '1px solid #FECACA',
                borderLeft: '6px solid #DC2626',
                padding: '1.15rem 1.5rem',
                borderRadius: '18px',
                color: '#991B1B',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '2rem',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 14px 30px rgba(220, 38, 38, 0.08)'
              }}
            >
              <AlertTriangle size={26} color="#DC2626" />
              <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                <strong style={{ fontWeight: 800 }}>SYSTEM HALT : </strong>
                {errorMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2-COLUMN LUXURY BENTO GRID */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
            gap: '2rem',
            marginBottom: '2.2rem'
          }}
        >
          {/* PANEL 1: ALIMENTATION DES DONNÉES */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lux-card"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '14px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: '#EFF6FF',
                    padding: '8px',
                    borderRadius: '10px',
                    color: '#0052FF',
                    display: 'flex'
                  }}
                >
                  <Database size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  ALIMENTATION DES DONNÉES
                </h2>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0052FF' }}>
                Auto-Détection Active
              </span>
            </div>

            <label className="lux-dropzone">
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #0052FF 0%, #0EA5E9 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                  boxShadow: '0 10px 24px rgba(0, 82, 255, 0.25)'
                }}
              >
                <UploadCloud size={30} color="#FFFFFF" />
              </div>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', marginBottom: '4px' }}>
                SÉLECTIONNER LES FICHIERS (.XLSX / .CSV)
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
                Glissez ou cliquez pour charger simultanément vos 6 rapports
              </span>
              <input
                type="file"
                multiple
                accept=".xlsx,.csv"
                onChange={handleFilesSelect}
                style={{ display: 'none' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {fileItems.map((item) => {
                const fileObj = filesMap[item.key as keyof typeof filesMap];
                const isLoaded = !!fileObj;
                return (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: isLoaded ? '#EFF6FF' : '#F8FAFC',
                      borderRadius: '14px',
                      border: `1px solid ${isLoaded ? '#3B82F6' : '#E2E8F0'}`,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      {isLoaded ? (
                        <CheckCircle2 size={18} color="#0052FF" style={{ flexShrink: 0 }} />
                      ) : (
                        <XCircle size={18} color="#94A3B8" style={{ flexShrink: 0 }} />
                      )}
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            color: isLoaded ? '#0F172A' : '#64748B'
                          }}
                        >
                          {item.label} {item.required && <span style={{ color: '#0052FF' }}>*</span>}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: isLoaded ? '#0052FF' : '#94A3B8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '140px',
                            fontWeight: 600
                          }}
                        >
                          {fileObj ? fileObj.name : 'En attente...'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* PANEL 2: MANUAL OVERRIDE PROTOCOL (DEVIS) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="lux-card"
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '14px',
                marginBottom: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: '#EFF6FF',
                    padding: '8px',
                    borderRadius: '10px',
                    color: '#0052FF',
                    display: 'flex'
                  }}
                >
                  <Settings size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  OVERRIDE MANUEL (SUPPORT DEVIS)
                </h2>
              </div>
              <span
                style={{
                  background: '#EFF6FF',
                  color: '#0052FF',
                  padding: '4px 10px',
                  borderRadius: '99px',
                  fontSize: '0.75rem',
                  fontWeight: 800
                }}
              >
                {Object.keys(devisMap).length} Actif(s)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              <input
                type="text"
                placeholder="Code EPS (ex: EPS-4920)..."
                value={epsInput}
                onChange={(e) => setEpsInput(e.target.value)}
                className="lux-input"
                style={{ flex: 2, textTransform: 'uppercase' }}
              />
              <input
                type="number"
                placeholder="Montant (€)"
                value={valInput}
                onChange={(e) => setValInput(e.target.value)}
                className="lux-input"
                style={{ flex: 1 }}
              />
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleAddDevis}
                style={{
                  background: 'linear-gradient(135deg, #0052FF 0%, #0EA5E9 100%)',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '0 20px',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(0, 82, 255, 0.25)'
                }}
              >
                <Plus size={22} />
              </motion.button>
            </div>

            <div
              style={{
                flex: 1,
                background: '#F8FAFC',
                borderRadius: '18px',
                border: '1px solid #E2E8F0',
                minHeight: '190px',
                maxHeight: '250px',
                overflowY: 'auto',
                padding: '14px'
              }}
            >
              {Object.keys(devisMap).length === 0 ? (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94A3B8',
                    paddingTop: '36px'
                  }}
                >
                  <Sparkles size={26} color="#93C5FD" style={{ marginBottom: '8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#64748B' }}>
                    AUCUN OVERRIDE DEVIS ACTIF
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '2px' }}>
                    Ajoutez un code EPS et sa valeur en euros ci-dessus
                  </div>
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {Object.entries(devisMap).map(([eps, val]) => (
                    <li
                      key={eps}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#FFFFFF',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 82, 255, 0.18)',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
                      }}
                    >
                      <span style={{ color: '#0052FF', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.92rem' }}>
                        {eps}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span
                          style={{
                            background: '#EFF6FF',
                            color: '#1E40AF',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}
                        >
                          {val} €
                        </span>
                        <Trash2
                          size={17}
                          color="#EF4444"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleRemoveDevis(eps)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </div>

        {/* MASTER CTA BUTTON */}
        <motion.button
          onClick={handleGenerate}
          disabled={isProcessing}
          whileHover={!isProcessing ? { scale: 1.01, boxShadow: '0 22px 45px rgba(0, 82, 255, 0.32)' } : {}}
          whileTap={!isProcessing ? { scale: 0.99 } : {}}
          style={{
            width: '100%',
            padding: '22px',
            background: isProcessing
              ? '#CBD5E1'
              : 'linear-gradient(90deg, #0052FF 0%, #0284C7 50%, #0052FF 100%)',
            border: 'none',
            borderRadius: '20px',
            color: isProcessing ? '#475569' : '#FFFFFF',
            fontSize: '1.2rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            marginBottom: '3rem',
            boxShadow: isProcessing ? 'none' : '0 16px 36px rgba(0, 82, 255, 0.25)'
          }}
        >
          {isProcessing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'flex' }}
              >
                <Zap size={24} />
              </motion.div>
              FUSION QUANTIQUE EN COURS...
            </>
          ) : (
            <>
              <Zap size={24} /> LANCER LA FUSION DE FACTURATION
            </>
          )}
        </motion.button>

        {/* SPREADSHEET RESULTS */}
        <AnimatePresence>
          {sheetsData && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 22 }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
                <div
                  style={{
                    background: '#EFF6FF',
                    color: '#0052FF',
                    padding: '10px 24px',
                    borderRadius: '99px',
                    border: '1px solid rgba(0, 82, 255, 0.25)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 10px 25px rgba(0, 82, 255, 0.12)'
                  }}
                >
                  <CheckCircle2 size={18} color="#0052FF" /> OPÉRATION TERMINÉE AVEC SUCCÈS • MATRICE PRÊTE
                </div>
              </div>
              <HoloSpreadsheet sheetsData={sheetsData} onDownload={downloadExcel} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}