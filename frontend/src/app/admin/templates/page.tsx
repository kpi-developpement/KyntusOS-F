"use client";

import React, { useState, useEffect } from "react";
import styles from "./TemplatesPage.module.css";
import {
  Plus,
  Layers,
  Cpu,
  Trash2,
  Gauge,
  Lock,
  Sparkles,
  FolderKanban,
  PenLine,
  Server,
  Loader2,
  ShieldAlert,
  CheckCircle2,
  Database
} from "lucide-react";
import { toast } from "@/components/ui/Toaster";

export default function TemplatesPage() {
  const [name, setName] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [currentCol, setCurrentCol] = useState("");
  const [complexity, setComplexity] = useState(1);

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = () => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Erreur templates:", err));
  };

  const addColumn = () => {
    if (!currentCol.trim()) return;
    const formatted = currentCol.trim().toUpperCase();
    if (!columns.includes(formatted)) {
      setColumns([...columns, formatted]);
    }
    setCurrentCol("");
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ message: "LE NOM DU PROTOCOLE EST REQUIS", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        complexity: complexity,
        fields: columns.map((c) => ({
          name: c,
          type: "TEXT",
          required: false,
        })),
      };

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchTemplates();
        setName("");
        setColumns([]);
        setComplexity(1);
        toast({
          message: "PROTOCOLE INITIALISÉ AVEC SUCCÈS",
          type: "success",
        });
      } else {
        throw new Error("Erreur serveur");
      }
    } catch (e) {
      toast({ message: "ERREUR DE CRÉATION DU PROTOCOLE", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // SUPPRESSION D'UN TEMPLATE (AVEC CONFIRMATION ET LOADER)
  const handleDeleteTemplate = async (tplId: number, tplName: string) => {
    if (
      !window.confirm(
        `ATTENTION : Voulez-vous vraiment supprimer le protocole "${tplName}" ainsi que TOUTES les tâches associées ? Cette action est irréversible.`
      )
    ) {
      return;
    }

    setDeletingId(tplId);
    try {
      const res = await fetch(`/api/templates/${tplId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== tplId));
        toast({
          message: `PROTOCOLE "${tplName}" SUPPRIMÉ AVEC SUCCÈS`,
          type: "success",
        });
      } else {
        toast({
          message: "Impossible de supprimer ce protocole. Vérifiez les dépendances.",
          type: "error",
        });
      }
    } catch (e) {
      toast({ message: "ERREUR LORS DE LA SUPPRESSION", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.ambientOrb1} />
      <div className={styles.ambientOrb2} />

      <div className={styles.workspaceGrid}>
        {/* LEFT PANEL: BUILDER STUDIO */}
        <div className={styles.builderPanel}>
          <div className={styles.contentRelatif}>
            <div className={styles.builderHeader}>
              <div className={styles.headerIconBox}>
                <FolderKanban size={26} />
              </div>
              <div>
                <h1 className={styles.title}>ARCHITECTE SYSTÈME</h1>
                <span className={styles.subtitle}>
                  // DÉFINITION DES PROTOCOLES & COLONNES D&apos;ANALYSE PILOTE
                </span>
              </div>
            </div>

            {/* 1. Nom du Protocole */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <Database size={15} /> 1. NOM DU PROTOCOLE (PROJET / MISSION)
              </label>
              <input
                type="text"
                className={styles.neonInput}
                placeholder="Ex: FIBRE_OUJDA_PHASE_1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 2. Complexity (Locked Luxe Display) */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <Gauge size={15} /> 2. NIVEAU DE COMPLEXITÉ (AI CORE)
                <span className={styles.offlineTag}>STANDARD LEVEL 1</span>
              </label>

              <div className={styles.lockedAiBox}>
                <div className={styles.lockedOverlayText}>
                  <Lock size={15} color="#0284c7" />
                  <span>CALIBRATION AUTOMATIQUE ACTIVÉE</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={1}
                  disabled
                  style={{ flex: 1, opacity: 0.35 }}
                />
                <span className={styles.complexityValue}>01</span>
              </div>
            </div>

            {/* 3. Colonnes d'Analyse Pilote */}
            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <Layers size={15} /> 3. COLONNES D&apos;ANALYSE AJOUTÉES (MODIFIABLES PAR LE PILOTE)
              </label>

              {columns.length > 0 && (
                <div className={styles.fieldsContainer}>
                  {columns.map((col, idx) => (
                    <div key={idx} className={styles.fieldModule}>
                      <span className={styles.fieldText}>
                        <PenLine size={13} /> {col}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeColumn(idx)}
                        className={styles.removeBtn}
                        title="Retirer cette colonne"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.addZone}>
                <input
                  type="text"
                  className={styles.neonInput}
                  placeholder="Nom de la colonne (ex: COMMENTAIRE_PILOTE, ETAT_ANALYSE)..."
                  value={currentCol}
                  onChange={(e) => setCurrentCol(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addColumn();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addColumn}
                  className={styles.addBtn}
                  title="Ajouter la colonne"
                >
                  <Plus size={22} strokeWidth={3} />
                </button>
              </div>
            </div>

            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={20} className={styles.spin} /> INITIALISATION EN COURS...
                </>
              ) : (
                <>
                  <Cpu size={20} /> INITIALISER LE PROTOCOLE
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: ACTIVE TEMPLATES RACK */}
        <div className={styles.rackPanel}>
          <div className={styles.rackHeaderRow}>
            <div className={styles.rackHeader}>
              <Server size={22} color="#0284c7" />
              <span>PROTOCOLES ACTIFS</span>
            </div>
            <span className={styles.countPill}>
              {templates.length} PROTOCOLE(S)
            </span>
          </div>

          <div className={styles.cartridgesGrid}>
            {templates.length > 0 ? (
              templates.map((t, idx) => (
                <div
                  key={t.id}
                  style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
                  className={`${styles.cartridge} ${deletingId === t.id ? styles.cartridgeDeleting : ""}`}
                >
                  <div className={styles.cartridgeLeft}>
                    <div className={styles.idRow}>
                      <div className={styles.led} />
                      <span className={styles.idRef}>
                        REF #{t.id?.toString().padStart(4, "0")}
                      </span>
                    </div>

                    <div className={styles.cName}>{t.name}</div>

                    <div className={styles.cMeta}>
                      <span className={styles.moduleTag}>
                        <Layers size={12} color="#0284c7" />
                        {t.fields ? t.fields.length : 0} COLONNE(S)
                      </span>
                      {t.fields &&
                        t.fields.slice(0, 3).map((f: any, i: number) => (
                          <span key={i} className={styles.moduleTag}>
                            <PenLine size={11} /> {typeof f === "string" ? f : f.name}
                          </span>
                        ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className={styles.deleteTemplateBtn}
                    disabled={deletingId === t.id}
                    onClick={() => handleDeleteTemplate(t.id, t.name)}
                    title={`Supprimer le protocole ${t.name}`}
                  >
                    {deletingId === t.id ? (
                      <Loader2 size={16} className={styles.spin} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.emptyRack}>
                <ShieldAlert size={48} color="#cbd5e1" style={{ marginBottom: "1rem" }} />
                <p>Aucun protocole actif pour le moment.</p>
                <p>Créez votre premier protocole dans l'Architecte Système.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}