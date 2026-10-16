"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  LayoutPanelLeft,
  ListChecks,
  Lock,
  Edit3,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  CircleDot,
  Sparkles,
  FileSpreadsheet,
  ShieldAlert,
} from "lucide-react";
import { toast } from "@/components/ui/Toaster";

import BoardHeader from "./components/BoardHeader";
import BoardActions from "./components/BoardActions";
import { LuxeOption } from "./ui/LuxeDropdown";
import styles from "./PilotBoard.module.css";

// 🌟 THE LUXE 70% WHITE / 30% ROYAL BLUE INTERACTIVE BACKGROUND
const RoyalBackground = dynamic(() => import("./ux/RoyalBackground"), {
  ssr: false,
});

const API_URL = "/api";

// ============================================================================
// 🧠 SMART EPS EXTRACTOR: Finds EPS-XXXX anywhere in the task or Excel columns
// ============================================================================
export function extractTaskEPS(task: any): string {
  if (!task) return "";

  if (
    task.epsReference &&
    typeof task.epsReference === "string" &&
    !task.epsReference.startsWith("AUTO-")
  ) {
    return task.epsReference.trim();
  }

  const dyn = task.dynamicData || {};

  const priorityKeys = [
    "eps",
    "idintervention",
    "id_intervention",
    "id intervention",
    "intervention",
    "num_eps",
    "reference_eps",
    "code_eps",
  ];

  for (const key of Object.keys(dyn)) {
    const cleanKey = key.trim().toLowerCase();
    if (priorityKeys.some((pk) => cleanKey.includes(pk))) {
      const val = String(dyn[key] || "").trim();
      if (val) return val;
    }
  }

  const epsRegex = /(EPS-[A-Z0-9_-]*\d+[A-Z0-9_-]*)/i;
  for (const val of Object.values(dyn)) {
    if (val !== null && val !== undefined) {
      const strVal = String(val).trim();
      const match = strVal.match(epsRegex);
      if (match) return match[1].toUpperCase();
    }
  }

  return task.epsReference || `TASK-${task.id}`;
}

// ============================================================================
// 🔒 LOCK DETECTOR: Checks if task is finished (2 clicks) or validated by Admin
// ============================================================================
export function isTaskLocked(task: any): boolean {
  if (!task) return false;
  const st = String(task.status || "").toUpperCase().trim();

  // Locked if Pilot finished (DONE after 2 clicks) OR Admin validated in Kanban
  if (
    st === "DONE" ||
    st === "VALIDATED" ||
    st === "VALIDE" ||
    st === "VALIDÉ" ||
    st === "ARCHIVED" ||
    st === "CLOSED" ||
    task.adminValidated === true ||
    task.locked === true
  ) {
    return true;
  }

  return false;
}

