"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Calendar, Trash2, Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { KxHeader, KxDropzone, KxTable, KxCard, KxAlert } from "@/components/kx";
import styles from "./Ventilation.module.css";

const API_BASE = "";
const MONTHS = ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."];
type Sheets = Record<string, Record<string, unknown>[]>;

export default function VentilationPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [store, setStore] = useState<Record<string, Sheets>>({});
  const [fetched, setFetched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [tab, setTab] = useState("");
  const isFetching = useRef(false);

  const key = `${year}-${month}`;
  const data = store[key] || null;
  const sheetNames = data ? Object.keys(data) : [];
  const activeTab = sheetNames.includes(tab) ? tab : sheetNames[0] || "";

  useEffect(() => {
    if (store[key] || fetched[key] || isFetching.current) return;
    isFetching.current = true;
    fetch(`${API_BASE}/api/ventilation/data?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((json) => { if (json?.data && json.data !== "NO_DATA") setStore((p) => ({ ...p, [key]: json.data })); })
      .catch((e) => console.error("Fetch error:", e))
      .finally(() => { isFetching.current = false; setFetched((p) => ({ ...p, [key]: true })); });
  }, [year, month, key, store, fetched]);

  const upload = async (file: File) => {
    setIsProcessing(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("year", String(year));
    fd.append("month", String(month));
    try {
      const res = await fetch(`${API_BASE}/api/ventilation/import`, { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.data) setStore((p) => ({ ...p, [key]: json.data }));
      else setError("L'import a échoué. Vérifiez le fichier et réessayez.");
    } catch (e) {
      console.error(e);
      setError("Serveur injoignable. Réessayez dans un instant.");
    } finally {
      setIsProcessing(false);
    }
  };

  const purge = async () => {
    setConfirmPurge(false);
    try {
      await fetch(`${API_BASE}/api/ventilation/purge?year=${year}&month=${month}`, { method: "DELETE" });
      setStore((p) => { const n = { ...p }; delete n[key]; return n; });
    } catch (e) {
      console.error(e);
    }
  };

  const label = `${MONTHS[month - 1]} ${year}`;

  return (
    <main className="kx-page">
      <KxHeader
        icon={BarChart2}
        eyebrow="Finance"
        title={<>Ventilation <em>mensuelle</em></>}
        subtitle="Choisissez une période, importez le fichier du mois et parcourez chaque onglet."
        actions={data && (
          confirmPurge ? (
            <div className={styles.confirm}>
              <span>Supprimer les données de {label} ?</span>
              <button type="button" className="kx-btn kx-btn-danger" onClick={purge}><Trash2 size={15} /> Supprimer {label}</button>
              <button type="button" className="kx-btn kx-btn-ghost" onClick={() => setConfirmPurge(false)}>Annuler</button>
            </div>
          ) : (
            <button type="button" className="kx-btn kx-btn-ghost" onClick={() => setConfirmPurge(true)}><Trash2 size={15} /> Purger la période</button>
          )
        )}
      />

      {/* PÉRIODE */}
      <KxCard title="Période" icon={Calendar} actions={
        <div className={styles.years}>
          <button type="button" onClick={() => setYear(year - 1)} aria-label="Année précédente"><ChevronLeft size={16} /></button>
          <span>{year}</span>
          <button type="button" onClick={() => setYear(year + 1)} aria-label="Année suivante"><ChevronRight size={16} /></button>
        </div>
      }>
        <div className={styles.months} role="radiogroup" aria-label="Mois">
          {MONTHS.map((m, i) => {
            const k = `${year}-${i + 1}`;
            const active = month === i + 1;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                className={`${styles.month} ${active ? styles.monthActive : ""}`}
                onClick={() => setMonth(i + 1)}
              >
                {active && <motion.span layoutId="month-pill" className={styles.monthPill} transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span className={styles.monthLabel}>{m}</span>
                {store[k] && <span className={styles.monthDot} title="Données disponibles" />}
              </button>
            );
          })}
        </div>
      </KxCard>

      {error && <KxAlert tone="bad">{error}</KxAlert>}

      <AnimatePresence mode="wait">
        {!data ? (
          <motion.div key={`drop-${key}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <KxDropzone
              onFile={upload}
              busy={isProcessing}
              title={`Importer les données de ${label}`}
              hint="Fichiers acceptés : TCE, PPE, Contrôle Qualité · .xlsx, .xls, .csv"
              busyTitle="Import en cours…"
              busyHint={`Ventilation de ${label}`}
            />
          </motion.div>
        ) : (
          <motion.div key={`data-${key}`} className={styles.dataArea} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            <div className={styles.tabs} role="tablist" aria-label="Onglets du fichier">
              {sheetNames.map((s) => (
                <button key={s} type="button" role="tab" aria-selected={activeTab === s} className={`${styles.tab} ${activeTab === s ? styles.tabActive : ""}`} onClick={() => setTab(s)}>
                  {activeTab === s && <motion.span layoutId="tab-pill" className={styles.tabPill} transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <span className={styles.tabLabel}><Layers size={14} /> {s} <b>{data[s].length.toLocaleString("fr-FR")}</b></span>
                </button>
              ))}
            </div>
            {activeTab && data[activeTab] && (
              <KxTable
                key={activeTab}
                title={activeTab}
                icon={Layers}
                rows={data[activeTab]}
                columns={data[activeTab].length ? Object.keys(data[activeTab][0]) : []}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
