"use client";

import { useState, useEffect } from "react";
import { FileDown, Database, CheckCircle, AlertTriangle, DownloadCloud } from "lucide-react";
import styles from "./Export.module.css";
import LuxSelect from "@/components/ui/LuxSelect";
import InteractiveBackground from "@/components/ui/InteractiveBackground";
import { toast } from "@/components/ui/Toaster";

export default function ExportPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 1. Fetch Templates
  useEffect(() => {
    fetch("http://localhost:8080/api/templates")
      .then(res => res.json())
      .then(data => setTemplates(data || []))
      .catch(() => toast({ message: "Erreur chargement templates", type: "error" }));
  }, []);

  // 2. Logic d'Exportation
  const handleExport = async () => {
    if (!selectedTemplate) {
      toast({ message: "Veuillez sélectionner une source de données", type: "error" });
      return;
    }

    setLoading(true);
    toast({ message: "GÉNÉRATION DU FICHIER EN COURS...", type: "info" });

    try {
      // Appel Backend
      const res = await fetch(`http://localhost:8080/api/export/${selectedTemplate}`, {
        method: "GET",
      });

      if (res.ok) {
        // A. Convertir la réponse en Blob (Fichier)
        const blob = await res.blob();
        
        // B. Créer un URL temporaire pour ce blob
        const url = window.URL.createObjectURL(blob);
        
        // C. Créer un lien <a> invisible
        const a = document.createElement("a");
        a.href = url;
        
        // D. Générer le nom du fichier (avec date)
        const tmplName = templates.find(t => t.id.toString() === selectedTemplate)?.name || "Export";
        const date = new Date().toISOString().split('T')[0];
        a.download = `Kyntus_Export_${tmplName}_${date}.xlsx`;
        
        // E. Simuler le clic
        document.body.appendChild(a);
        a.click();
        
        // F. Nettoyage
        a.remove();
        window.URL.revokeObjectURL(url);

        toast({ message: "EXPORTATION TERMINÉE ✅", type: "success" });
      } else {
        // Si le backend renvoie une erreur (ex: pas de données)
        const errorText = await res.text(); // Probablement le message JSON
        try {
            const jsonError = JSON.parse(errorText);
            toast({ message: `ERREUR: ${jsonError.message || "Echec Export"}`, type: "error" });
        } catch {
            toast({ message: "AUCUNE DONNÉE VALIDÉE À EXPORTER", type: "error" });
        }
      }
    } catch (err) {
      console.error(err);
      toast({ message: "ERREUR CONNEXION SERVEUR", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const tmplOptions = templates.map(t => ({ value: t.id.toString(), label: t.name.toUpperCase() }));

  return (
    <div className={styles.container}>
      <InteractiveBackground />

      <div className={styles.exportCard}>
        {/* Décoration de fond */}
        <div className={styles.gridOverlay}></div>

        <div className={styles.header}>
          <h1 className={styles.title}>DATA EXTRACTION</h1>
          <span className={styles.subtitle}>// SECURE EXCEL GATEWAY</span>
        </div>

        {/* SELECTEUR */}
        <div className={styles.inputGroup}>
          <LuxSelect 
            label="SOURCE DE DONNÉES (TEMPLATE)" 
            options={tmplOptions} 
            value={selectedTemplate} 
            onChange={setSelectedTemplate}
            placeholder="SÉLECTIONNER UN FLUX..." 
          />
        </div>

        {/* INFO BOX */}
        <div className={styles.infoBox}>
          <Database size={18} color="#00f2ea" />
          <span>
            Seules les tâches avec le statut <strong style={{color:"#39ff14"}}>VALIDÉ</strong> seront incluses dans ce rapport.
          </span>
        </div>

        {/* BOUTON ACTION */}
        <button 
          className={styles.exportBtn} 
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? (
            <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                <span className="spin">⟳</span> GÉNÉRATION...
            </span>
          ) : (
            <span style={{display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                <DownloadCloud size={24} /> TÉLÉCHARGER LE FICHIER
            </span>
          )}
        </button>

      </div>
    </div>
  );
}