"use client";

import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  UploadCloud,
  FileSpreadsheet,
  X,
  Zap,
  Download,
  AlertTriangle,
  CheckCircle2,
  Search,
  Loader2,
  RotateCcw,
} from "lucide-react";
import styles from "./Contestation.module.css";
import { KxHeader } from "@/components/kx";

// Proxy /api de Next.js (rewrites -> backend)
const BACKEND_URL = "/api/contestation/generate";

type SlotKey = "global" | "facture" | "ca";
type Filter = "ALL" | "ANOMALIE" | "VIDE" | "RAS" | "VR";

const SLOTS: {
  key: SlotKey;
  field: string;
  index: string;
  title: string;
  desc: string;
  required: boolean;
  tone: "orange" | "navy" | "salmon";
  columns: string[];
}[] = [
  {
    key: "global",
    field: "fichierGlobal",
    index: "01",
    title: "Global Bytel",
    desc: "Une ligne par passage. Vr = nombre de passages en attente validation partenaire.",
    required: true,
    tone: "orange",
    columns: [
      "idIntervention", "etat", "typeIntervention", "Commentaire Bytel", "A3_FIN_CMD", "KX",
      "C1_NOK_POSE", "C1_PHOTO", "sousCategorieControlePhoto", "période",
      "INSTALLATION", "MATERIEL", "MES", "SUPPORT", "LOGISTIQUE", "GOULOTTE", "TOTAL",
    ],
  },
  {
    key: "facture",
    field: "fichierFacture",
    index: "02",
    title: "Facture",
    desc: "Nos montants. Le bloc 3 prend le max entre Bytel et la facture, colonne par colonne.",
    required: true,
    tone: "navy",
    columns: ["idIntervention", "INST", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "GOULOTTE", "TOTAL", "Diff"],
  },
  {
    key: "ca",
    field: "fichierCa",
    index: "03",
    title: "Contrôle CA",
    desc: "Les dossiers en double sont fusionnés : on garde les valeurs renseignées.",
    required: false,
    tone: "salmon",
    columns: [
      "Type d'installation validé par la CA",
      "Typologie PBO-PTO validée par la CA",
      "Typologie PBO-PTO déclarée par le technicien",
      "Statut du RDV",
    ],
  },
];

// Indices des colonnes dans le fichier généré (ordre du modèle Contestation)
const C = {
  eps: 0, etat: 1, type: 2, vr: 3, anomalie: 4, commentaire: 5, periode: 20,
  totalBytel: 27, totalFacture: 34, diff: 35, tvc: 36, totalMax: 43, diffMax: 44,
  caType: 45, caTypoCa: 46, caTypoTech: 47, caRdv: 48,
};

type Stats = Record<string, number>;

const fmt = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  if (!isFinite(n)) return String(v ?? "");
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return isFinite(n) ? n : 0;
};

function parseStats(header: string | null): Stats {
  const out: Stats = {};
  (header || "").split(";").forEach((p) => {
    const [k, v] = p.split("=");
    if (k && v !== undefined) out[k.trim()] = Number(v);
  });
  return out;
}

