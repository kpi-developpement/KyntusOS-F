"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Zap,
  Settings,
  Database,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  Building2,
  TramFront,
  ArrowRight,
  X,
} from "lucide-react";
import QuantumDataGrid from "./ux/QuantumDataGrid";
import HoloSpreadsheet from "./components/HoloSpreadsheet";

type FactureType = "KYNTUS" | "TISSEO";
type FileKey = "vide" | "tvc" | "rep" | "diag" | "qa" | "intervention";

// URL RELATIVE : kat-douz mn l-proxy /api dyal Next.js (rewrites -> backend:8082).
// Qbel kanet "http://10.10.10.25:8082/..." m-7futa b l-yedd, w 7it l-navigateur
// (machi l-serveur) hwa li kan kay-7awel y-wsel l port 8082, kolla mra ikoun
// firewall wla l-user kay-dkhol b IP/nom-de-domaine akhor -> "Failed to fetch".
const BACKEND_URL = "/api/facture/generate";

const FILE_ITEMS: { key: FileKey; label: string; hint: string; required: boolean }[] = [
  { key: "vide", label: "A VIDE", hint: "nom contient « VIDE »", required: true },
  { key: "tvc", label: "TVC", hint: "nom contient « TVC »", required: true },
  { key: "rep", label: "RÉPÉTEUR", hint: "« REPETEUR » / « VALIDATION »", required: true },
  { key: "diag", label: "DIAG WIFI", hint: "nom contient « DIAG »", required: true },
  { key: "qa", label: "QA DONNÉES", hint: "« QUESTION » / « ANSWER »", required: true },
  { key: "intervention", label: "INTERVENTION", hint: "optionnel — « INTERVENTION » / « BOTE »", required: false },
];

// Grille Tisseo (affichage seulement — le calcul se fait côté backend)
const TISSEO_PREVIEW: { title: string; rows: [string, string][] }[] = [
  {
    title: "Installation",
    rows: [
      ["67 · 70 · 86 · 89 (+ zone)", "93.25"],
      ["108 · 111 (+ zone)", "187.61"],
      ["218 · 221 (+ zone)", "328.22"],
      ["273 · 276 (+ zone)", "477.61"],
      ["303 · 306 (+ zone)", "545.65"],
    ],
  },
  {
    title: "MES",
    rows: [
      ["5 → 7", "10 → 12"],
      ["20 → 25.3", "21 → 31.63"],
      ["24 → 37.95", "30 → 47.3"],
      ["31 → 53.63", "34 → 59.95"],
    ],
  },
  {
    title: "Matériel",
    rows: [
      ["1.46 → 2.34", "11.03 → 17.29"],
      ["31.28 · 28.62 → 57.66", "41.22 → 63.24"],
    ],
  },
  { title: "Logistique", rows: [["13 → 14", "26 → 28"]] },
];

const FACTURE_TYPES: { id: FactureType; name: string; desc: string; icon: React.ReactNode }[] = [
  { id: "KYNTUS", name: "Facture KYNTUS", desc: "Grille standard Kyntus (coef zone VIP inclus)", icon: <Building2 size={22} /> },
  { id: "TISSEO", name: "Facture TISSEO", desc: "Même traitement, prix finaux remplacés par la grille Tisseo", icon: <TramFront size={22} /> },
];