export default function PilotBoard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);

  // Search & Cascading Filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterColumn, setFilterColumn] = useState<string>("ALL");
  const [columnExactValue, setColumnExactValue] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Local draft values for smooth typing in editable Pilot columns
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // ========================================================================
  // 1. INITIAL LOAD: User Discovery & Strict Mission Fetching
  // ========================================================================
  useEffect(() => {
    const stored = localStorage.getItem("kyntus_user");
    if (stored) {
      try {
        const currentUser = JSON.parse(stored);
        setUser(currentUser);

        if (currentUser && currentUser.id) {
          fetch(`${API_URL}/templates?userId=${currentUser.id}`)
            .then((res) => res.json())
            .then((data) => {
              const list = Array.isArray(data) ? data : [];
              setTemplates(list);
              if (list.length > 0 && !selectedTemplate) {
                setSelectedTemplate(String(list[0].id));
              }
            })
            .catch((err) => {
              console.error("❌ Connection Error:", err);
              toast({
                message: "ERREUR SYNCHRONISATION SERVEUR",
                type: "error",
              });
            });
        }
      } catch (e) {
        console.error("Invalid user in localStorage", e);
      }
    }
  }, []);

  // ========================================================================
  // 2. DATA ENGINE: Refreshing Tasks for the Selected Mission
  // ========================================================================
  const refreshTasks = () => {
    if (!user || !selectedTemplate) return;
    setLoading(true);
    setSelectedTasks([]);

    fetch(
      `${API_URL}/tasks?assigneeId=${user.id}&templateId=${selectedTemplate}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTasks(data);
        else setTasks([]);
      })
      .catch((e) => console.error("❌ Fetch Tasks Error:", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshTasks();
  }, [user, selectedTemplate]);

  // ========================================================================
  // 3. INTELLIGENCE: Dynamic Columns & Pilot Editable Permissions
  // ========================================================================
  const allowedFields = useMemo(() => {
    if (!selectedTemplate) return [];
    const currentTmpl = templates.find(
      (t) => t.id?.toString() === selectedTemplate
    );
    if (!currentTmpl) return [];

    if (Array.isArray(currentTmpl.fields)) {
      return currentTmpl.fields
        .map((f: any) => (typeof f === "string" ? f : f?.name))
        .filter(Boolean);
    }
    return [];
  }, [selectedTemplate, templates]);

  const allDynamicCols = useMemo(() => {
    const cols = new Set<string>();
    allowedFields.forEach((f: string) => cols.add(f));
    tasks.forEach((t) => {
      if (t.dynamicData) {
        Object.keys(t.dynamicData).forEach((k) => cols.add(k));
      }
    });
    return Array.from(cols);
  }, [tasks, allowedFields]);

  const lockedExcelCols = useMemo(() => {
    const editableSet = new Set(
      allowedFields.map((f: string) => f.toLowerCase())
    );
    return allDynamicCols.filter((c) => !editableSet.has(c.toLowerCase()));
  }, [allDynamicCols, allowedFields]);

  // ========================================================================
  // 4. CASCADING DISTINCT VALUES ENGINE FOR SELECTED COLUMN
  // ========================================================================
  const columnDistinctOptions = useMemo<LuxeOption[]>(() => {
    if (filterColumn === "ALL") return [];

    const countsMap = new Map<string, number>();
    let emptyCount = 0;

    tasks.forEach((task) => {
      let rawVal = "";
      if (filterColumn === "EPS_ONLY") {
        rawVal = extractTaskEPS(task);
      } else {
        rawVal = String(task.dynamicData?.[filterColumn] ?? "").trim();
      }

      if (!rawVal) {
        emptyCount++;
      } else {
        countsMap.set(rawVal, (countsMap.get(rawVal) || 0) + 1);
      }
    });

    const sortedEntries = Array.from(countsMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" })
    );

    const options: LuxeOption[] = [
      {
        value: "ALL",
        label: `Toutes les valeurs (${tasks.length})`,
        badge: tasks.length,
      },
    ];

    if (emptyCount > 0) {
      options.push({
        value: "__EMPTY__",
        label: "⚪ [Vide / Non renseigné]",
        badge: emptyCount,
      });
    }

    sortedEntries.forEach(([val, count]) => {
      options.push({
        value: val,
        label: val,
        badge: count,
      });
    });

    return options;
  }, [tasks, filterColumn]);

  // ========================================================================
  // 5. MULTI-COLUMN + EXACT VALUE FILTER ENGINE
  // ========================================================================
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "VALIDATED") {
          if (!isTaskLocked(task)) return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      const eps = extractTaskEPS(task);
      const dyn = task.dynamicData || {};

      if (filterColumn !== "ALL" && columnExactValue !== "ALL") {
        const targetCell =
          filterColumn === "EPS_ONLY"
            ? eps
            : String(dyn[filterColumn] ?? "").trim();

        if (columnExactValue === "__EMPTY__") {
          if (targetCell !== "") return false;
        } else if (targetCell !== columnExactValue) {
          return false;
        }
      }

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      if (filterColumn === "EPS_ONLY") {
        return eps.toLowerCase().includes(q);
      }

      if (filterColumn !== "ALL") {
        const cellVal = String(dyn[filterColumn] ?? "").toLowerCase();
        return cellVal.includes(q);
      }

      if (eps.toLowerCase().includes(q)) return true;
      return Object.values(dyn).some((val) =>
        String(val ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [tasks, searchQuery, filterColumn, columnExactValue, statusFilter]);

  const handleResetFilters = () => {
    setFilterColumn("ALL");
    setColumnExactValue("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  // ========================================================================
  // 6. MISSION HANDLERS (WITH EDIT 1 LOCK & EDIT 2 MULTI-COLUMN COPY)
  // ========================================================================
  const handleUpdateData = async (taskId: number, key: string, value: any) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (isTaskLocked(targetTask)) {
      return toast({
        message: "🔒 TÂCHE VERROUILLÉE : Modification impossible après validation.",
        type: "error",
      });
    }

    const cellKey = `${taskId}_${key}`;
    setSavingCell(cellKey);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, dynamicData: { ...t.dynamicData, [key]: value } }
          : t
      )
    );

    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/data`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        toast({ message: `Analyse enregistrée (${key}) ✓`, type: "success" });
      }
    } catch (err) {
      console.error(err);
      toast({ message: "Erreur de sauvegarde", type: "error" });
    } finally {
      setTimeout(() => setSavingCell(null), 500);
    }
  };

  // 🔥 EDIT 1: 2 Clics depuis A_FAIRE -> Clic 1: EN_COURS -> Clic 2: DONE (Verrouillé !)
  const handleStatusToggle = async (task: any) => {
    if (isTaskLocked(task)) {
      return toast({
        message: "🔒 Cet EPS est déjà terminé/validé et ne peut plus être modifié.",
        type: "error",
      });
    }

    const currentStatus = task.status || "A_FAIRE";
    let newStatus = "";

    if (currentStatus === "A_FAIRE") {
      newStatus = "EN_COURS";
    } else if (currentStatus === "EN_COURS") {
      newStatus = "DONE"; // 2ème clic -> Terminé et verrouillé !
    } else {
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`${API_URL}/tasks/${task.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (newStatus === "DONE") {
          toast({
            message: `TRAVAIL TERMINÉ & VERROUILLÉ 🔒✅`,
            type: "success",
          });
        }
      } else {
        throw new Error("Server error");
      }
    } catch (e) {
      refreshTasks();
    }
  };

  const handleBulkEdit = async (columnKey: string, value: string) => {
    if (selectedTasks.length === 0) {
      return toast({
        message: "SÉLECTIONNEZ DES LIGNES D'ABORD",
        type: "error",
      });
    }
    if (!columnKey) {
      return toast({
        message: "CHOISISSEZ UNE COLONNE D'ANALYSE",
        type: "error",
      });
    }

    // Filter out tasks that are already locked/validated
    const unlockedSelectedIds = selectedTasks.filter((id) => {
      const t = tasks.find((item) => item.id === id);
      return t && !isTaskLocked(t);
    });

    if (unlockedSelectedIds.length === 0) {
      return toast({
        message: "🔒 Toutes les lignes sélectionnées sont déjà verrouillées/validées !",
        type: "error",
      });
    }

    setTasks((prev) =>
      prev.map((t) =>
        unlockedSelectedIds.includes(t.id)
          ? { ...t, dynamicData: { ...t.dynamicData, [columnKey]: value } }
          : t
      )
    );

    try {
      await Promise.all(
        unlockedSelectedIds.map((id) =>
          fetch(`${API_URL}/tasks/${id}/data`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: columnKey, value }),
          })
        )
      );
      toast({
        message: `${unlockedSelectedIds.length} LIGNE(S) MISE(S) À JOUR AVEC SUCCÈS ⚡`,
        type: "success",
      });
      setSelectedTasks([]);
    } catch (e) {
      refreshTasks();
    }
  };

  const handleCoachSync = async () => {
    if (selectedTasks.length === 0) {
      return toast({ message: "SÉLECTIONNEZ DES LIGNES D'ABORD", type: "error" });
    }
    setTasks((prev) =>
      prev.map((t) =>
        selectedTasks.includes(t.id) ? { ...t, status: "DONE" } : t
      )
    );
    try {
      await Promise.all(
        selectedTasks.map((id) =>
          fetch(`${API_URL}/tasks/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "DONE" }),
          })
        )
      );
      toast({
        message: `${selectedTasks.length} TÂCHES VALIDÉES & VERROUILLÉES 🔒✅`,
        type: "success",
      });
      setSelectedTasks([]);
    } catch (e) {
      refreshTasks();
    }
  };

  const handlePurgeDoublons = async () => {
    if (!window.confirm("Voulez-vous vraiment purger les doublons ?")) return;
    try {
      const res = await fetch(`${API_URL}/pilot-records/deduplicate`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ message: "DOUBLONS PURGÉS 🧹", type: "success" });
        refreshTasks();
      }
    } catch (e) {
      toast({ message: "ERREUR LORS DE LA PURGE", type: "error" });
    }
  };

  // ========================================================================
  // 📋 EDIT 2: COPY VALUES OF SELECTED COLUMN FOR SELECTED ROWS
  // ========================================================================
  const handleCopyColumnValues = (targetCol?: string) => {
    const colToCopy =
      targetCol && targetCol !== "ALL"
        ? targetCol
        : filterColumn !== "ALL"
        ? filterColumn
        : "EPS_ONLY";

    // Take selected rows if any, otherwise take currently filtered rows
    const sourceList =
      selectedTasks.length > 0
        ? tasks.filter((t) => selectedTasks.includes(t.id))
        : filteredTasks;

    if (sourceList.length === 0) {
      return toast({
        message: "AUCUNE LIGNE À COPIER",
        type: "error",
      });
    }

    const extractedValues = sourceList
      .map((t) => {
        if (colToCopy === "EPS_ONLY") {
          return extractTaskEPS(t);
        }
        return String(t.dynamicData?.[colToCopy] ?? "").trim();
      })
      .filter((val) => val !== "" && !val.startsWith("TASK-"));

    if (extractedValues.length === 0) {
      return toast({
        message: `AUCUNE VALEUR TROUVÉE DANS LA COLONNE [${
          colToCopy === "EPS_ONLY" ? "EPS" : colToCopy
        }]`,
        type: "error",
      });
    }

    navigator.clipboard.writeText(extractedValues.join("\n"));
    const labelCol = colToCopy === "EPS_ONLY" ? "EPS" : colToCopy;
    toast({
      message: `${extractedValues.length} VALEUR(S) DE [${labelCol}] COPIÉE(S) 📋`,
      type: "success",
    });
  };

  const handleCopySingleEPS = (taskId: number, eps: string) => {
    navigator.clipboard.writeText(eps);
    setCopiedId(taskId);
    toast({ message: `${eps} copié 📋`, type: "success" });
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Selection helpers
  const allFilteredSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((t) => selectedTasks.includes(t.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredTasks.map((t) => t.id));
      setSelectedTasks((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const merged = new Set([
        ...selectedTasks,
        ...filteredTasks.map((t) => t.id),
      ]);
      setSelectedTasks(Array.from(merged));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const missionOptions: LuxeOption[] = templates.map((tpl: any) => ({
    value: tpl.id?.toString() || "",
    label: (tpl.name || "SANS NOM").toUpperCase(),
    badge: tpl.fields?.length ? `${tpl.fields.length} col.` : undefined,
  }));

  return (
    <div className={styles.boardContainer}>
      {/* 70% White / 30% Royal Blue Interactive Background */}
      <RoyalBackground />

      <div className={styles.glassOverlay}>
        {/* 1. TOP EXECUTIVE HEADER */}
        <div className={styles.headerBento}>
          <BoardHeader
            user={user || { username: "PILOTE_KYNTUS" }}
            missionOptions={missionOptions}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
          />
        </div>

        <div className={styles.boardContent}>
          {/* 2. SUB-HEADER KPI & MISSION INFO */}
          <div className={styles.statsBar}>
            <h2 className={styles.matrixTitle}>
              <span className={styles.titleIconBox}>
                <LayoutPanelLeft size={18} />
              </span>
              <span>
                ESPACE ANALYSE PILOTE //{" "}
                {selectedTemplate
                  ? templates.find((t) => t.id?.toString() === selectedTemplate)
                      ?.name
                  : "EN ATTENTE DE MISSION"}
              </span>
            </h2>

            <div className={styles.kpiBadgesGroup}>
              <div className={styles.editableBadge}>
                <Edit3 size={14} />
                <span>
                  {allowedFields.length} COLONNE(S) D&apos;ANALYSE ACTIVE(S)
                </span>
              </div>
              <div className={styles.countBadge}>
                <ListChecks size={15} />
                <span>
                  {filteredTasks.length} / {tasks.length} LIGNES AFFICHÉES
                </span>
              </div>
            </div>
          </div>

          {/* 3. LUXE CASCADING FILTER & MULTI-COLUMN COPY / BULK COMMENT TOOLBAR */}
          <div className={`${styles.bentoCard} ${styles.actionsWrapper}`}>
            <BoardActions
              tasksCount={tasks.length}
              filteredCount={filteredTasks.length}
              selectedCount={selectedTasks.length}
              allowedFields={allowedFields}
              allColumns={allDynamicCols}
              columnDistinctOptions={columnDistinctOptions}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterColumn={filterColumn}
              setFilterColumn={setFilterColumn}
              columnExactValue={columnExactValue}
              setColumnExactValue={setColumnExactValue}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              onCopyColumnValues={handleCopyColumnValues}
              onPurgeDoublons={handlePurgeDoublons}
              onCoachSync={handleCoachSync}
              onBulkEdit={handleBulkEdit}
              onClearSelection={() => setSelectedTasks([])}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* 4. SMART EXECUTIVE TASK GRID */}
          <div className={`${styles.bentoCard} ${styles.gridWrapper}`}>
            {!selectedTemplate ? (
              <div className={styles.emptyStateBox}>
                <div className={styles.emptyIconCircle}>
                  <FileSpreadsheet size={32} />
                </div>
                <h3>Aucune mission sélectionnée</h3>
                <p>
                  Veuillez choisir une mission dans le sélecteur en haut à
                  droite pour charger vos lignes EPS.
                </p>
              </div>
            ) : loading ? (
              <div className={styles.emptyStateBox}>
                <div className={styles.emptyIconCircle}>
                  <Activity size={32} />
                </div>
                <h3>Synchronisation des données en cours...</h3>
                <p>Chargement des interventions EPS et colonnes d&apos;analyse.</p>
              </div>
            ) : filteredTasks.length > 0 ? (
              <>
                <div className={styles.tableScrollContainer}>
                  <table className={styles.luxeTable}>
                    <thead>
                      <tr>
                        <th className={styles.thLocked} style={{ width: 48 }}>
                          <input
                            type="checkbox"
                            className={styles.luxeCheckbox}
                            checked={allFilteredSelected}
                            onChange={toggleSelectAll}
                            title="Tout sélectionner"
                          />
                        </th>

                        <th className={styles.thLocked}>
                          <div className={styles.thContent}>
                            <span>RÉFÉRENCE EPS</span>
                          </div>
                        </th>

                        <th className={styles.thLocked}>
                          <div className={styles.thContent}>
                            <span>STATUT (2 CLICS = FINI)</span>
                          </div>
                        </th>

                        {/* ✍️ ADMIN-ADDED PILOT EDITABLE COLUMNS */}
                        {allowedFields.map((col: string) => (
                          <th key={col} className={styles.thEditable}>
                            <div className={styles.thContent}>
                              <Edit3 size={14} />
                              <span>{col} (ANALYSE PILOTE)</span>
                            </div>
                          </th>
                        ))}

                        {/* 🔒 LOCKED EXCEL COLUMNS (Read-Only) */}
                        {lockedExcelCols.map((col: string) => (
                          <th key={col} className={styles.thLocked}>
                            <div className={styles.thContent}>
                              <Lock size={12} style={{ opacity: 0.6 }} />
                              <span>{col}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTasks.map((task, idx) => {
                        const isSelected = selectedTasks.includes(task.id);
                        const locked = isTaskLocked(task);
                        const epsCode = extractTaskEPS(task);
                        const dyn = task.dynamicData || {};

                        return (
                          <tr
                            key={task.id}
                            style={{
                              animationDelay: `${Math.min(idx * 18, 300)}ms`,
                            }}
                            className={`${styles.trRow} ${
                              isSelected ? styles.trSelected : ""
                            } ${locked ? styles.trLockedAdmin : ""}`}
                          >
                            <td className={styles.tdCell}>
                              <input
                                type="checkbox"
                                className={styles.luxeCheckbox}
                                checked={isSelected}
                                onChange={() => toggleSelectRow(task.id)}
                              />
                            </td>

                            <td className={styles.tdCell}>
                              <div className={styles.epsPillGroup}>
                                <span className={styles.epsBadge}>{epsCode}</span>
                                <button
                                  type="button"
                                  className={styles.copyMiniBtn}
                                  onClick={() =>
                                    handleCopySingleEPS(task.id, epsCode)
                                  }
                                  title="Copier cet EPS"
                                >
                                  {copiedId === task.id ? (
                                    <Check size={13} />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* 🔥 EDIT 1: Status Button (2 Clicks from A_FAIRE -> DONE & Locked) */}
                            <td className={styles.tdCell}>
                              <button
                                type="button"
                                disabled={locked}
                                onClick={() => handleStatusToggle(task)}
                                title={
                                  locked
                                    ? "Tâche validée et verrouillée — Modification désactivée"
                                    : task.status === "EN_COURS"
                                    ? "Cliquez une 2ème fois pour terminer et verrouiller"
                                    : "Cliquez pour passer En Cours (1/2)"
                                }
                                className={`${styles.statusBtn} ${
                                  locked
                                    ? styles.statusLockedAdmin
                                    : task.status === "EN_COURS"
                                    ? styles.statusProgress
                                    : styles.statusTodo
                                }`}
                              >
                                {locked ? (
                                  <>
                                    <Lock size={12} /> VALIDÉ & VERROUILLÉ
                                  </>
                                ) : task.status === "EN_COURS" ? (
                                  <>
                                    <Clock size={13} /> EN COURS (1/2)
                                  </>
                                ) : (
                                  <>
                                    <CircleDot size={13} /> À FAIRE (0/2)
                                  </>
                                )}
                              </button>
                            </td>

                            {/* ✍️ EDITABLE PILOT COLUMNS (Disabled if Task is Locked/Validated!) */}
                            {allowedFields.map((col: string) => {
                              const cellKey = `${task.id}_${col}`;
                              const currentVal =
                                draftEdits[cellKey] !== undefined
                                  ? draftEdits[cellKey]
                                  : String(dyn[col] ?? "");

                              return (
                                <td key={col} className={styles.tdEditableCell}>
                                  <div className={styles.pilotInputWrapper}>
                                    <input
                                      type="text"
                                      disabled={locked}
                                      className={`${styles.pilotInput} ${
                                        locked ? styles.pilotInputDisabled : ""
                                      }`}
                                      placeholder={
                                        locked
                                          ? "Verrouillé"
                                          : `Saisir ${col}...`
                                      }
                                      value={currentVal}
                                      onChange={(e) =>
                                        setDraftEdits((prev) => ({
                                          ...prev,
                                          [cellKey]: e.target.value,
                                        }))
                                      }
                                      onBlur={() => {
                                        if (
                                          !locked &&
                                          draftEdits[cellKey] !== undefined &&
                                          draftEdits[cellKey] !==
                                            String(dyn[col] ?? "")
                                        ) {
                                          handleUpdateData(
                                            task.id,
                                            col,
                                            draftEdits[cellKey]
                                          );
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }}
                                    />
                                    {locked ? (
                                      <Lock
                                        size={13}
                                        className={styles.lockedInputIcon}
                                      />
                                    ) : (
                                      savingCell === cellKey && (
                                        <Sparkles
                                          size={14}
                                          className={styles.savedIndicator}
                                        />
                                      )
                                    )}
                                  </div>
                                </td>
                              );
                            })}

                            {/* 🔒 DISABLED EXCEL COLUMNS */}
                            {lockedExcelCols.map((col: string) => (
                              <td
                                key={col}
                                className={styles.tdCell}
                                title={String(dyn[col] ?? "")}
                              >
                                <span className={styles.lockedValue}>
                                  {dyn[col] !== undefined && dyn[col] !== ""
                                    ? String(dyn[col])
                                    : "—"}
                                </span>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.tableFooter}>
                  <span>
                    🔒 Les lignes validées (2 clics ou validées par l&apos;Admin
                    dans le Kanban) ainsi que les colonnes Excel sont
                    verrouillées contre toute modification.
                  </span>
                  <span>
                    {selectedTasks.length > 0
                      ? `${selectedTasks.length} ligne(s) sélectionnée(s)`
                      : `${filteredTasks.length} ligne(s) affichée(s)`}
                  </span>
                </div>
              </>
            ) : (
              <div className={styles.emptyStateBox}>
                <div className={styles.emptyIconCircle}>
                  <ListChecks size={32} />
                </div>
                <h3>Aucune ligne trouvée</h3>
                <p>
                  Aucune tâche ne correspond à vos filtres actuels. Cliquez sur
                  RESET pour réafficher toutes les lignes.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}