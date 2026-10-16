"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  ShieldCheck,
  Info,
  Layers,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowUpToLine,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/Toaster";

import BoardHeader from "./components/BoardHeader";
import BoardActions from "./components/BoardActions";
import { LuxeOption } from "./ui/LuxeDropdown";
import styles from "./PilotBoard.module.css";

const RoyalBackground = dynamic(() => import("./ux/RoyalBackground"), {
  ssr: false,
});

const API_URL = "/api";

// ============================================================================
// UNIVERSAL CLIPBOARD ENGINE (Works on BOTH HTTP IP & HTTPS!)
// ============================================================================
export async function universalCopyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("Clipboard API failed, switching to fallback...", err);
    }
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return false;
  }
}

// ============================================================================
// SMART EPS EXTRACTOR: 100% Independent of Column Order or Visibility
// ============================================================================
export function extractTaskEPS(task: any, editableCols: string[] = []): string {
  if (!task) return "";

  const directCandidates = [
    task.epsReference,
    task.eps,
    task.eps_reference,
    task.idIntervention,
    task.reference,
  ];
  for (const cand of directCandidates) {
    if (cand && typeof cand === "string" && !cand.startsWith("AUTO-")) {
      return cand.trim();
    }
  }

  const dyn = task.dynamicData || {};
  const keys = Object.keys(dyn);

  const epsRegex = /(EPS-[A-Z0-9_-]*\d+[A-Z0-9_-]*)/i;
  for (const k of keys) {
    const val = String(dyn[k] ?? "").trim();
    const match = val.match(epsRegex);
    if (match) return match[1].toUpperCase();
  }

  const priorityNames = [
    "eps",
    "idintervention",
    "id_intervention",
    "id intervention",
    "intervention",
    "num_eps",
    "reference",
    "ref",
    "dossier",
    "id",
  ];
  for (const k of keys) {
    const lowerK = k.trim().toLowerCase();
    if (priorityNames.some((pn) => lowerK === pn || lowerK.includes(pn))) {
      const val = String(dyn[k] ?? "").trim();
      if (val) return val;
    }
  }

  const editSet = new Set(editableCols.map((c) => c.toLowerCase()));
  for (const k of keys) {
    if (!editSet.has(k.toLowerCase())) {
      const val = String(dyn[k] ?? "").trim();
      if (val) return val;
    }
  }

  return task.id ? `EPS-${task.id}` : "";
}