export default function ContestationPage() {
  const [files, setFiles] = useState<Record<SlotKey, File | null>>({ global: null, facture: null, ca: null });
  const [dragOver, setDragOver] = useState<SlotKey | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const inputs = useRef<Record<SlotKey, HTMLInputElement | null>>({ global: null, facture: null, ca: null });

  const ready = !!files.global && !!files.facture;

  const setFile = (key: SlotKey, f: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: f }));
    setError(null);
  };

  const onDrop = (key: SlotKey, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(key, f);
  };

  const reset = () => {
    setFiles({ global: null, facture: null, ca: null });
    setBlob(null);
    setStats(null);
    setRows([]);
    setError(null);
    setFilter("ALL");
    setQuery("");
  };

  const generate = async () => {
    if (!ready || isProcessing) return;
    setIsProcessing(true);
    setError(null);

    const fd = new FormData();
    SLOTS.forEach((s) => {
      const f = files[s.key];
      if (f) fd.append(s.field, f);
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15 * 60 * 1000);
    try {
      const res = await fetch(BACKEND_URL, { method: "POST", body: fd, signal: controller.signal });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        let detail = txt;
        try {
          const j = JSON.parse(txt);
          if (j?.error) detail = String(j.error);
        } catch { /* texte brut */ }
        if (/^internal server error/i.test(detail.trim()) || !detail) {
          detail = "Le serveur backend ne répond pas. Réessayez dans un instant.";
        }
        throw new Error(detail);
      }

      const b = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const m = disp.match(/filename="?([^";]+)"?/);
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setFileName(m?.[1] || `Contestation_${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}.xlsx`);
      setStats(parseStats(res.headers.get("X-Contestation-Stats")));
      setBlob(b);

      // Chargé à la demande : xlsx pèse lourd et n'est utile qu'après la génération
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await b.arrayBuffer(), { type: "array", dense: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      setRows(data.slice(1));
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === "AbortError") setError("Le serveur a mis trop de temps à répondre.");
      else if (String(err?.message).includes("Failed to fetch")) setError("Serveur injoignable. Vérifiez que le backend tourne.");
      else setError(err?.message || "Échec de la génération.");
    } finally {
      clearTimeout(timeout);
      setIsProcessing(false);
    }
  };

  const download = () => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const counts = useMemo(() => {
    let anomalie = 0, vide = 0, ras = 0, vr = 0;
    for (const r of rows) {
      const a = String(r[C.anomalie] ?? "");
      if (a === "RAS") ras++;
      else if (!a) vide++;
      else anomalie++;
      if (String(r[C.vr]) !== "V0") vr++;
    }
    return { anomalie, vide, ras, vr };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return rows.filter((r) => {
      const a = String(r[C.anomalie] ?? "");
      if (filter === "RAS" && a !== "RAS") return false;
      if (filter === "VIDE" && a !== "") return false;
      if (filter === "ANOMALIE" && (a === "" || a === "RAS")) return false;
      if (filter === "VR" && String(r[C.vr]) === "V0") return false;
      if (q && !String(r[C.eps]).toUpperCase().includes(q) && !a.toUpperCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, query]);

  const shown = filtered.slice(0, 300);
  const loaded = SLOTS.filter((s) => files[s.key]).length;

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "ALL", label: "Tous", count: rows.length },
    { key: "ANOMALIE", label: "Anomalies", count: counts.anomalie },
    { key: "VIDE", label: "À compléter", count: counts.vide },
    { key: "RAS", label: "RAS", count: counts.ras },
    { key: "VR", label: "Vr ≥ V1", count: counts.vr },
  ];

  return (
    <main className={`kx-page ${styles.page}`}>
      <KxHeader
        icon={Scale}
        eyebrow="Facturation"
        title={<>Fichier de <em>contestation</em></>}
        subtitle="Croise le Global Bytel, la facture et le contrôle CA, puis génère le fichier Excel de contestation."
        actions={(loaded > 0 || blob) ? (
          <button type="button" className="kx-btn kx-btn-ghost" onClick={reset} disabled={isProcessing}>
            <RotateCcw size={15} /> Recommencer
          </button>
        ) : undefined}
      />

      {/* FILE SLOTS */}
      <section className={styles.slots} aria-label="Fichiers sources">
        {SLOTS.map((s) => {
          const f = files[s.key];
          return (
            <div
              key={s.key}
              className={`${styles.slot} ${styles[`tone_${s.tone}`]} ${f ? styles.slotFilled : ""} ${dragOver === s.key ? styles.slotDrag : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(s.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => onDrop(s.key, e)}
            >
              <div className={styles.slotTop}>
                <span className={styles.slotIndex}>{s.index}</span>
                <div className={styles.slotTitle}>
                  <h2>{s.title}</h2>
                  <span className={s.required ? styles.reqBadge : styles.optBadge}>
                    {s.required ? "Obligatoire" : "Optionnel"}
                  </span>
                </div>
              </div>
              <p className={styles.slotDesc}>{s.desc}</p>

              <div className={styles.chips}>
                {s.columns.map((c) => (
                  <span key={c} className={styles.chip}>{c}</span>
                ))}
              </div>

              <input
                ref={(el) => { inputs.current[s.key] = el; }}
                type="file"
                accept=".xlsx,.xls,.xlsm"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setFile(s.key, file);
                  e.target.value = "";
                }}
              />

              {f ? (
                <div className={styles.fileRow}>
                  <FileSpreadsheet size={18} />
                  <div className={styles.fileMeta}>
                    <span className={styles.fileName} title={f.name}>{f.name}</span>
                    <span className={styles.fileSize}>{(f.size / 1024 / 1024).toFixed(2)} Mo</span>
                  </div>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => setFile(s.key, null)}
                    aria-label={`Retirer le fichier ${s.title}`}
                    title="Retirer"
                    disabled={isProcessing}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.dropBtn}
                  onClick={() => inputs.current[s.key]?.click()}
                >
                  <UploadCloud size={20} />
                  <span>Déposer ou choisir le fichier</span>
                </button>
              )}
            </div>
          );
        })}
      </section>

      {/* ACTION BAR */}
      <section className={styles.actionBar}>
        <div className={styles.progress}>
          <span className={styles.progressLabel}>{loaded}/3 fichiers chargés</span>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(loaded / 3) * 100}%` }} />
          </div>
          {!files.ca && ready && (
            <span className={styles.hint}>Sans le fichier CA, les 4 dernières colonnes resteront vides.</span>
          )}
        </div>
        <button type="button" className={styles.primaryBtn} onClick={generate} disabled={!ready || isProcessing}>
          {isProcessing ? <Loader2 size={18} className={styles.spin} /> : <Zap size={18} />}
          {isProcessing ? "Génération en cours…" : "Générer la contestation"}
        </button>
      </section>

      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.error}
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AlertTriangle size={18} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESULTS */}
      {blob && stats && (
        <motion.section
          className={styles.results}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.resultsHead}>
            <div className={styles.doneTitle}>
              <CheckCircle2 size={20} />
              <div>
                <h2>{fileName}</h2>
                <p>{(stats.lignes ?? rows.length).toLocaleString("fr-FR")} EPS traités</p>
              </div>
            </div>
            <button type="button" className={styles.primaryBtn} onClick={download}>
              <Download size={18} /> Télécharger l&apos;Excel
            </button>
          </div>

          <div className={styles.kpis}>
            <Kpi label="EPS" value={stats.lignes ?? rows.length} />
            <Kpi label="RAS" value={stats.ras ?? counts.ras} tone="ok" />
            <Kpi label="Anomalies" value={stats.anomalies ?? counts.anomalie} tone="bad" />
            <Kpi label="À compléter" value={stats.aCompleter ?? counts.vide} tone="warn" hint="Diff < 0 sans motif détecté" />
            <Kpi label="Vr ≥ V1" value={stats.multiVersions ?? counts.vr} hint="Repassés en attente validation" />
            <Kpi label="Sans facture" value={stats.sansFacture ?? 0} hint="EPS absents du fichier facture" />
          </div>

          <div className={styles.toolbar}>
            <div className={styles.filters} role="tablist" aria-label="Filtrer les lignes">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.key}
                  className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ""}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span className={styles.filterCount}>{f.count.toLocaleString("fr-FR")}</span>
                </button>
              ))}
            </div>
            <label className={styles.search}>
              <Search size={15} />
              <span className={styles.srOnly}>Rechercher un EPS ou une anomalie</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="EPS-00… ou anomalie"
              />
            </label>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.groupRow}>
                  <th colSpan={4} className={styles.gBlue}>Intervention</th>
                  <th colSpan={2} className={styles.gRed}>Anomalie</th>
                  <th colSpan={1} className={styles.gYellow}>Bytel</th>
                  <th colSpan={2} className={styles.gNavy}>Facture</th>
                  <th colSpan={2} className={styles.gGreen}>Max retenu</th>
                  <th colSpan={3} className={styles.gSalmon}>Contrôle CA</th>
                </tr>
                <tr>
                  <th>idIntervention</th>
                  <th>Type</th>
                  <th>Période</th>
                  <th>Vr</th>
                  <th>Anomalie</th>
                  <th>Commentaire Bytel</th>
                  <th className={styles.numH}>Total</th>
                  <th className={styles.numH}>Total</th>
                  <th className={styles.numH}>Diff</th>
                  <th className={styles.numH}>Total</th>
                  <th className={styles.numH}>Diff</th>
                  <th>Type install. CA</th>
                  <th>Typo CA / Tech</th>
                  <th>Statut RDV</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const a = String(r[C.anomalie] ?? "");
                  const vr = String(r[C.vr] ?? "");
                  const d2 = num(r[C.diff]);
                  const d3 = num(r[C.diffMax]);
                  const typoCa = String(r[C.caTypoCa] ?? "");
                  const typoTech = String(r[C.caTypoTech] ?? "");
                  const typoMismatch = typoCa && typoTech && typoCa.toUpperCase() !== typoTech.toUpperCase();
                  return (
                    <tr key={`${r[C.eps]}-${i}`}>
                      <td className={styles.mono}>{String(r[C.eps])}</td>
                      <td>{String(r[C.type] ?? "")}</td>
                      <td className={styles.mono}>{String(r[C.periode] ?? "")}</td>
                      <td><span className={vr === "V0" ? styles.vr0 : styles.vrN}>{vr}</span></td>
                      <td>
                        {a === "RAS" ? (
                          <span className={styles.tagOk}>RAS</span>
                        ) : a ? (
                          <span className={styles.tagBad} title={a}>{a}</span>
                        ) : (
                          <span className={styles.tagWarn}>À compléter</span>
                        )}
                      </td>
                      <td className={styles.clip} title={String(r[C.commentaire] ?? "")}>{String(r[C.commentaire] ?? "")}</td>
                      <td className={styles.num}>{fmt(r[C.totalBytel])}</td>
                      <td className={styles.num}>{fmt(r[C.totalFacture])}</td>
                      <td className={`${styles.num} ${d2 < -0.005 ? styles.neg : styles.pos}`}>{fmt(r[C.diff])}</td>
                      <td className={styles.num}>{fmt(r[C.totalMax])}</td>
                      <td className={`${styles.num} ${d3 < -0.005 ? styles.neg : styles.pos}`}>{fmt(r[C.diffMax])}</td>
                      <td className={styles.clip} title={String(r[C.caType] ?? "")}>{String(r[C.caType] ?? "")}</td>
                      <td className={typoMismatch ? styles.mismatch : ""}>
                        {typoCa || typoTech ? `${typoCa || "—"} / ${typoTech || "—"}` : ""}
                      </td>
                      <td>{String(r[C.caRdv] ?? "")}</td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={14} className={styles.empty}>
                      Aucune ligne ne correspond à ce filtre.{" "}
                      <button type="button" className={styles.linkBtn} onClick={() => { setFilter("ALL"); setQuery(""); }}>
                        Afficher tout
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > shown.length && (
            <p className={styles.footNote}>
              Aperçu limité aux 300 premières lignes sur {filtered.length.toLocaleString("fr-FR")}. Le fichier Excel contient tout.
            </p>
          )}
        </motion.section>
      )}
    </main>
  );
}

function Kpi({ label, value, tone, hint }: { label: string; value: number; tone?: "ok" | "bad" | "warn"; hint?: string }) {
  return (
    <div className={`${styles.kpi} ${tone ? styles[`kpi_${tone}`] : ""}`} title={hint}>
      <span className={styles.kpiValue}>{(value ?? 0).toLocaleString("fr-FR")}</span>
      <span className={styles.kpiLabel}>{label}</span>
      {hint && <span className={styles.kpiHint}>{hint}</span>}
    </div>
  );
}
