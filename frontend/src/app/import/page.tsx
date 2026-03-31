"use client";

import { useState, useEffect } from "react";
import ImportZone from "@/components/features/ImportZone";
import styles from "@/components/features/TemplatesPage.module.css"; // Nkhdmou b nefs style dyal templates
import Select from "@/components/ui/Select"; // Ila kan 3ndk, sinon nsta3mlo select 3adi

export default function ImportPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 1. Jib les Templates bach l'utilisateur ykhtar fin ylo7 l'Excel
  useEffect(() => {
    fetch("http://localhost:8080/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data || []))
      .catch((err) => console.error("Error fetching templates:", err));
  }, []);

  // 2. Fonction d'Upload
  const handleImport = async () => {
    if (!file) {
      setMessage({ text: "Veuillez sélectionner un fichier Excel.", type: "error" });
      return;
    }
    if (!selectedTemplate) {
      setMessage({ text: "Veuillez choisir un Protocol (Template).", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // --- HNA FIN KAN L'ERROR ---
      // L'URL s7i7a hiya: /api/import/{templateId}
      const res = await fetch(`http://localhost:8080/api/import/${selectedTemplate}`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const text = await res.text();
        setMessage({ text: "Import réussi ! " + text, type: "success" });
        setFile(null); // Reset file
      } else {
        const errorText = await res.text();
        setMessage({ text: "Erreur: " + errorText, type: "error" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: "Erreur de connexion au serveur (Failed to fetch).", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container} style={{ flexDirection: "column", alignItems: "center", paddingTop: "50px" }}>
      
      <div className={styles.builderPanel} style={{ width: "100%", maxWidth: "800px", height: "auto" }}>
        <div className={styles.builderHeader}>
          <h1 className={styles.title}>Data Injection</h1>
          <p className={styles.subtitle}>// UPLOAD EXCEL DATA TO WORKFLOW</p>
        </div>

        {/* STEP 1: SELECT TEMPLATE */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>1. SELECT TARGET PROTOCOL</label>
          <select 
            className={styles.neonInput}
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={{ background: "#000", color: "white" }}
          >
            <option value="">-- Choose a Template --</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (ID: {t.id})
              </option>
            ))}
          </select>
        </div>

        {/* STEP 2: UPLOAD FILE */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>2. UPLOAD SOURCE FILE (.xlsx)</label>
          <div style={{ marginTop: "10px" }}>
            <ImportZone 
              onFileSelect={(f) => setFile(f)} 
              isLoading={loading} 
            />
          </div>
          {file && (
            <p style={{ color: "#00f3ff", marginTop: "10px", fontSize: "0.9rem" }}>
              Selected: {file.name}
            </p>
          )}
        </div>

        {/* MESSAGE AREA */}
        {message && (
          <div style={{
            padding: "15px", 
            borderRadius: "8px", 
            marginTop: "20px",
            background: message.type === "success" ? "rgba(0, 255, 0, 0.1)" : "rgba(255, 0, 0, 0.1)",
            border: message.type === "success" ? "1px solid #00ff00" : "1px solid #ff0000",
            color: message.type === "success" ? "#00ff00" : "#ff0000"
          }}>
            {message.text}
          </div>
        )}

        {/* ACTION BUTTON */}
        <button 
          className={styles.saveBtn} 
          onClick={handleImport}
          disabled={loading}
          style={{ marginTop: "30px" }}
        >
          {loading ? "INJECTING DATA..." : "⚡ INJECT DATA"}
        </button>

      </div>
    </div>
  );
}