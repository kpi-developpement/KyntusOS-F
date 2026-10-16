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
  // 4. 🔥 CASCADING DISTINCT VALUES ENGINE FOR SELECTED COLUMN
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
      // 1. Status Filter
      if (statusFilter !== "ALL" && task.status !== statusFilter) {
        return false;
      }

      const eps = extractTaskEPS(task);
      const dyn = task.dynamicData || {};

      // 2. Cascading Exact Value Filter (when a column + specific value is chosen)
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

      // 3. Free-text Search Query Filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      if (filterColumn === "EPS_ONLY") {
        return eps.toLowerCase().includes(q);
      }

      if (filterColumn !== "ALL") {
        const cellVal = String(dyn[filterColumn] ?? "").toLowerCase();
        return cellVal.includes(q);
      }

      // ALL COLUMNS global search
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
  // 6. MISSION HANDLERS (SINGLE & BULK PATCH OPERATIONS)
  // ========================================================================
  const handleUpdateData = async (taskId: number, key: string, value: any) => {
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

  const handleStatusToggle = async (taskId: number, currentStatus: string) => {
    let newStatus = "EN_COURS";
    if (currentStatus === "A_FAIRE") newStatus = "EN_COURS";
    else if (currentStatus === "EN_COURS") newStatus = "DONE";
    else newStatus = "A_FAIRE";

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      const res = await fetch(`${API_URL}/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok && newStatus === "DONE") {
        toast({ message: `TÂCHE VALIDÉE ✅`, type: "success" });
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

    setTasks((prev) =>
      prev.map((t) =>
        selectedTasks.includes(t.id)
          ? { ...t, dynamicData: { ...t.dynamicData, [columnKey]: value } }
          : t
      )
    );

    try {
      await Promise.all(
        selectedTasks.map((id) =>
          fetch(`${API_URL}/tasks/${id}/data`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: columnKey, value }),
          })
        )
      );
      toast({
        message: `${selectedTasks.length} LIGNES MISES À JOUR AVEC SUCCÈS ⚡`,
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
        message: `${selectedTasks.length} TÂCHES VALIDÉES ✅`,
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

  // 📋 SMART MULTI-EPS COPY
  const handleCopyEPSList = () => {
    const sourceList =
      selectedTasks.length > 0
        ? tasks.filter((t) => selectedTasks.includes(t.id))
        : filteredTasks;

    const epsValues = Array.from(
      new Set(
        sourceList
          .map((t) => extractTaskEPS(t))
          .filter((eps) => eps && !eps.startsWith("TASK-"))
      )
    );

    if (epsValues.length === 0) {
      return toast({
        message: "AUCUN CODE EPS DÉTECTÉ DANS LA SÉLECTION",
        type: "error",
      });
    }

    navigator.clipboard.writeText(epsValues.join("\n"));
    toast({
      message: `${epsValues.length} RÉFÉRENCES EPS COPIÉES 📋`,
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

          {/* 3. LUXE CASCADING FILTER & BULK COMMENT TOOLBAR */}
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
              onCopyEPS={handleCopyEPSList}
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
                            <span>STATUT</span>
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
                            }`}
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

                            <td className={styles.tdCell}>
                              <button
                                type="button"
                                onClick={() =>
                                  handleStatusToggle(
                                    task.id,
                                    task.status || "A_FAIRE"
                                  )
                                }
                                className={`${styles.statusBtn} ${
                                  task.status === "DONE"
                                    ? styles.statusDone
                                    : task.status === "EN_COURS"
                                    ? styles.statusProgress
                                    : styles.statusTodo
                                }`}
                              >
                                {task.status === "DONE" ? (
                                  <>
                                    <CheckCircle2 size={13} /> TERMINÉ
                                  </>
                                ) : task.status === "EN_COURS" ? (
                                  <>
                                    <Clock size={13} /> EN COURS
                                  </>
                                ) : (
                                  <>
                                    <CircleDot size={13} /> À FAIRE
                                  </>
                                )}
                              </button>
                            </td>

                            {/* ✍️ EDITABLE PILOT COLUMNS */}
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
                                      className={styles.pilotInput}
                                      placeholder={`Saisir ${col}...`}
                                      value={currentVal}
                                      onChange={(e) =>
                                        setDraftEdits((prev) => ({
                                          ...prev,
                                          [cellKey]: e.target.value,
                                        }))
                                      }
                                      onBlur={() => {
                                        if (
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
                                    {savingCell === cellKey && (
                                      <Sparkles
                                        size={14}
                                        className={styles.savedIndicator}
                                      />
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
                    🔒 Les colonnes issues du fichier Excel sont verrouillées en
                    lecture seule. Seules les colonnes bleues ajoutées par
                    l&apos;Admin sont modifiables.
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