export default function FacturePage() {
  const [factureType, setFactureType] = useState<FactureType>("KYNTUS");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("CALCUL EN COURS...");
  const [sheetsData, setSheetsData] = useState<Record<string, any[]> | null>(null);
  const [finalExcelBlob, setFinalExcelBlob] = useState<Blob | null>(null);
  const [generatedType, setGeneratedType] = useState<FactureType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [filesMap, setFilesMap] = useState<Record<FileKey, File | null>>({
    vide: null,
    tvc: null,
    rep: null,
    diag: null,
    qa: null,
    intervention: null,
  });

  const [devisMap, setDevisMap] = useState<Record<string, number>>({});
  const [epsInput, setEpsInput] = useState("");
  const [valInput, setValInput] = useState("");

  // ------------------------------------------------------------------
  // FILES (click or drag & drop) — auto-detection by file name
  // ------------------------------------------------------------------
  const ingestFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setErrorMessage(null);
    setFilesMap((prev) => {
      const next = { ...prev };
      list.forEach((file) => {
        const name = file.name.toUpperCase();
        if (name.includes("VIDE")) next.vide = file;
        else if (name.includes("TVC")) next.tvc = file;
        else if (name.includes("REPETEUR") || name.includes("VALIDATION")) next.rep = file;
        else if (name.includes("DIAG")) next.diag = file;
        else if (name.includes("QUESTION") || name.includes("ANSWER")) next.qa = file;
        else if (name.includes("INTERVENTION") || name.includes("BOTE")) next.intervention = file;
      });
      return next;
    });
  };

  const removeFile = (key: FileKey) => setFilesMap((prev) => ({ ...prev, [key]: null }));

  // ------------------------------------------------------------------
  // DEVIS OVERRIDE
  // ------------------------------------------------------------------
  const handleAddDevis = () => {
    if (!epsInput.trim() || !valInput.trim()) return;
    const value = parseFloat(valInput.replace(",", "."));
    if (isNaN(value)) return;
    setDevisMap((prev) => ({ ...prev, [epsInput.trim().toUpperCase()]: value }));
    setEpsInput("");
    setValInput("");
  };

  const handleRemoveDevis = (eps: string) => {
    setDevisMap((prev) => {
      const copy = { ...prev };
      delete copy[eps];
      return copy;
    });
  };

  // ------------------------------------------------------------------
  // GENERATE
  // ------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!filesMap.vide || !filesMap.tvc || !filesMap.rep || !filesMap.diag || !filesMap.qa) {
      setErrorMessage("Fichiers obligatoires manquants (A VIDE, TVC, Répéteur, Diag Wifi, QA).");
      return;
    }

    setIsProcessing(true);
    setStatusText(`CALCUL ${factureType} EN COURS...`);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("fichierAVide", filesMap.vide);
    formData.append("fichierTVC", filesMap.tvc);
    formData.append("fichierRepeteur", filesMap.rep);
    formData.append("fichierDiagWifi", filesMap.diag);
    formData.append("fichierQA", filesMap.qa);
    if (filesMap.intervention) formData.append("fichierIntervention", filesMap.intervention);
    if (Object.keys(devisMap).length > 0) formData.append("devisData", JSON.stringify(devisMap));
    formData.append("typeFacture", factureType);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15 * 60 * 1000); // 15 min, kif proxyTimeout

    try {
      const response = await fetch(BACKEND_URL, { method: "POST", body: formData, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        // L-backend daba kay-rje3 JSON {"error": "..."} ; l'proxy dyal Next.js
        // kay-rje3 "Internal Server Error" b7al texte brut mnin l-backend m-7eyyed.
        let detail = errorText;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed?.error) detail = String(parsed.error);
        } catch { /* machi JSON */ }
        if (/^internal server error/i.test(detail.trim())) {
          detail = "Le serveur backend ne répond pas (redémarrage ou saturation mémoire). Réessayez dans un instant.";
        }
        throw new Error(`[ERREUR SERVEUR ${response.status}] ${detail || "Anomalie inconnue."}`);
      }

      const blob = await response.blob();
      setFinalExcelBlob(blob);
      setGeneratedType(factureType);

      setStatusText("LECTURE DE LA MATRICE (25K+ LIGNES)...");
      await new Promise((r) => setTimeout(r, 30));

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array", dense: true, cellFormula: false, cellHTML: false });

      const parsedSheets: Record<string, any[]> = {};
      for (const sheetName of workbook.SheetNames) {
        await new Promise((r) => setTimeout(r, 10));
        parsedSheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
      }
      setSheetsData(parsedSheets);
    } catch (err: any) {
      console.error(err);
      if (err.name === "AbortError") {
        setErrorMessage("TIMEOUT : le serveur a mis trop de temps à répondre.");
      } else if (String(err.message).includes("Failed to fetch")) {
        setErrorMessage("ERREUR RÉSEAU : le serveur est injoignable. Vérifiez que les conteneurs kyntus-frontend et kyntus-backend tournent.");
      } else {
        setErrorMessage(err.message || "Erreur de connexion au serveur backend.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    if (!finalExcelBlob) return;
    const url = window.URL.createObjectURL(finalExcelBlob);
    const a = document.createElement("a");
    const prefix = generatedType === "TISSEO" ? "Facture_Tisseo" : "Facture_Kyntus";
    a.href = url;
    a.download = `${prefix}_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const loadedCount = FILE_ITEMS.filter((it) => !!filesMap[it.key]).length;
  const requiredOk = FILE_ITEMS.filter((it) => it.required).every((it) => !!filesMap[it.key]);
  const progressPct = Math.round((loadedCount / FILE_ITEMS.length) * 100);

  return (
    <main className="fx-root">
      <style>{`
        .fx-root {
          --b-900:#1e3a8a; --b-800:#1e40af; --b-700:#1d4ed8; --b-600:#2563eb; --b-500:#3b82f6; --b-400:#60a5fa;
          --b-300:#93c5fd; --b-200:#bfdbfe; --b-100:#dbeafe; --b-50:#eff6ff;
          --ink:#0f2557; --ink-2:#334a75; --muted:#6b7c9e; --line:#e4eaf4; --line-2:#d0dbec; --surface:#f8fafe;
          --ok:#059669; --ok-bg:#ecfdf5; --warn:#dc2626; --warn-bg:#fef2f2;
          --ease:cubic-bezier(.22,1,.36,1);
          padding: 2.25rem 2rem 4rem; min-height: 100vh; position: relative; color: var(--ink);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .fx-root *, .fx-root *::before, .fx-root *::after { box-sizing: border-box; }
        .fx-wrap { max-width: 1420px; margin: 0 auto; position: relative; z-index: 10; display: flex; flex-direction: column; gap: 1.4rem; }

        /* HERO */
        .fx-hero { position: relative; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 1.5rem;
          padding: 1.4rem 1.6rem; border-radius: 26px; background: rgba(255,255,255,.88); backdrop-filter: blur(20px);
          box-shadow: 0 0 0 1px var(--line), 0 30px 60px -32px rgba(29,78,216,.45), inset 0 1px 0 #fff; overflow: hidden; }
        .fx-hero::before { content:""; position:absolute; left:24px; right:24px; top:0; height:3px; border-radius:0 0 6px 6px;
          background: linear-gradient(90deg, var(--b-300), var(--b-700) 45%, var(--b-400) 70%, var(--b-200)); background-size:200% 100%;
          animation: fxStripe 6s linear infinite; }
        .fx-logo { width: 58px; height: 58px; border-radius: 18px; display: grid; place-items: center; color: #fff;
          background: linear-gradient(140deg, var(--b-500), var(--b-800)); box-shadow: 0 16px 30px -12px rgba(29,78,216,.75); }
        .fx-kicker { display:inline-block; font-size:.64rem; font-weight:800; letter-spacing:1.4px; text-transform:uppercase; color: var(--b-600); }
        .fx-title { margin: 2px 0 0; font-size: 2.1rem; font-weight: 900; letter-spacing: -.03em; color: var(--ink); line-height: 1.05; }
        .fx-title span { background: linear-gradient(90deg, var(--b-600), var(--b-800)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .fx-hero-stats { display:flex; gap:.6rem; flex-wrap:wrap; justify-content:flex-end; }
        .fx-stat { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:14px; background:#fff; border:1px solid var(--line); min-width: 150px; }
        .fx-stat-icon { width:34px; height:34px; border-radius:10px; display:grid; place-items:center; background: var(--b-50); color: var(--b-700); flex-shrink:0; }
        .fx-stat small { display:block; font-size:.62rem; font-weight:800; color: var(--muted); text-transform:uppercase; letter-spacing:.6px; }
        .fx-stat b { font-size:.95rem; font-weight:900; color: var(--ink); }
        .fx-stat-active { background: var(--b-50); border-color: var(--b-200); }
        .fx-stat-active b { color: var(--b-700); }

        /* TYPE SELECTOR */
        .fx-types { display:grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .fx-type { position:relative; display:flex; align-items:center; gap:14px; padding: 1.1rem 1.25rem; border-radius: 20px; cursor:pointer;
          background:#fff; border: 1.5px solid var(--line); text-align:left; font-family: inherit; overflow:hidden;
          transition: transform .25s var(--ease), border-color .2s, box-shadow .25s; }
        .fx-type:hover { transform: translateY(-2px); border-color: var(--b-300); box-shadow: 0 16px 32px -20px rgba(29,78,216,.6); }
        .fx-type-active { border-color: var(--b-600); background: linear-gradient(120deg, var(--b-50), #fff 70%);
          box-shadow: 0 0 0 4px rgba(37,99,235,.12), 0 18px 36px -22px rgba(29,78,216,.7); }
        .fx-type-icon { width:48px; height:48px; border-radius:15px; display:grid; place-items:center; background: var(--b-50); color: var(--b-700); flex-shrink:0; transition: all .25s; }
        .fx-type-active .fx-type-icon { background: linear-gradient(140deg, var(--b-500), var(--b-800)); color:#fff; box-shadow: 0 10px 22px -10px rgba(29,78,216,.8); }
        .fx-type-name { font-size: 1.02rem; font-weight: 900; color: var(--ink); }
        .fx-type-desc { font-size: .78rem; font-weight: 500; color: var(--muted); margin-top: 2px; }
        .fx-radio { margin-left:auto; width:22px; height:22px; border-radius:50%; border:2px solid var(--b-300); display:grid; place-items:center; flex-shrink:0; }
        .fx-type-active .fx-radio { border-color: var(--b-700); }
        .fx-radio i { width:10px; height:10px; border-radius:50%; background: var(--b-700); }

        .fx-grid-preview { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:.75rem; padding: 1rem; border-radius: 18px;
          background:#fff; border:1px dashed var(--b-300); }
        .fx-grid-block h4 { margin:0 0 6px; font-size:.66rem; font-weight:900; letter-spacing:.8px; text-transform:uppercase; color: var(--b-700); }
        .fx-grid-row { display:flex; justify-content:space-between; gap:8px; padding:4px 8px; border-radius:7px; font-size:.72rem; font-weight:600; color: var(--ink-2); }
        .fx-grid-row:nth-child(odd) { background: var(--surface); }
        .fx-grid-row b { color: var(--b-800); font-family: 'JetBrains Mono', ui-monospace, monospace; font-size:.7rem; white-space:nowrap; }

        /* CARDS */
        .fx-cols { display:grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 1.4rem; }
        .fx-card { background: rgba(255,255,255,.92); backdrop-filter: blur(18px); border-radius: 24px; padding: 1.5rem;
          box-shadow: 0 0 0 1px var(--line), 0 24px 50px -30px rgba(29,78,216,.35); display:flex; flex-direction:column; }
        .fx-card-head { display:flex; justify-content:space-between; align-items:center; gap:10px; padding-bottom: 14px; margin-bottom: 16px; border-bottom:1px solid var(--line); }
        .fx-card-title { display:flex; align-items:center; gap:10px; margin:0; font-size:1rem; font-weight:900; color: var(--ink); }
        .fx-card-title i { width:36px; height:36px; border-radius:11px; display:grid; place-items:center; background: var(--b-50); color: var(--b-700); font-style: normal; }
        .fx-chip { padding: 4px 10px; border-radius: 99px; font-size:.72rem; font-weight:800; background: var(--b-50); color: var(--b-700); border:1px solid var(--b-100); }

        .fx-drop { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:6px; padding: 1.8rem 1.2rem;
          border: 2px dashed var(--b-300); border-radius: 18px; cursor:pointer; margin-bottom: 1rem;
          background: linear-gradient(180deg, var(--b-50), #fff); transition: all .2s var(--ease); }
        .fx-drop:hover, .fx-drop-active { border-color: var(--b-600); background: linear-gradient(180deg, var(--b-100), #fff); transform: translateY(-2px); }
        .fx-drop-icon { width:58px; height:58px; border-radius:18px; display:grid; place-items:center; color:#fff; margin-bottom:6px;
          background: linear-gradient(140deg, var(--b-500), var(--b-800)); box-shadow: 0 12px 26px -10px rgba(29,78,216,.75); }
        .fx-drop strong { font-size:.95rem; font-weight:900; color: var(--ink); }
        .fx-drop span { font-size:.78rem; color: var(--muted); font-weight:500; }

        .fx-progress { height:6px; border-radius:99px; background: var(--b-50); overflow:hidden; margin-bottom: 1rem; }
        .fx-progress div { height:100%; border-radius:99px; background: linear-gradient(90deg, var(--b-400), var(--b-700)); transition: width .4s var(--ease); }

        .fx-files { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
        .fx-file { display:flex; align-items:center; gap:10px; padding: 10px 12px; border-radius: 14px; background: var(--surface); border:1px solid var(--line); min-width:0; transition: all .2s; }
        .fx-file-ok { background: var(--b-50); border-color: var(--b-300); }
        .fx-file-meta { min-width:0; flex:1; }
        .fx-file-label { font-size:.78rem; font-weight:900; color: var(--ink); }
        .fx-file-label em { color: var(--b-600); font-style: normal; }
        .fx-file-name { font-size:.68rem; font-weight:600; color: var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .fx-file-ok .fx-file-name { color: var(--b-700); }
        .fx-file-x { width:24px; height:24px; border-radius:7px; border:none; background: transparent; color: var(--muted); display:grid; place-items:center; cursor:pointer; flex-shrink:0; }
        .fx-file-x:hover { background: var(--warn-bg); color: var(--warn); }

        .fx-devis-form { display:flex; gap:8px; margin-bottom: 14px; }
        .fx-input { height: 46px; padding: 0 14px; border-radius: 13px; border:1px solid var(--line-2); background: var(--surface); color: var(--ink);
          font-family: inherit; font-size:.88rem; font-weight:600; outline:none; transition: all .2s; min-width: 0; }
        .fx-input:focus { background:#fff; border-color: var(--b-600); box-shadow: 0 0 0 4px rgba(37,99,235,.13); }
        .fx-add { width:46px; height:46px; border-radius:13px; border:none; display:grid; place-items:center; cursor:pointer; color:#fff; flex-shrink:0;
          background: linear-gradient(140deg, var(--b-500), var(--b-800)); box-shadow: 0 10px 22px -10px rgba(29,78,216,.8); }
        .fx-devis-list { flex:1; min-height: 190px; max-height: 280px; overflow-y:auto; padding: 10px; border-radius: 16px; background: var(--surface); border:1px solid var(--line); }
        .fx-devis-empty { height:100%; min-height: 160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; color: var(--muted); text-align:center; }
        .fx-devis-empty b { font-size:.85rem; color: var(--ink-2); }
        .fx-devis-empty span { font-size:.74rem; }
        .fx-devis-item { display:flex; justify-content:space-between; align-items:center; gap:10px; padding: 10px 12px; border-radius: 12px; background:#fff; border:1px solid var(--b-100); margin-bottom:8px; }
        .fx-devis-eps { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight:800; font-size:.86rem; color: var(--b-800); }
        .fx-devis-val { padding: 4px 10px; border-radius: 8px; background: var(--b-50); color: var(--b-800); font-weight:900; font-size:.82rem; }
        .fx-devis-del { width:28px; height:28px; border-radius:8px; border:none; background:transparent; color: var(--warn); display:grid; place-items:center; cursor:pointer; }
        .fx-devis-del:hover { background: var(--warn-bg); }

        /* ERROR */
        .fx-error { display:flex; align-items:center; gap:12px; padding: 1rem 1.25rem; border-radius: 16px; background: var(--warn-bg);
          border:1px solid #fecaca; border-left: 5px solid var(--warn); color:#991b1b; font-size:.88rem; font-weight:600; }
        .fx-error button { margin-left:auto; border:none; background:transparent; color:#991b1b; cursor:pointer; display:grid; place-items:center; }

        /* GENERATE */
        .fx-generate { position:relative; width:100%; padding: 1.25rem; border:none; border-radius: 20px; cursor:pointer; overflow:hidden;
          display:flex; align-items:center; justify-content:center; gap:14px; font-family:inherit; font-size: 1.08rem; font-weight: 900; letter-spacing:.06em; color:#fff;
          background: linear-gradient(110deg, var(--b-600), var(--b-800) 50%, var(--b-600)); background-size: 200% 100%;
          box-shadow: 0 22px 40px -20px rgba(29,78,216,.9); transition: background-position .6s var(--ease), transform .2s; }
        .fx-generate:hover:not(:disabled) { background-position: 100% 0; }
        .fx-generate:disabled { cursor:not-allowed; color: var(--ink-2); background: var(--b-100); box-shadow:none; }
        .fx-generate small { font-size:.7rem; font-weight:800; padding: 4px 10px; border-radius:99px; background: rgba(255,255,255,.18); letter-spacing:.08em; }
        .fx-generate:disabled small { background: rgba(29,78,216,.1); }

        .fx-success { display:flex; justify-content:center; }
        .fx-success div { display:flex; align-items:center; gap:10px; padding: 10px 22px; border-radius:99px; background:#fff; border:1px solid var(--b-200);
          color: var(--b-700); font-weight:800; font-size:.84rem; box-shadow: 0 14px 28px -18px rgba(29,78,216,.7); }

        @keyframes fxStripe { from { background-position: 0 0; } to { background-position: 200% 0; } }

        @media (max-width: 1100px) {
          .fx-hero { grid-template-columns: auto 1fr; }
          .fx-hero-stats { grid-column: 1 / -1; justify-content:flex-start; }
          .fx-grid-preview { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 720px) {
          .fx-root { padding: 1.25rem .9rem 3rem; }
          .fx-types, .fx-files { grid-template-columns: 1fr; }
          .fx-cols { grid-template-columns: 1fr; }
          .fx-grid-preview { grid-template-columns: 1fr; }
          .fx-title { font-size: 1.6rem; }
        }
      `}</style>

      <QuantumDataGrid />

      <div className="fx-wrap">
        {/* HERO */}
        <motion.header className="fx-hero" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="fx-logo">
            <Cpu size={28} />
          </div>
          <div>
            <span className="fx-kicker">Kyntus Quantum Suite · Facturation</span>
            <h1 className="fx-title">
              NEXUS <span>ENGINE</span>
            </h1>
          </div>
          <div className="fx-hero-stats">
            <div className="fx-stat">
              <span className="fx-stat-icon">
                <FileSpreadsheet size={17} />
              </span>
              <div>
                <small>Fichiers chargés</small>
                <b>{loadedCount} / 6</b>
              </div>
            </div>
            <div className="fx-stat fx-stat-active">
              <span className="fx-stat-icon">{factureType === "TISSEO" ? <TramFront size={17} /> : <Building2 size={17} />}</span>
              <div>
                <small>Grille active</small>
                <b>{factureType}</b>
              </div>
            </div>
            <div className="fx-stat">
              <span className="fx-stat-icon">
                <ShieldCheck size={17} />
              </span>
              <div>
                <small>Backend</small>
                <b>Port 8082</b>
              </div>
            </div>
          </div>
        </motion.header>

        {/* TYPE SELECTOR */}
        <motion.div className="fx-types" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          {FACTURE_TYPES.map((t) => {
            const active = factureType === t.id;
            return (
              <button key={t.id} type="button" className={`fx-type ${active ? "fx-type-active" : ""}`} onClick={() => setFactureType(t.id)}>
                <span className="fx-type-icon">{t.icon}</span>
                <span>
                  <div className="fx-type-name">{t.name}</div>
                  <div className="fx-type-desc">{t.desc}</div>
                </span>
                <span className="fx-radio">{active && <i />}</span>
              </button>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {factureType === "TISSEO" && (
            <motion.div
              className="fx-grid-preview"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: "hidden" }}
            >
              {TISSEO_PREVIEW.map((block) => (
                <div key={block.title} className="fx-grid-block">
                  <h4>{block.title}</h4>
                  {block.rows.map(([a, b], i) => (
                    <div key={i} className="fx-grid-row">
                      {block.title === "Installation" ? (
                        <>
                          <span>{a}</span>
                          <b>{b}</b>
                        </>
                      ) : (
                        <>
                          <b>{a}</b>
                          <b>{b}</b>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ERROR */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div className="fx-error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <AlertTriangle size={22} color="#dc2626" />
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage(null)} title="Fermer">
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fx-cols">
          {/* FILES */}
          <motion.div className="fx-card" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="fx-card-head">
              <h2 className="fx-card-title">
                <i>
                  <Database size={18} />
                </i>
                Alimentation des données
              </h2>
              <span className="fx-chip">Auto-détection</span>
            </div>

            <label
              className={`fx-drop ${isDragging ? "fx-drop-active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                ingestFiles(e.dataTransfer.files);
              }}
            >
              <div className="fx-drop-icon">
                <UploadCloud size={28} />
              </div>
              <strong>Glissez vos fichiers ici ou cliquez</strong>
              <span>.xlsx / .csv — les 6 rapports en une seule fois</span>
              <input
                type="file"
                multiple
                accept=".xlsx,.csv"
                onChange={(e) => {
                  if (e.target.files) ingestFiles(e.target.files);
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
            </label>

            <div className="fx-progress">
              <div style={{ width: `${progressPct}%` }} />
            </div>

            <div className="fx-files">
              {FILE_ITEMS.map((item) => {
                const f = filesMap[item.key];
                return (
                  <div key={item.key} className={`fx-file ${f ? "fx-file-ok" : ""}`}>
                    {f ? <CheckCircle2 size={18} color="#1d4ed8" /> : <Circle size={18} color="#93c5fd" />}
                    <div className="fx-file-meta">
                      <div className="fx-file-label">
                        {item.label} {item.required && <em>*</em>}
                      </div>
                      <div className="fx-file-name" title={f?.name || item.hint}>
                        {f ? f.name : item.hint}
                      </div>
                    </div>
                    {f && (
                      <button type="button" className="fx-file-x" onClick={() => removeFile(item.key)} title="Retirer">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* DEVIS */}
          <motion.div className="fx-card" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
            <div className="fx-card-head">
              <h2 className="fx-card-title">
                <i>
                  <Settings size={18} />
                </i>
                Override manuel (support devis)
              </h2>
              <span className="fx-chip">{Object.keys(devisMap).length} actif(s)</span>
            </div>

            <div className="fx-devis-form">
              <input
                type="text"
                placeholder="Code EPS (ex : EPS-4920)"
                value={epsInput}
                onChange={(e) => setEpsInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDevis()}
                className="fx-input"
                style={{ flex: 2, textTransform: "uppercase" }}
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Montant (€)"
                value={valInput}
                onChange={(e) => setValInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDevis()}
                className="fx-input"
                style={{ flex: 1 }}
              />
              <motion.button type="button" className="fx-add" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleAddDevis}>
                <Plus size={20} />
              </motion.button>
            </div>

            <div className="fx-devis-list">
              {Object.keys(devisMap).length === 0 ? (
                <div className="fx-devis-empty">
                  <Sparkles size={24} color="#93c5fd" />
                  <b>Aucun override devis</b>
                  <span>Ajoutez un code EPS et son montant en euros</span>
                </div>
              ) : (
                Object.entries(devisMap).map(([eps, val]) => (
                  <motion.div key={eps} className="fx-devis-item" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <span className="fx-devis-eps">{eps}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="fx-devis-val">{val} €</span>
                      <button type="button" className="fx-devis-del" onClick={() => handleRemoveDevis(eps)} title="Supprimer">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* GENERATE */}
        <motion.button
          type="button"
          className="fx-generate"
          onClick={handleGenerate}
          disabled={isProcessing}
          whileTap={!isProcessing ? { scale: 0.99 } : {}}
        >
          {isProcessing ? (
            <>
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} style={{ display: "flex" }}>
                <Zap size={22} />
              </motion.span>
              {statusText}
            </>
          ) : (
            <>
              <Zap size={22} />
              GÉNÉRER LA FACTURE
              <small>{factureType}</small>
              <ArrowRight size={20} />
            </>
          )}
        </motion.button>
        {!requiredOk && !isProcessing && (
          <div style={{ textAlign: "center", marginTop: "-0.6rem", fontSize: "0.76rem", fontWeight: 600, color: "#6b7c9e" }}>
            Les 5 fichiers marqués * sont obligatoires.
          </div>
        )}

        {/* RESULT */}
        <AnimatePresence>
          {sheetsData && (
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="fx-success">
                <div>
                  <CheckCircle2 size={18} /> Facture {generatedType} générée avec succès
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