// ============================================================================
// FINAL ADMIN LOCK DETECTOR:
// Only locks when Admin validates in Kanban (NOT when Pilot clicks 2 times to DONE!)
// ============================================================================
export function isTaskLockedByAdmin(task: any): boolean {
  if (!task) return false;
  const st = String(task.status || "").toUpperCase().trim();

  return (
    st === "VALIDATED" ||
    st === "VALIDE_FINAL" ||
    st === "VALIDÉ_FINAL" ||
    st === "VALIDE" ||
    st === "ARCHIVED" ||
    st === "CLOSED" ||
    task.adminValidated === true ||
    task.locked === true
  );
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
  // NEW 2026: CUSTOM COLUMN ORDER & VISIBILITY ENGINE
  // ========================================================================
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [isColStudioOpen, setIsColStudioOpen] = useState(false);

  // ========================================================================
  // 1. INITIAL LOAD
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
              console.error("Connection Error:", err);
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
  // 2. DATA ENGINE: Refreshing Tasks
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
      .catch((e) => console.error("Fetch Tasks Error:", e))
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

  const editableLowerSet = useMemo(
    () => new Set(allowedFields.map((f: string) => f.toLowerCase())),
    [allowedFields]
  );

  const isEditableColumn = useCallback(
    (colName: string) => editableLowerSet.has(colName.toLowerCase()),
    [editableLowerSet]
  );

  // Default Order: Editable Pilot Columns first, then Locked Excel Columns
  const defaultOrderedCols = useMemo(() => {
    const cols = new Set<string>();
    allowedFields.forEach((f: string) => cols.add(f));
    tasks.forEach((t) => {
      if (t.dynamicData) {
        Object.keys(t.dynamicData).forEach((k) => cols.add(k));
      }
    });
    return Array.from(cols);
  }, [tasks, allowedFields]);

  // Load & Sync Saved Column Order per Mission Template
  useEffect(() => {
    if (!selectedTemplate || defaultOrderedCols.length === 0) {
      setColumnOrder(defaultOrderedCols);
      return;
    }

    const storageOrderKey = `kyntus_col_order_${selectedTemplate}`;
    const storageHiddenKey = `kyntus_col_hidden_${selectedTemplate}`;

    try {
      const savedOrderRaw = localStorage.getItem(storageOrderKey);
      const savedHiddenRaw = localStorage.getItem(storageHiddenKey);

      if (savedHiddenRaw) {
        const parsedHidden = JSON.parse(savedHiddenRaw);
        if (Array.isArray(parsedHidden)) setHiddenColumns(parsedHidden);
      } else {
        setHiddenColumns([]);
      }

      if (savedOrderRaw) {
        const parsedOrder: string[] = JSON.parse(savedOrderRaw);
        if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
          // Keep saved columns that still exist + append any newly discovered columns
          const existingSet = new Set(defaultOrderedCols);
          const validSaved = parsedOrder.filter((c) => existingSet.has(c));
          constvalidSavedSet = new Set(validSaved);
          const missingCols = defaultOrderedCols.filter(
            (c) => !constvalidSavedSet.has(c)
          );
          setColumnOrder([...validSaved, ...missingCols]);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not read column layout from localStorage", e);
    }

    setColumnOrder(defaultOrderedCols);
  }, [selectedTemplate, defaultOrderedCols]);

  const saveColumnOrder = (newOrder: string[]) => {
    setColumnOrder(newOrder);
    if (selectedTemplate) {
      localStorage.setItem(
        `kyntus_col_order_${selectedTemplate}`,
        JSON.stringify(newOrder)
      );
    }
  };

  const toggleColumnVisibility = (col: string) => {
    setHiddenColumns((prev) => {
      const next = prev.includes(col)
        ? prev.filter((item) => item !== col)
        : [...prev, col];
      if (selectedTemplate) {
        localStorage.setItem(
          `kyntus_col_hidden_${selectedTemplate}`,
          JSON.stringify(next)
        );
      }
      return next;
    });
  };

  const handleResetColumnLayout = () => {
    setColumnOrder(defaultOrderedCols);
    setHiddenColumns([]);
    if (selectedTemplate) {
      localStorage.removeItem(`kyntus_col_order_${selectedTemplate}`);
      localStorage.removeItem(`kyntus_col_hidden_${selectedTemplate}`);
    }
    toast({
      message: "ORDRE DES COLONNES RÉINITIALISÉ PAR DÉFAUT",
      type: "success",
    });
  };

  // Move Column Left/Right by 1 step
  const moveColumnStep = (col: string, direction: "left" | "right") => {
    const visibleList = columnOrder.filter((c) => !hiddenColumns.includes(c));
    const currentVisIdx = visibleList.indexOf(col);
    if (currentVisIdx === -1) return;

    const targetVisIdx =
      direction === "left" ? currentVisIdx - 1 : currentVisIdx + 1;
    if (targetVisIdx < 0 || targetVisIdx >= visibleList.length) return;

    const targetCol = visibleList[targetVisIdx];
    const nextOrder = [...columnOrder];
    const fromFullIdx = nextOrder.indexOf(col);
    const toFullIdx = nextOrder.indexOf(targetCol);

    nextOrder[fromFullIdx] = targetCol;
    nextOrder[toFullIdx] = col;
    saveColumnOrder(nextOrder);
  };

  // Pin Column to First Position
  const pinColumnFirst = (col: string) => {
    const nextOrder = [col, ...columnOrder.filter((c) => c !== col)];
    saveColumnOrder(nextOrder);
    toast({
      message: `COLONNE [${col.toUpperCase()}] PLACÉE EN TÊTE`,
      type: "success",
    });
  };

  // Drag & Drop Column Reordering Handlers
  const handleColDragStart = (e: React.DragEvent, col: string) => {
    setDraggedCol(col);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", col);
  };

  const handleColDragOver = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedCol && draggedCol !== targetCol && dragOverCol !== targetCol) {
      setDragOverCol(targetCol);
    }
  };

  const handleColDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const sourceCol = draggedCol || e.dataTransfer.getData("text/plain");
    setDraggedCol(null);
    setDragOverCol(null);

    if (!sourceCol || sourceCol === targetCol) return;

    const nextOrder = [...columnOrder];
    const fromIdx = nextOrder.indexOf(sourceCol);
    const toIdx = nextOrder.indexOf(targetCol);
    if (fromIdx === -1 || toIdx === -1) return;

    nextOrder.splice(fromIdx, 1);
    nextOrder.splice(toIdx, 0, sourceCol);
    saveColumnOrder(nextOrder);
  };

  const handleColDragEnd = () => {
    setDraggedCol(null);
    setDragOverCol(null);
  };

  const visibleOrderedCols = useMemo(
    () => columnOrder.filter((c) => !hiddenColumns.includes(c)),
    [columnOrder, hiddenColumns]
  );

  // ========================================================================
  // 4. CASCADING DISTINCT VALUES ENGINE (PURE VECTOR ICONS)
  // ========================================================================
  const columnDistinctOptions = useMemo<LuxeOption[]>(() => {
    if (filterColumn === "ALL") return [];

    const countsMap = new Map<string, number>();
    let emptyCount = 0;

    tasks.forEach((task) => {
      let rawVal = "";
      if (filterColumn === "EPS_ONLY") {
        rawVal = extractTaskEPS(task, allowedFields);
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
        icon: <Layers size={14} />,
      },
    ];

    if (emptyCount > 0) {
      options.push({
        value: "__EMPTY__",
        label: "[Vide / Non renseigné]",
        badge: emptyCount,
        icon: <CircleDot size={14} />,
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
  }, [tasks, filterColumn, allowedFields]);

  // ========================================================================
  // 5. MULTI-COLUMN + EXACT VALUE FILTER ENGINE
  // ========================================================================
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "VALIDATED") {
          if (!isTaskLockedByAdmin(task)) return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      const eps = extractTaskEPS(task, allowedFields);
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
  }, [tasks, searchQuery, filterColumn, columnExactValue, statusFilter, allowedFields]);

  const handleResetFilters = () => {
    setFilterColumn("ALL");
    setColumnExactValue("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  // ========================================================================
  // 6. MISSION HANDLERS (100% PRESERVED)
  // ========================================================================
  const handleUpdateData = async (taskId: number, key: string, value: any) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (isTaskLockedByAdmin(targetTask)) {
      return toast({
        message: "VALIDÉ PAR L'ADMIN : Modification impossible.",
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
        toast({ message: `Analyse enregistrée (${key})`, type: "success" });
      }
    } catch (err) {
      console.error(err);
      toast({ message: "Erreur de sauvegarde", type: "error" });
    } finally {
      setTimeout(() => setSavingCell(null), 500);
    }
  };

  const handleStatusToggle = async (task: any) => {
    if (isTaskLockedByAdmin(task)) {
      return toast({
        message: "Cet EPS a été validé finalement par l'Admin dans le Kanban.",
        type: "error",
      });
    }

    const currentStatus = task.status || "A_FAIRE";
    let newStatus = "EN_COURS";

    if (currentStatus === "A_FAIRE") {
      newStatus = "EN_COURS";
    } else if (currentStatus === "EN_COURS") {
      newStatus = "DONE";
    } else if (currentStatus === "DONE") {
      newStatus = "EN_COURS";
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
            message: "TERMINÉ (En attente de validation finale Admin)",
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

    const unlockedSelectedIds = selectedTasks.filter((id) => {
      const t = tasks.find((item) => item.id === id);
      return t && !isTaskLockedByAdmin(t);
    });

    if (unlockedSelectedIds.length === 0) {
      return toast({
        message: "Les lignes sélectionnées sont déjà validées par l'Admin.",
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

    setDraftEdits((prev) => {
      const copy = { ...prev };
      unlockedSelectedIds.forEach((id) => {
        delete copy[`${id}_${columnKey}`];
      });
      return copy;
    });

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
        message: `${unlockedSelectedIds.length} LIGNE(S) MISE(S) À JOUR AVEC SUCCÈS`,
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
    const unlockedIds = selectedTasks.filter((id) => {
      const t = tasks.find((item) => item.id === id);
      return t && !isTaskLockedByAdmin(t);
    });

    setTasks((prev) =>
      prev.map((t) =>
        unlockedIds.includes(t.id) ? { ...t, status: "DONE" } : t
      )
    );
    try {
      await Promise.all(
        unlockedIds.map((id) =>
          fetch(`${API_URL}/tasks/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "DONE" }),
          })
        )
      );
      toast({
        message: `${unlockedIds.length} TÂCHES MARQUÉES TERMINÉES`,
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
        toast({ message: "DOUBLONS PURGÉS AVEC SUCCÈS", type: "success" });
        refreshTasks();
      }
    } catch (e) {
      toast({ message: "ERREUR LORS DE LA PURGE", type: "error" });
    }
  };

  const handleCopyColumnValues = async (targetCol?: string) => {
    const colToCopy =
      targetCol && targetCol !== "ALL"
        ? targetCol
        : filterColumn !== "ALL"
        ? filterColumn
        : "EPS_ONLY";

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
          return extractTaskEPS(t, allowedFields);
        }
        const cellKey = `${t.id}_${colToCopy}`;
        if (draftEdits[cellKey] !== undefined) {
          return String(draftEdits[cellKey]).trim();
        }
        return String(t.dynamicData?.[colToCopy] ?? "").trim();
      })
      .filter((val) => val !== "");

    if (extractedValues.length === 0) {
      return toast({
        message: `AUCUNE VALEUR TROUVÉE DANS LA COLONNE [${
          colToCopy === "EPS_ONLY" ? "EPS" : colToCopy
        }]`,
        type: "error",
      });
    }

    const textToCopy = extractedValues.join("\n");
    const ok = await universalCopyToClipboard(textToCopy);

    const labelCol = colToCopy === "EPS_ONLY" ? "EPS" : colToCopy;
    if (ok) {
      toast({
        message: `${extractedValues.length} VALEUR(S) [${labelCol}] COPIÉE(S) DANS LE PRESSE-PAPIERS`,
        type: "success",
      });
    } else {
      toast({
        message: "Erreur d'accès au presse-papiers du navigateur",
        type: "error",
      });
    }
  };

  const handleCopySingleEPS = async (taskId: number, eps: string) => {
    const ok = await universalCopyToClipboard(eps);
    if (ok) {
      setCopiedId(taskId);
      toast({ message: `${eps} copié dans le presse-papiers`, type: "success" });
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

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
          {/* 2. SUB-HEADER KPI, MISSION INFO & COLUMN LAYOUT STUDIO */}
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
              {/* NEW: COLUMN REORDER & VISIBILITY STUDIO POPOVER */}
              <div className={styles.colStudioWrapper}>
                <button
                  type="button"
                  onClick={() => setIsColStudioOpen((prev) => !prev)}
                  className={`${styles.colStudioTrigger} ${
                    isColStudioOpen ? styles.colStudioTriggerActive : ""
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>
                    COLONNES & ORDRE ({visibleOrderedCols.length}/{columnOrder.length})
                  </span>
                </button>

                {isColStudioOpen && (
                  <div className={styles.colStudioPopover}>
                    <div className={styles.colStudioHeader}>
                      <div className={styles.colStudioTitle}>
                        <SlidersHorizontal size={15} />
                        <span>ORGANISER LES COLONNES</span>
                      </div>
                      <div className={styles.colStudioHeaderActions}>
                        <button
                          type="button"
                          onClick={handleResetColumnLayout}
                          className={styles.colResetMiniBtn}
                          title="Réinitialiser l'ordre par défaut"
                        >
                          <RotateCcw size={12} />
                          <span>DÉFAUT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsColStudioOpen(false)}
                          className={styles.colCloseMiniBtn}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className={styles.colStudioHint}>
                      Glissez-déposez les colonnes ou utilisez les flèches pour personnaliser votre vue.
                    </div>

                    <div className={styles.colStudioList}>
                      {columnOrder.map((col, index) => {
                        const isEditable = isEditableColumn(col);
                        const isHidden = hiddenColumns.includes(col);
                        return (
                          <div
                            key={col}
                            draggable
                            onDragStart={(e) => handleColDragStart(e, col)}
                            onDragOver={(e) => handleColDragOver(e, col)}
                            onDrop={(e) => handleColDrop(e, col)}
                            onDragEnd={handleColDragEnd}
                            className={`${styles.colStudioItem} ${
                              isEditable ? styles.colStudioItemEditable : ""
                            } ${isHidden ? styles.colStudioItemHidden : ""} ${
                              dragOverCol === col ? styles.colStudioItemDragOver : ""
                            }`}
                          >
                            <div className={styles.colStudioItemLeft}>
                              <GripVertical
                                size={14}
                                className={styles.colGripIcon}
                              />
                              <span className={styles.colIndexBadge}>
                                #{index + 1}
                              </span>
                              <span className={styles.colStudioName}>{col}</span>
                              {isEditable && (
                                <span className={styles.colEditableTag}>
                                  PILOTE
                                </span>
                              )}
                            </div>

                            <div className={styles.colStudioItemRight}>
                              <button
                                type="button"
                                onClick={() => pinColumnFirst(col)}
                                disabled={index === 0}
                                className={styles.colIconBtn}
                                title="Placer en 1ère position"
                              >
                                <ArrowUpToLine size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveColumnStep(col, "left")}
                                disabled={index === 0}
                                className={styles.colIconBtn}
                                title="Monter / Déplacer à gauche"
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveColumnStep(col, "right")}
                                disabled={index === columnOrder.length - 1}
                                className={styles.colIconBtn}
                                title="Descendre / Déplacer à droite"
                              >
                                <ChevronRight size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleColumnVisibility(col)}
                                className={`${styles.colIconBtn} ${
                                  isHidden ? styles.colIconBtnMuted : ""
                                }`}
                                title={
                                  isHidden
                                    ? "Afficher cette colonne"
                                    : "Masquer cette colonne"
                                }
                              >
                                {isHidden ? (
                                  <EyeOff size={13} />
                                ) : (
                                  <Eye size={13} />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

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
              allColumns={columnOrder}
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

          {/* 4. SMART EXECUTIVE TASK GRID WITH DRAGGABLE & REORDERABLE COLUMNS */}
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
                        {/* STICKY COL 1: CHECKBOX */}
                        <th
                          className={`${styles.thLocked} ${styles.stickyColCheck}`}
                        >
                          <input
                            type="checkbox"
                            className={styles.luxeCheckbox}
                            checked={allFilteredSelected}
                            onChange={toggleSelectAll}
                            title="Tout sélectionner"
                          />
                        </th>

                        {/* STICKY COL 2: RÉFÉRENCE EPS (ALWAYS PINNED FOR QUALITY & SPEED) */}
                        <th
                          className={`${styles.thLocked} ${styles.stickyColEps}`}
                        >
                          <div className={styles.thContent}>
                            <span>RÉFÉRENCE EPS</span>
                          </div>
                        </th>

                        {/* STICKY COL 3: STATUT PILOTE / ADMIN */}
                        <th
                          className={`${styles.thLocked} ${styles.stickyColStatus}`}
                        >
                          <div className={styles.thContent}>
                            <span>STATUT PILOTE / ADMIN</span>
                          </div>
                        </th>

                        {/* DYNAMIC REORDERABLE COLUMNS (PILOT EDITABLE & EXCEL LOCKED) */}
                        {visibleOrderedCols.map((col: string, colIdx: number) => {
                          const isEditable = isEditableColumn(col);
                          const isDraggingThis = draggedCol === col;
                          const isDragTarget = dragOverCol === col;

                          return (
                            <th
                              key={col}
                              draggable
                              onDragStart={(e) => handleColDragStart(e, col)}
                              onDragOver={(e) => handleColDragOver(e, col)}
                              onDrop={(e) => handleColDrop(e, col)}
                              onDragEnd={handleColDragEnd}
                              className={`${
                                isEditable ? styles.thEditable : styles.thLocked
                              } ${styles.thDraggable} ${
                                isDraggingThis ? styles.thDragging : ""
                              } ${isDragTarget ? styles.thDragTarget : ""}`}
                            >
                              <div className={styles.thInteractiveBar}>
                                <div className={styles.thContent}>
                                  <GripVertical
                                    size={14}
                                    className={styles.thGripHandle}
                                  />
                                  {isEditable ? (
                                    <Edit3 size={14} />
                                  ) : (
                                    <Lock size={12} style={{ opacity: 0.65 }} />
                                  )}
                                  <span>
                                    {col}
                                    {isEditable ? " (ANALYSE)" : ""}
                                  </span>
                                </div>

                                {/* Instant 1-Click Column Reorder Controls */}
                                <div className={styles.thReorderControls}>
                                  <button
                                    type="button"
                                    disabled={colIdx === 0}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveColumnStep(col, "left");
                                    }}
                                    className={styles.thMoveBtn}
                                    title="Déplacer cette colonne à gauche"
                                  >
                                    <ChevronLeft size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      colIdx === visibleOrderedCols.length - 1
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      moveColumnStep(col, "right");
                                    }}
                                    className={styles.thMoveBtn}
                                    title="Déplacer cette colonne à droite"
                                  >
                                    <ChevronRight size={13} />
                                  </button>
                                </div>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTasks.map((task) => {
                        const isSelected = selectedTasks.includes(task.id);
                        const lockedByAdmin = isTaskLockedByAdmin(task);
                        const epsCode = extractTaskEPS(task, allowedFields);
                        const dyn = task.dynamicData || {};

                        return (
                          <tr
                            key={task.id}
                            className={`${styles.trRow} ${
                              isSelected ? styles.trSelected : ""
                            } ${lockedByAdmin ? styles.trLockedAdmin : ""}`}
                          >
                            {/* STICKY CELL 1: CHECKBOX */}
                            <td
                              className={`${styles.tdCell} ${styles.stickyColCheck}`}
                            >
                              <input
                                type="checkbox"
                                className={styles.luxeCheckbox}
                                checked={isSelected}
                                onChange={() => toggleSelectRow(task.id)}
                              />
                            </td>

                            {/* STICKY CELL 2: EPS REFERENCE */}
                            <td
                              className={`${styles.tdCell} ${styles.stickyColEps}`}
                            >
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

                            {/* STICKY CELL 3: STATUS */}
                            <td
                              className={`${styles.tdCell} ${styles.stickyColStatus}`}
                            >
                              <button
                                type="button"
                                disabled={lockedByAdmin}
                                onClick={() => handleStatusToggle(task)}
                                title={
                                  lockedByAdmin
                                    ? "Validé finalement par l'Admin dans le Kanban — Lecture seule"
                                    : task.status === "DONE"
                                    ? "Terminé par vous (en attente validation Admin). Cliquez pour rouvrir."
                                    : task.status === "EN_COURS"
                                    ? "Cliquez une 2ème fois pour marquer comme Terminé"
                                    : "Cliquez pour démarrer (En Cours)"
                                }
                                className={`${styles.statusBtn} ${
                                  lockedByAdmin
                                    ? styles.statusLockedAdmin
                                    : task.status === "DONE"
                                    ? styles.statusDone
                                    : task.status === "EN_COURS"
                                    ? styles.statusProgress
                                    : styles.statusTodo
                                }`}
                              >
                                {lockedByAdmin ? (
                                  <>
                                    <ShieldCheck size={13} />
                                    <span>VALIDÉ ADMIN</span>
                                    <Lock size={12} />
                                  </>
                                ) : task.status === "DONE" ? (
                                  <>
                                    <CheckCircle2 size={13} />
                                    <span>TERMINÉ (2/2)</span>
                                  </>
                                ) : task.status === "EN_COURS" ? (
                                  <>
                                    <Clock size={13} />
                                    <span>EN COURS (1/2)</span>
                                  </>
                                ) : (
                                  <>
                                    <CircleDot size={13} />
                                    <span>À FAIRE (0/2)</span>
                                  </>
                                )}
                              </button>
                            </td>

                            {/* DYNAMIC CELLS MATCHING USER'S CUSTOM COLUMN ORDER */}
                            {visibleOrderedCols.map((col: string) => {
                              const isEditable = isEditableColumn(col);

                              if (isEditable) {
                                const cellKey = `${task.id}_${col}`;
                                const currentVal =
                                  draftEdits[cellKey] !== undefined
                                    ? draftEdits[cellKey]
                                    : String(dyn[col] ?? "");

                                return (
                                  <td
                                    key={col}
                                    className={`${styles.tdEditableCell} ${
                                      dragOverCol === col
                                        ? styles.tdDragTargetCol
                                        : ""
                                    }`}
                                  >
                                    <div className={styles.pilotInputWrapper}>
                                      <input
                                        type="text"
                                        disabled={lockedByAdmin}
                                        className={`${styles.pilotInput} ${
                                          lockedByAdmin
                                            ? styles.pilotInputDisabled
                                            : ""
                                        }`}
                                        placeholder={
                                          lockedByAdmin
                                            ? "Validé par l'Admin"
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
                                            !lockedByAdmin &&
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
                                            (
                                              e.target as HTMLInputElement
                                            ).blur();
                                          }
                                        }}
                                      />
                                      {lockedByAdmin ? (
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
                              }

                              return (
                                <td
                                  key={col}
                                  className={`${styles.tdCell} ${
                                    dragOverCol === col
                                      ? styles.tdDragTargetCol
                                      : ""
                                  }`}
                                  title={String(dyn[col] ?? "")}
                                >
                                  <span className={styles.lockedValue}>
                                    {dyn[col] !== undefined && dyn[col] !== ""
                                      ? String(dyn[col])
                                      : "—"}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.tableFooter}>
                  <span className={styles.footerNote}>
                    <Info size={15} color="#0284c7" />
                    <span>
                      Glissez les en-têtes de colonnes ou cliquez sur{" "}
                      <strong>COLONNES & ORDRE</strong> pour réorganiser votre
                      grille. Vos préférences sont sauvegardées automatiquement.
                    </span>
                  </span>
                  <span>
                    {selectedTasks.length > 0
                      ? `${selectedTasks.length} ligne(s) cochée(s)`
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