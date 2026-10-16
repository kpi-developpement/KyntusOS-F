"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  ShieldAlert,
  FileText,
  User,
  RotateCcw,
  Clock,
  Database,
  CheckCircle2,
  Copy,
  Check,
  ArrowRightLeft,
  Sparkles,
  Lock,
} from "lucide-react";
import styles from "./Check.module.css";
import { toast } from "@/components/ui/Toaster";

// ============================================================================
// 🧠 EXTRACT REAL EXCEL EPS FROM ANY TASK COLUMN
// ============================================================================
function extractExcelEPS(task: any): string {
  if (!task) return "";
  const dyn = task.dynamicData || {};

  // 1. Scan for any value matching "EPS-..." inside Excel dynamicData
  const epsRegex = /(EPS-[A-Z0-9_-]*\d+[A-Z0-9_-]*)/i;
  for (const val of Object.values(dyn)) {
    const str = String(val ?? "").trim();
    const match = str.match(epsRegex);
    if (match) return match[1].toUpperCase();
  }

  // 2. Check Excel columns named EPS, idIntervention, Intervention, etc.
  const priorityCols = [
    "eps",
    "idintervention",
    "id_intervention",
    "id intervention",
    "intervention",
    "num_eps",
    "reference",
    "dossier",
  ];
  for (const key of Object.keys(dyn)) {
    const lower = key.trim().toLowerCase();
    if (priorityCols.some((p) => lower === p || lower.includes(p))) {
      const val = String(dyn[key] ?? "").trim();
      if (val) return val;
    }
  }

  // 3. Fallback to epsReference if not auto-generated
  if (task.epsReference && !String(task.epsReference).startsWith("AUTO-")) {
    return String(task.epsReference);
  }

  return `TASK-#${task.id}`;
}

