"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DatabaseZap, FileSpreadsheet, X, Zap, Loader2 } from "lucide-react";
import LuxSelect from "@/components/ui/LuxSelect";
import { KxHeader, KxDropzone, KxAlert } from "@/components/kx";
import styles from "./Import.module.css";

type Template = { id: number; name: string };

export default function ImportPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "bad" } | null>(null);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch((e) => console.error("Error fetching templates:", e));
  }, []);

  const handleImport = async () => {
    if (!selectedTemplate) return setMessage({ text: "Choisissez d'abord le projet cible.", type: "bad" });
    if (!file) return setMessage({ text: "Ajoutez le fichier Excel à importer.", type: "bad" });

    setLoading(true);
    setMessage(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/import/${selectedTemplate}`, { method: "POST", body: fd });
      const text = await res.text();
      if (res.ok) {
        setMessage({ text: `Import terminé : ${text}`, type: "ok" });
        setFile(null);
      } else {
        setMessage({ text: `L'import a échoué : ${text || res.status}`, type: "bad" });
      }
    } catch {
      setMessage({ text: "Serveur injoignable. Réessayez dans un instant.", type: "bad" });
    } finally {
      setLoading(false);
    }
  };

  const options = templates.map((t) => ({ value: t.id.toString(), label: t.name }));
  const ready = !!selectedTemplate && !!file;

  return (
    <main className="kx-page" style={{ maxWidth: 880 }}>
      <KxHeader
        icon={DatabaseZap}
        eyebrow="Données"
        title={<>Injection de <em>données</em></>}
        subtitle="Importez un fichier Excel dans un projet : chaque ligne devient une tâche prête à être dispatchée."
      />

      <section className={styles.card}>
        <div className={styles.step}>
          <span className={`${styles.num} ${selectedTemplate ? styles.numDone : ""}`}>1</span>
          <div className={styles.stepBody}>
            <h2>Projet cible</h2>
            <p>Les colonnes du fichier seront rattachées à ce projet.</p>
            <div className={styles.select}>
              <LuxSelect options={options} value={selectedTemplate} onChange={(v) => { setSelectedTemplate(v); setMessage(null); }} placeholder="Choisir un projet" />
            </div>
          </div>
        </div>

        <div className={styles.step}>
          <span className={`${styles.num} ${file ? styles.numDone : ""}`}>2</span>
          <div className={styles.stepBody}>
            <h2>Fichier Excel</h2>
            <p>Formats acceptés : .xlsx, .xls.</p>
            <AnimatePresence mode="wait" initial={false}>
              {file ? (
                <motion.div key="file" className={styles.file} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <span className={styles.fileIcon}><FileSpreadsheet size={20} /></span>
                  <span className={styles.fileMeta}><b>{file.name}</b><small>{(file.size / 1024 / 1024).toFixed(2)} Mo</small></span>
                  <button type="button" onClick={() => setFile(null)} aria-label="Retirer le fichier" disabled={loading}><X size={16} /></button>
                </motion.div>
              ) : (
                <motion.div key="drop" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <KxDropzone onFile={(f) => { setFile(f); setMessage(null); }} accept=".xlsx,.xls" title="Glissez le fichier ici" hint="ou cliquez pour parcourir" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {message && <KxAlert tone={message.type}>{message.text}</KxAlert>}

        <button type="button" className="kx-btn kx-btn-lg" onClick={handleImport} disabled={!ready || loading}>
          {loading ? <Loader2 size={18} className="kx-spin" /> : <Zap size={18} />}
          {loading ? "Import en cours…" : "Lancer l'import"}
        </button>
      </section>
    </main>
  );
}
