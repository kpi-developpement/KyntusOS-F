"use client";

import { useEffect, useState } from "react";
import { FileDown, DownloadCloud, Loader2, ShieldCheck } from "lucide-react";
import LuxSelect from "@/components/ui/LuxSelect";
import { toast } from "@/components/ui/Toaster";
import { KxHeader, KxAlert } from "@/components/kx";
import styles from "./Export.module.css";

type Template = { id: number; name: string };

export default function ExportPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => toast({ message: "Impossible de charger les projets", type: "error" }));
  }, []);

  const handleExport = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/export/${selectedTemplate}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        const name = templates.find((t) => t.id.toString() === selectedTemplate)?.name || "Export";
        a.href = url;
        a.download = `Kyntus_Export_${name}_${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast({ message: "Export terminé, fichier téléchargé", type: "success" });
      } else {
        const t = await res.text();
        let msg = "Aucune tâche validée à exporter pour ce projet.";
        try { const j = JSON.parse(t); if (j?.message) msg = j.message; } catch { /* texte brut */ }
        toast({ message: msg, type: "error" });
      }
    } catch {
      toast({ message: "Serveur injoignable", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const options = templates.map((t) => ({ value: t.id.toString(), label: t.name }));

  return (
    <main className="kx-page" style={{ maxWidth: 760 }}>
      <KxHeader
        icon={FileDown}
        eyebrow="Données"
        title={<>Extraction <em>Excel</em></>}
        subtitle="Téléchargez toutes les tâches validées d'un projet dans un fichier Excel."
      />
      <section className={styles.card}>
        <label className={styles.field}>
          <span>Projet à exporter</span>
          <LuxSelect options={options} value={selectedTemplate} onChange={setSelectedTemplate} placeholder="Choisir un projet" />
        </label>
        <KxAlert tone="info" icon={<ShieldCheck size={18} />}>
          Seules les tâches au statut <b>Validé</b> sont incluses dans le fichier.
        </KxAlert>
        <button type="button" className="kx-btn kx-btn-lg" onClick={handleExport} disabled={!selectedTemplate || loading}>
          {loading ? <Loader2 size={18} className="kx-spin" /> : <DownloadCloud size={18} />}
          {loading ? "Génération du fichier…" : "Télécharger le fichier"}
        </button>
      </section>
    </main>
  );
}