export default function InspectorPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [pilots, setPilots] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("ALL");
  const [epsInput, setEpsInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [matches, setMatches] = useState<any[]>([]);
  const [task, setTask] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() =>
        toast({ message: "Erreur chargement templates", type: "error" })
      );

    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setPilots(
            data.filter(
              (u: any) =>
                !u.role ||
                String(u.role).toUpperCase().includes("PILOT") ||
                String(u.role).toUpperCase().includes("USER")
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  // ==========================================================================
  // 🔍 DEEP EXCEL EPS SEARCH ENGINE (Finds real EPS inside Excel columns!)
  // ==========================================================================
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = epsInput.trim().toLowerCase();
    if (!cleanQuery) {
      return toast({
        message: "Veuillez saisir un numéro EPS du fichier Excel",
        type: "error",
      });
    }

    setLoading(true);
    setTask(null);
    setMatches([]);

    try {
      let candidateTasks: any[] = [];

      // 1. Fetch tasks from selected template OR across all templates
      if (selectedTemplate !== "ALL") {
        const res = await fetch(`/api/tasks?templateId=${selectedTemplate}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) candidateTasks = data;
        }
      } else {
        // Omni-scan across all active templates
        const allRes = await Promise.all(
          templates.map((tpl) =>
            fetch(`/api/tasks?templateId=${tpl.id}`)
              .then((r) => (r.ok ? r.json() : []))
              .then((list) =>
                Array.isArray(list)
                  ? list.map((item) => ({
                      ...item,
                      template: item.template || tpl,
                    }))
                  : []
              )
              .catch(() => [])
          )
        );
        candidateTasks = allRes.flat();
      }

      // 2. Also try backend /api/admin/search?eps=... in case it returns a direct match
      try {
        const directRes = await fetch(
          `/api/admin/search?eps=${encodeURIComponent(epsInput.trim())}`
        );
        if (directRes.ok) {
          const directTask = await directRes.json();
          if (
            directTask &&
            directTask.id &&
            !candidateTasks.some((t) => t.id === directTask.id)
          ) {
            candidateTasks.unshift(directTask);
          }
        }
      } catch {}

      // 3. Filter tasks by matching the query against the REAL Excel EPS or any Excel cell value
      const foundList = candidateTasks.filter((t) => {
        const realEps = extractExcelEPS(t).toLowerCase();
        if (realEps.includes(cleanQuery)) return true;

        const sysEps = String(t.epsReference || "").toLowerCase();
        if (sysEps.includes(cleanQuery)) return true;

        const dyn = t.dynamicData || {};
        return Object.values(dyn).some((val) =>
          String(val ?? "")
            .toLowerCase()
            .includes(cleanQuery)
        );
      });

      if (foundList.length > 0) {
        setMatches(foundList);
        setTask(foundList[0]);
        toast({
          message: `✨ ${foundList.length} DOSSIER(S) EXCEL TROUVÉ(S)`,
          type: "success",
        });
      } else {
        toast({
          message: `AUCUN EPS "${epsInput.toUpperCase()}" TROUVÉ DANS LES FICHIERS EXCEL`,
          type: "error",
        });
      }
    } catch (error) {
      toast({ message: "Erreur lors de la recherche", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTask(null);
    setMatches([]);
    setEpsInput("");
  };

  // Update Status (Reject OR Final Admin Validation Lock)
  const handleStatusOverride = async (newStatus: string, label: string) => {
    if (!task) return;
    if (!window.confirm(`Confirmer le passage au statut : ${label} ?`)) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ message: `STATUT MIS À JOUR : ${label}`, type: "success" });
        const updated = { ...task, status: newStatus };
        setTask(updated);
        setMatches((prev) =>
          prev.map((m) => (m.id === task.id ? updated : m))
        );
      }
    } catch (e) {
      toast({ message: "ERREUR MISE À JOUR STATUT", type: "error" });
    }
  };

  // Reassign Task to another Pilot directly from Inspector
  const handleReassignPilot = async (newPilotId: string) => {
    if (!task || !newPilotId) return;
    const targetPilot = pilots.find((p) => String(p.id) === String(newPilotId));

    try {
      const res = await fetch(`/api/tasks/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          newPilotId: Number(newPilotId),
        }),
      });

      if (res.ok || targetPilot) {
        const updated = { ...task, assignee: targetPilot };
        setTask(updated);
        setMatches((prev) =>
          prev.map((m) => (m.id === task.id ? updated : m))
        );
        toast({
          message: `🔄 EPS réaffecté au pilote ${
            targetPilot?.username || newPilotId
          }`,
          type: "success",
        });
      }
    } catch (e) {
      toast({ message: "Erreur transfert pilote", type: "error" });
    }
  };

  const handleCopyEps = (epsStr: string) => {
    navigator.clipboard?.writeText(epsStr);
    setCopied(true);
    toast({ message: `📋 ${epsStr} copié !`, type: "success" });
    setTimeout(() => setCopied(false), 1500);
  };

  const getStatusBadgeStyle = (status: string) => {
    const st = String(status || "").toUpperCase();
    if (st === "VALIDATED" || st === "VALIDE") {
      return {
        bg: "#dcfce7",
        color: "#15803d",
        border: "1px solid #86efac",
        label: "🔒 VALIDÉ FINAL (VERROUILLÉ)",
      };
    }
    if (st === "DONE") {
      return {
        bg: "#e0f2fe",
        color: "#0369a1",
        border: "1px solid #7dd3fc",
        label: "✅ TERMINÉ PAR LE PILOTE",
      };
    }
    if (st === "REJETE") {
      return {
        bg: "#ffe4e6",
        color: "#e11d48",
        border: "1px solid #fda4af",
        label: "⚠️ REJETÉ",
      };
    }
    if (st === "EN_COURS") {
      return {
        bg: "#fef3c7",
        color: "#b45309",
        border: "1px solid #fde68a",
        label: "⏳ EN COURS D'ANALYSE",
      };
    }
    return {
      bg: "#f1f5f9",
      color: "#475569",
      border: "1px solid #cbd5e1",
      label: st || "À FAIRE",
    };
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "00h 00m 00s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const realExcelEps = task ? extractExcelEPS(task) : "";
  const statusInfo = task ? getStatusBadgeStyle(task.status) : null;
  const tplObj = task
    ? task.template ||
      templates.find((t) => String(t.id) === String(selectedTemplate))
    : null;

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow} />

      {/* HEADER */}
      <div className={styles.headerTitle}>
        <div className={styles.badgeTop}>
          <Sparkles size={13} /> RECHERCHE INTELLIGENTE EXCEL & TRAÇABILITÉ PILOTE
        </div>
        <h1 className={styles.titleMain}>INSPECTOR PROTOCOL</h1>
        <span className={styles.subtitle}>
          // RECHERCHE PAR NUMÉRO EPS DU FICHIER EXCEL (EX: EPS-12345)
        </span>
      </div>

      {/* SEARCH BAR (Always accessible for fast switching) */}
      <div className={styles.searchZone}>
        <div className={styles.fieldCol}>
          <label className={styles.fieldLabel}>1. PROJET / TEMPLATE CIBLE</label>
          <select
            className={styles.selectBox}
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            <option value="ALL">🌐 TOUS LES PROJETS (OMNI-SCAN)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                📁 {t.name.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearch} className={styles.inputWrapper}>
          <div style={{ flex: 1 }} className={styles.fieldCol}>
            <label className={styles.fieldLabel}>
              2. CODE EPS DU FICHIER EXCEL (OU VALEUR D&apos;INTERVENTION)
            </label>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tapez le code EPS du fichier Excel (ex: EPS-84920)..."
              value={epsInput}
              onChange={(e) => setEpsInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className={styles.searchBtn}
            disabled={loading}
          >
            <Search size={18} />
            <span>{loading ? "RECHERCHE..." : "RECHERCHER EPS"}</span>
          </button>
        </form>
      </div>

      {/* IF MULTIPLE ROWS MATCH THE EPS QUERY */}
      {matches.length > 1 && (
        <div className={styles.matchesBanner}>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 800,
              color: "#0369a1",
            }}
          >
            {matches.length} DOSSIERS CORRESPONDANTS :
          </span>
          {matches.map((m) => {
            const mEps = extractExcelEPS(m);
            const isSelected = task?.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setTask(m)}
                className={`${styles.matchPill} ${
                  isSelected ? styles.matchPillActive : ""
                }`}
              >
                {mEps} — 👤 {m.assignee?.username || "Non assigné"}
              </button>
            );
          })}
        </div>
      )}

      {/* RESULT DOSSIER CARD */}
      {task && statusInfo && (
        <div className={styles.resultCard}>
          {/* HEADER: REAL EXCEL EPS & STATUS */}
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.epsTitleRow}>
                <div className={styles.epsTitle}>{realExcelEps}</div>
                <button
                  type="button"
                  className={styles.copyEpsBtn}
                  onClick={() => handleCopyEps(realExcelEps)}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "COPIÉ" : "COPIER EPS"}</span>
                </button>
              </div>
              <div className={styles.templateTag}>
                <FileText size={13} />
                <span>
                  PROJET : {tplObj?.name || "MISSION KYNTUS"} (ID Tâche #
                  {task.id})
                </span>
              </div>
            </div>

            <div
              className={styles.statusBadge}
              style={{
                background: statusInfo.bg,
                color: statusInfo.color,
                border: statusInfo.border,
              }}
            >
              {statusInfo.label}
            </div>
          </div>

          {/* DECK: PILOT RESPONSIBLE (+ REASSIGNMENT) & TIME */}
          <div className={styles.infoDeck}>
            {/* PILOT */}
            <div className={styles.deckSection}>
              <div className={styles.sectionLabel}>
                <User size={15} /> PILOTE RESPONSABLE DE CET EPS
              </div>
              <div className={styles.pilotRow}>
                <div className={styles.pilotIdentity}>
                  <div className={styles.pilotAvatar}>
                    {task.assignee?.username?.substring(0, 1).toUpperCase() ||
                      "?"}
                  </div>
                  <div>
                    <div className={styles.pilotName}>
                      {task.assignee?.username || "AUCUN PILOTE ASSIGNÉ"}
                    </div>
                    <div className={styles.pilotMeta}>
                      ID PILOTE : {task.assignee?.id || "N/A"}
                    </div>
                  </div>
                </div>

                {/* 🔄 Reassign to another Pilot */}
                {pilots.length > 0 && (
                  <div className={styles.reassignBox}>
                    <ArrowRightLeft size={14} color="#0284c7" />
                    <select
                      className={styles.reassignSelect}
                      value={task.assignee?.id || ""}
                      onChange={(e) => handleReassignPilot(e.target.value)}
                      title="Transférer cet EPS à un autre pilote"
                    >
                      <option value="">— Changer de pilote —</option>
                      {pilots.map((p) => (
                        <option key={p.id} value={p.id}>
                          👤 {p.username}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* TIME */}
            <div className={styles.deckSection}>
              <div className={styles.sectionLabel}>
                <Clock size={15} /> TEMPS D&apos;OPÉRATION & TRAÇABILITÉ
              </div>
              <div className={styles.timeDisplay}>
                {formatDuration(task.cumulativeTimeSeconds)}
                <span>CUMULÉ</span>
              </div>
              <div
                style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}
              >
                Dernière activité :{" "}
                {task.lastStartedAt
                  ? new Date(task.lastStartedAt).toLocaleString()
                  : "Enregistré dans la base"}
              </div>
            </div>
          </div>

          {/* DATA GRID: ALL EXCEL COLUMNS + PILOT ANALYSIS */}
          <div className={styles.gridSectionHeader}>
            <Database size={15} /> DONNÉES DU FICHIER EXCEL & ANALYSE DU PILOTE
          </div>

          <div className={styles.fullDataGrid}>
            {task.dynamicData && Object.keys(task.dynamicData).length > 0 ? (
              Object.entries(task.dynamicData).map(([key, value]) => {
                const isAnalysisCol =
                  key.toLowerCase().includes("comment") ||
                  key.toLowerCase().includes("etat") ||
                  key.toLowerCase().includes("statut") ||
                  key.toLowerCase().includes("analyse");

                return (
                  <div
                    key={key}
                    className={`${styles.dataItem} ${
                      isAnalysisCol ? styles.dataItemHighlight : ""
                    }`}
                  >
                    <label className={styles.dataLabel}>
                      {isAnalysisCol ? `✍️ ${key}` : `📄 ${key}`}
                    </label>
                    <div className={styles.dataValue}>
                      {value !== null && value !== undefined && String(value) !== ""
                        ? String(value)
                        : "—"}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "#64748b", fontStyle: "italic" }}>
                Aucune donnée Excel attachée à cette ligne.
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className={styles.actionZone}>
            <button onClick={handleReset} className={styles.resetBtn}>
              <RotateCcw size={15} /> RÉINITIALISER L&apos;AFFICHAGE
            </button>

            <div className={styles.rightActions}>
              <button
                type="button"
                onClick={() =>
                  handleStatusOverride("VALIDATED", "VALIDÉ FINAL (VERROUILLÉ)")
                }
                className={styles.validateBtn}
              >
                <Lock size={16} /> VALIDER FINAL & VERROUILLER CHEZ LE PILOTE
              </button>

              <button
                type="button"
                onClick={() => handleStatusOverride("REJETE", "REJETÉ")}
                className={styles.rejectBtn}
              >
                <ShieldAlert size={16} /> FORCER REJET (OVERRIDE)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}