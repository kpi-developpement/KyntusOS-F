"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  ArrowUpAZ,
  ArrowDownZA,
  ArrowUpDown,
  AlignLeft,
  Maximize2,
  Minimize2,
  Filter,
  Search,
  FileCheck2,
  FileQuestion,
  TextQuote,
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
// TYPES FOR 2026 IN-COLUMN SORT & MULTI-FILTER ENGINE
// ============================================================================
type SortMode = "ASC" | "DESC" | "EMPTY_FIRST" | "FILLED_FIRST" | "LEN_DESC";
type ColFilterMode = "CONTAINS" | "NOT_CONTAINS" | "EMPTY" | "NOT_EMPTY";

interface ColumnFilterRule {
  mode: ColFilterMode;
  text: string;
  selectedValues: string[];
}

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

  // Global Toolbar Search & Cascading Filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterColumn, setFilterColumn] = useState<string>("ALL");
  const [columnExactValue, setColumnExactValue] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Local draft values for smooth typing in editable Pilot columns
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // ========================================================================
  // 2026 ENGINE 1: COLUMN REORDERING & VISIBILITY
  // ========================================================================
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [isColStudioOpen, setIsColStudioOpen] = useState(false);

  // ========================================================================
  // 2026 ENGINE 2: IN-COLUMN SORT & MULTI-FILTER STUDIO
  // ========================================================================
  const [sortConfig, setSortConfig] = useState<{
    col: string;
    mode: SortMode;
  } | null>(null);
  const [colFilters, setColFilters] = useState<Record<string, ColumnFilterRule>>({});
  const [openMenuCol, setOpenMenuCol] = useState<string | null>(null);
  const menuPopoverRef = useRef<HTMLDivElement>(null);

  // ========================================================================
  // 2026 ENGINE 3: BENTO TEXT AUTO-WRAP (PER-COLUMN, PER-CELL & GLOBAL)
  // ========================================================================
  const [wrappedColumns, setWrappedColumns] = useState<string[]>([]);
  const [globalWrap, setGlobalWrap] = useState<boolean>(false);
  const [expandedCells, setExpandedCells] = useState<Record<string, boolean>>({});

  // Close In-Column Filter Popover on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        menuPopoverRef.current &&
        !menuPopoverRef.current.contains(e.target as Node)
      ) {
        setOpenMenuCol(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

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

  // Load & Sync Saved Column Order + Wrapped Columns per Mission Template
  useEffect(() => {
    if (!selectedTemplate || defaultOrderedCols.length === 0) {
      setColumnOrder(defaultOrderedCols);
      return;
    }

    const storageOrderKey = `kyntus_col_order_${selectedTemplate}`;
    const storageHiddenKey = `kyntus_col_hidden_${selectedTemplate}`;
    const storageWrapKey = `kyntus_col_wrap_${selectedTemplate}`;

    try {
      const savedOrderRaw = localStorage.getItem(storageOrderKey);
      const savedHiddenRaw = localStorage.getItem(storageHiddenKey);
      const savedWrapRaw = localStorage.getItem(storageWrapKey);

      if (savedHiddenRaw) {
        const parsedHidden = JSON.parse(savedHiddenRaw);
        if (Array.isArray(parsedHidden)) setHiddenColumns(parsedHidden);
      } else {
        setHiddenColumns([]);
      }

      if (savedWrapRaw) {
        const parsedWrap = JSON.parse(savedWrapRaw);
        if (Array.isArray(parsedWrap)) setWrappedColumns(parsedWrap);
      } else {
        // Default: Auto-wrap Pilot Editable columns so comments are comfortable!
        setWrappedColumns(allowedFields);
      }

      if (savedOrderRaw) {
        const parsedOrder: string[] = JSON.parse(savedOrderRaw);
        if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
          const existingSet = new Set(defaultOrderedCols);
          const validSaved = parsedOrder.filter((c) => existingSet.has(c));
          const validSavedSet = new Set(validSaved);
          const missingCols = defaultOrderedCols.filter(
            (c) => !validSavedSet.has(c)
          );
          setColumnOrder([...validSaved, ...missingCols]);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not read column layout from localStorage", e);
    }

    setColumnOrder(defaultOrderedCols);
  }, [selectedTemplate, defaultOrderedCols, allowedFields]);

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

  const toggleColumnWrap = (col: string) => {
    setWrappedColumns((prev) => {
      const next = prev.includes(col)
        ? prev.filter((c) => c !== col)
        : [...prev, col];
      if (selectedTemplate) {
        localStorage.setItem(
          `kyntus_col_wrap_${selectedTemplate}`,
          JSON.stringify(next)
        );
      }
      return next;
    });
  };

  const toggleCellExpand = (cellId: string) => {
    setExpandedCells((prev) => ({
      ...prev,
      [cellId]: !prev[cellId],
    }));
  };

  const handleResetColumnLayout = () => {
    setColumnOrder(defaultOrderedCols);
    setHiddenColumns([]);
    setWrappedColumns(allowedFields);
    setGlobalWrap(false);
    if (selectedTemplate) {
      localStorage.removeItem(`kyntus_col_order_${selectedTemplate}`);
      localStorage.removeItem(`kyntus_col_hidden_${selectedTemplate}`);
      localStorage.removeItem(`kyntus_col_wrap_${selectedTemplate}`);
    }
    toast({
      message: "ORDRE ET AFFICHAGE DES COLONNES RÉINITIALISÉS",
      type: "success",
    });
  };

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

  const pinColumnFirst = (col: string) => {
    const nextOrder = [col, ...columnOrder.filter((c) => c !== col)];
    saveColumnOrder(nextOrder);
    toast({
      message: `COLONNE [${col.toUpperCase()}] PLACÉE EN TÊTE`,
      type: "success",
    });
  };

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

  // Helper to read cell value for any column (including __EPS__ and __STATUS__)
  const getTaskCellValue = useCallback(
    (task: any, colKey: string): string => {
      if (colKey === "__EPS__" || colKey === "EPS_ONLY") {
        return extractTaskEPS(task, allowedFields);
      }
      if (colKey === "__STATUS__") {
        if (isTaskLockedByAdmin(task)) return "VALIDATED";
        return String(task.status || "A_FAIRE");
      }
      const cellDraftKey = `${task.id}_${colKey}`;
      if (draftEdits[cellDraftKey] !== undefined) {
        return String(draftEdits[cellDraftKey]).trim();
      }
      return String(task.dynamicData?.[colKey] ?? "").trim();
    },
    [allowedFields, draftEdits]
  );

  // Quick cycle sort A->Z / Z->A / Off
  const toggleQuickSort = (colKey: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.col !== colKey) return { col: colKey, mode: "ASC" };
      if (prev.mode === "ASC") return { col: colKey, mode: "DESC" };
      return null;
    });
  };

  // Update In-Column Filter Rule
  const updateColFilterRule = (
    colKey: string,
    patch: Partial<ColumnFilterRule>
  ) => {
    setColFilters((prev) => {
      const existing = prev[colKey] || {
        mode: "CONTAINS",
        text: "",
        selectedValues: [],
      };
      const updated = { ...existing, ...patch };

      const isDefault =
        updated.mode === "CONTAINS" &&
        updated.text.trim() === "" &&
        updated.selectedValues.length === 0;

      if (isDefault) {
        const copy = { ...prev };
        delete copy[colKey];
        return copy;
      }
      return { ...prev, [colKey]: updated };
    });
  };

  const clearSingleColFilter = (colKey: string) => {
    setColFilters((prev) => {
      const copy = { ...prev };
      delete copy[colKey];
      return copy;
    });
  };

  // Distinct values for the currently opened In-Column Filter Popover
  const openColDistinctValues = useMemo(() => {
    if (!openMenuCol) return [];
    const counts = new Map<string, number>();
    tasks.forEach((t) => {
      const val = getTaskCellValue(t, openMenuCol);
      if (val !== "") {
        counts.set(val, (counts.get(val) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) =>
        a[0].localeCompare(b[0], undefined, {
          numeric: true,
          sensitivity: "base",
        })
      )
      .slice(0, 60);
  }, [openMenuCol, tasks, getTaskCellValue]);

  // ========================================================================
  // 4. CASCADING DISTINCT VALUES ENGINE FOR TOOLBAR
  // ========================================================================
  const columnDistinctOptions = useMemo<LuxeOption[]>(() => {
    if (filterColumn === "ALL") return [];

    const countsMap = new Map<string, number>();
    let emptyCount = 0;

    tasks.forEach((task) => {
      const rawVal = getTaskCellValue(task, filterColumn);
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
  }, [tasks, filterColumn, getTaskCellValue]);

  // ========================================================================
  // 5. MASTER FILTER + IN-COLUMN RULES + SMART SORT ENGINE
  // ========================================================================
  const filteredTasks = useMemo(() => {
    // Step A: Filter rows
    const matching = tasks.filter((task) => {
      // 1. Global Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "VALIDATED") {
          if (!isTaskLockedByAdmin(task)) return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }

      const eps = extractTaskEPS(task, allowedFields);
      const dyn = task.dynamicData || {};

      // 2. Global Cascading Exact Value Filter
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

      // 3. Per-Column Advanced Filter Rules (from Column Header Popovers)
      for (const [colKey, rule] of Object.entries(colFilters)) {
        const cellVal = getTaskCellValue(task, colKey);
        const lowerVal = cellVal.toLowerCase();

        if (rule.mode === "EMPTY" && cellVal !== "") return false;
        if (rule.mode === "NOT_EMPTY" && cellVal === "") return false;

        if (rule.text.trim() !== "") {
          const qText = rule.text.trim().toLowerCase();
          if (rule.mode === "CONTAINS" && !lowerVal.includes(qText)) {
            return false;
          }
          if (rule.mode === "NOT_CONTAINS" && lowerVal.includes(qText)) {
            return false;
          }
        }

        if (rule.selectedValues.length > 0) {
          if (!rule.selectedValues.includes(cellVal)) return false;
        }
      }

      // 4. Global Search Input
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

    // Step B: Apply In-Column Sorting if active
    if (!sortConfig) return matching;

    const { col, mode } = sortConfig;
    const sorted = [...matching].sort((a, b) => {
      const valA = getTaskCellValue(a, col);
      const valB = getTaskCellValue(b, col);

      const isEmptyA = valA === "";
      const isEmptyB = valB === "";

      if (mode === "EMPTY_FIRST") {
        if (isEmptyA && !isEmptyB) return -1;
        if (!isEmptyA && isEmptyB) return 1;
        return valA.localeCompare(valB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (mode === "FILLED_FIRST") {
        if (!isEmptyA && isEmptyB) return -1;
        if (isEmptyA && !isEmptyB) return 1;
        return valA.localeCompare(valB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      if (mode === "LEN_DESC") {
        if (valB.length !== valA.length) return valB.length - valA.length;
        return valA.localeCompare(valB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      // Always push empty cells to the bottom during normal A-Z or Z-A sort so they don't pollute top results
      if (isEmptyA && !isEmptyB) return 1;
      if (!isEmptyA && isEmptyB) return -1;

      const cmp = valA.localeCompare(valB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return mode === "ASC" ? cmp : -cmp;
    });

    return sorted;
  }, [
    tasks,
    searchQuery,
    filterColumn,
    columnExactValue,
    statusFilter,
    allowedFields,
    colFilters,
    sortConfig,
    getTaskCellValue,
  ]);

  const handleResetFilters = () => {
    setFilterColumn("ALL");
    setColumnExactValue("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
    setColFilters({});
    setSortConfig(null);
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

  const activeColFilterKeys = Object.keys(colFilters);

  // ========================================================================
  // HELPER: RENDER FLOATING IN-COLUMN SORT & FILTER STUDIO POPOVER
  // ========================================================================
  const renderColumnPopover = (colKey: string, displayLabel: string) => {
    if (openMenuCol !== colKey) return null;

    const currentRule: ColumnFilterRule = colFilters[colKey] || {
      mode: "CONTAINS",
      text: "",
      selectedValues: [],
    };
    const isSortedThis = sortConfig?.col === colKey;
    const isWrappedThis =
      globalWrap || wrappedColumns.includes(colKey);

    return (
      <div
        ref={menuPopoverRef}
        className={styles.colFilterPopover}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.colPopoverHeader}>
          <span className={styles.colPopoverTitle}>{displayLabel}</span>
          <button
            type="button"
            onClick={() => setOpenMenuCol(null)}
            className={styles.colCloseMiniBtn}
          >
            <X size={13} />
          </button>
        </div>

        {/* SECTION 1: SMART SORTS (A-Z, Z-A, VIDES D'ABORD, REMPLIS D'ABORD, LONGUEUR) */}
        <div className={styles.colPopoverSection}>
          <span className={styles.colSectionLabel}>TRI INTELLIGENT</span>
          <div className={styles.colSortGrid}>
            <button
              type="button"
              onClick={() => setSortConfig({ col: colKey, mode: "ASC" })}
              className={`${styles.colSortBtn} ${
                isSortedThis && sortConfig?.mode === "ASC"
                  ? styles.colSortBtnActive
                  : ""
              }`}
            >
              <ArrowUpAZ size={14} />
              <span>Croissant (A → Z / 0 → 9)</span>
            </button>

            <button
              type="button"
              onClick={() => setSortConfig({ col: colKey, mode: "DESC" })}
              className={`${styles.colSortBtn} ${
                isSortedThis && sortConfig?.mode === "DESC"
                  ? styles.colSortBtnActive
                  : ""
              }`}
            >
              <ArrowDownZA size={14} />
              <span>Décroissant (Z → A / 9 → 0)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSortConfig({ col: colKey, mode: "EMPTY_FIRST" })
              }
              className={`${styles.colSortBtn} ${
                isSortedThis && sortConfig?.mode === "EMPTY_FIRST"
                  ? styles.colSortBtnActive
                  : ""
              }`}
            >
              <FileQuestion size={14} />
              <span>Vides en haut (À compléter)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSortConfig({ col: colKey, mode: "FILLED_FIRST" })
              }
              className={`${styles.colSortBtn} ${
                isSortedThis && sortConfig?.mode === "FILLED_FIRST"
                  ? styles.colSortBtnActive
                  : ""
              }`}
            >
              <FileCheck2 size={14} />
              <span>Remplis en haut</span>
            </button>

            <button
              type="button"
              onClick={() => setSortConfig({ col: colKey, mode: "LEN_DESC" })}
              className={`${styles.colSortBtn} ${
                isSortedThis && sortConfig?.mode === "LEN_DESC"
                  ? styles.colSortBtnActive
                  : ""
              }`}
            >
              <TextQuote size={14} />
              <span>Textes longs d&apos;abord</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: BENTO TEXT AUTO-WRAP */}
        {colKey !== "__EPS__" && colKey !== "__STATUS__" && (
          <div className={styles.colPopoverSection}>
            <span className={styles.colSectionLabel}>AFFICHAGE DU TEXTE</span>
            <button
              type="button"
              onClick={() => toggleColumnWrap(colKey)}
              className={`${styles.colWrapToggleBtn} ${
                isWrappedThis ? styles.colWrapToggleActive : ""
              }`}
            >
              {isWrappedThis ? (
                <Minimize2 size={14} />
              ) : (
                <Maximize2 size={14} />
              )}
              <span>
                {isWrappedThis
                  ? "Mode Lecture Intégrale Actif (Cliquer pour 1 ligne)"
                  : "Adapter & Afficher tout le texte (Multi-lignes)"}
              </span>
            </button>
          </div>
        )}

        {/* SECTION 3: IN-COLUMN FILTER */}
        <div className={styles.colPopoverSection}>
          <div className={styles.colFilterHeaderRow}>
            <span className={styles.colSectionLabel}>FILTRER CETTE COLONNE</span>
            {colFilters[colKey] && (
              <button
                type="button"
                onClick={() => clearSingleColFilter(colKey)}
                className={styles.colClearRuleBtn}
              >
                Effacer
              </button>
            )}
          </div>

          <div className={styles.colModePills}>
            {(
              [
                { id: "CONTAINS", label: "Contient" },
                { id: "NOT_CONTAINS", label: "Exclut" },
                { id: "NOT_EMPTY", label: "Rempli" },
                { id: "EMPTY", label: "Vide" },
              ] as { id: ColFilterMode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => updateColFilterRule(colKey, { mode: m.id })}
                className={`${styles.colModePill} ${
                  currentRule.mode === m.id ? styles.colModePillActive : ""
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {(currentRule.mode === "CONTAINS" ||
            currentRule.mode === "NOT_CONTAINS") && (
            <div className={styles.colSearchWrap}>
              <Search size={13} className={styles.colSearchIcon} />
              <input
                type="text"
                placeholder={`Filtrer dans ${displayLabel}...`}
                value={currentRule.text}
                onChange={(e) =>
                  updateColFilterRule(colKey, { text: e.target.value })
                }
                className={styles.colSearchInput}
              />
              {currentRule.text && (
                <button
                  type="button"
                  onClick={() => updateColFilterRule(colKey, { text: "" })}
                  className={styles.colClearInputBtn}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}

          {/* Distinct Values Multi-Select Chips */}
          {openColDistinctValues.length > 0 && (
            <div className={styles.colValuesBox}>
              {openColDistinctValues.map(([val, count]) => {
                const isChecked = currentRule.selectedValues.includes(val);
                return (
                  <div
                    key={val}
                    onClick={() => {
                      const nextVals = isChecked
                        ? currentRule.selectedValues.filter((v) => v !== val)
                        : [...currentRule.selectedValues, val];
                      updateColFilterRule(colKey, { selectedValues: nextVals });
                    }}
                    className={`${styles.colValueOption} ${
                      isChecked ? styles.colValueOptionActive : ""
                    }`}
                  >
                    <span className={styles.colValueText}>{val}</span>
                    <span className={styles.colValueCount}>{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

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
          {/* 2. SUB-HEADER KPI, GLOBAL WRAP & COLUMN LAYOUT STUDIO */}
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
              {/* NEW: 1-CLICK GLOBAL TEXT AUTO-WRAP (MODE LECTURE INTEGRALE) */}
              <button
                type="button"
                onClick={() => setGlobalWrap((prev) => !prev)}
                className={`${styles.colStudioTrigger} ${
                  globalWrap ? styles.colStudioTriggerActive : ""
                }`}
                title="Adapter toutes les cases pour afficher les textes longs en entier sans défiler"
              >
                <AlignLeft size={14} />
                <span>
                  {globalWrap
                    ? "MODE LECTURE INTÉGRALE : ON"
                    : "ADAPTER TEXTES LONGS"}
                </span>
              </button>

              {/* COLUMN REORDER & VISIBILITY STUDIO POPOVER */}
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
                    COLONNES & ORDRE ({visibleOrderedCols.length}/
                    {columnOrder.length})
                  </span>
                </button>

                {isColStudioOpen && (
                  <div className={styles.colStudioPopover}>
                    <div className={styles.colStudioHeader}>
                      <div className={styles.colStudioTitle}>
                        <SlidersHorizontal size={15} />
                        <span>ORGANISER & ADAPTER LES COLONNES</span>
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
                      Glissez-déposez pour changer l&apos;ordre, ou activez l&apos;icône de texte pour adapter les colonnes longues.
                    </div>

                    <div className={styles.colStudioList}>
                      {columnOrder.map((col, index) => {
                        const isEditable = isEditableColumn(col);
                        const isHidden = hiddenColumns.includes(col);
                        const isWrapped = wrappedColumns.includes(col);
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
                              dragOverCol === col
                                ? styles.colStudioItemDragOver
                                : ""
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
                              <span className={styles.colStudioName}>
                                {col}
                              </span>
                              {isEditable && (
                                <span className={styles.colEditableTag}>
                                  PILOTE
                                </span>
                              )}
                            </div>

                            <div className={styles.colStudioItemRight}>
                              <button
                                type="button"
                                onClick={() => toggleColumnWrap(col)}
                                className={`${styles.colIconBtn} ${
                                  isWrapped ? styles.colIconBtnActive : ""
                                }`}
                                title="Adapter la hauteur de case pour afficher tout le texte"
                              >
                                <AlignLeft size={13} />
                              </button>
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
                                title="Déplacer à gauche"
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveColumnStep(col, "right")}
                                disabled={index === columnOrder.length - 1}
                                className={styles.colIconBtn}
                                title="Déplacer à droite"
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

          {/* ACTIVE IN-COLUMN SORT & FILTER TELEMETRY RIBBON */}
          {(sortConfig || activeColFilterKeys.length > 0) && (
            <div className={styles.activeRulesBar}>
              <span className={styles.activeRulesLabel}>
                <Filter size={13} />
                <span>RÈGLES COLONNES ACTIVES :</span>
              </span>

              {sortConfig && (
                <div className={styles.ruleChipSort}>
                  <ArrowUpDown size={12} />
                  <span>
                    TRI [{sortConfig.col === "__EPS__" ? "EPS" : sortConfig.col === "__STATUS__" ? "STATUT" : sortConfig.col}] :{" "}
                    <strong>
                      {sortConfig.mode === "ASC"
                        ? "A → Z"
                        : sortConfig.mode === "DESC"
                        ? "Z → A"
                        : sortConfig.mode === "EMPTY_FIRST"
                        ? "Vides en haut"
                        : sortConfig.mode === "FILLED_FIRST"
                        ? "Remplis en haut"
                        : "Plus longs"}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSortConfig(null)}
                    className={styles.ruleChipRemove}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {activeColFilterKeys.map((cKey) => {
                const r = colFilters[cKey];
                return (
                  <div key={cKey} className={styles.ruleChipFilter}>
                    <Filter size={12} />
                    <span>
                      {cKey === "__EPS__" ? "EPS" : cKey} (
                      {r.mode === "EMPTY"
                        ? "Vides"
                        : r.mode === "NOT_EMPTY"
                        ? "Remplis"
                        : r.text || `${r.selectedValues.length} val.`}
                      )
                    </span>
                    <button
                      type="button"
                      onClick={() => clearSingleColFilter(cKey)}
                      className={styles.ruleChipRemove}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setSortConfig(null);
                  setColFilters({});
                }}
                className={styles.clearAllRulesBtn}
              >
                Tout effacer
              </button>
            </div>
          )}

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

                        {/* STICKY COL 2: RÉFÉRENCE EPS (WITH IN-COLUMN SORT & FILTER) */}
                        <th
                          className={`${styles.thLocked} ${styles.stickyColEps} ${
                            openMenuCol === "__EPS__" ? styles.thMenuOpen : ""
                          } ${
                            sortConfig?.col === "__EPS__" ||
                            colFilters["__EPS__"]
                              ? styles.thActiveRule
                              : ""
                          }`}
                        >
                          <div className={styles.thInteractiveBar}>
                            <div className={styles.thContent}>
                              <span>RÉFÉRENCE EPS</span>
                            </div>
                            <div className={styles.thActionCluster}>
                              <button
                                type="button"
                                onClick={() => toggleQuickSort("__EPS__")}
                                className={`${styles.thHeaderIconBtn} ${
                                  sortConfig?.col === "__EPS__"
                                    ? styles.thHeaderIconBtnActive
                                    : ""
                                }`}
                                title="Trier A-Z / Z-A"
                              >
                                {sortConfig?.col === "__EPS__" &&
                                sortConfig.mode === "DESC" ? (
                                  <ArrowDownZA size={13} />
                                ) : (
                                  <ArrowUpAZ size={13} />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenMenuCol(
                                    openMenuCol === "__EPS__" ? null : "__EPS__"
                                  )
                                }
                                className={`${styles.thHeaderIconBtn} ${
                                  colFilters["__EPS__"] ||
                                  openMenuCol === "__EPS__"
                                    ? styles.thHeaderIconBtnActive
                                    : ""
                                }`}
                                title="Filtrer et trier cette colonne"
                              >
                                <Filter size={12} />
                              </button>
                            </div>
                          </div>
                          {renderColumnPopover("__EPS__", "RÉFÉRENCE EPS")}
                        </th>

                        {/* STICKY COL 3: STATUT PILOTE / ADMIN */}
                        <th
                          className={`${styles.thLocked} ${styles.stickyColStatus} ${
                            openMenuCol === "__STATUS__" ? styles.thMenuOpen : ""
                          }`}
                        >
                          <div className={styles.thInteractiveBar}>
                            <div className={styles.thContent}>
                              <span>STATUT PILOTE / ADMIN</span>
                            </div>
                            <div className={styles.thActionCluster}>
                              <button
                                type="button"
                                onClick={() => toggleQuickSort("__STATUS__")}
                                className={`${styles.thHeaderIconBtn} ${
                                  sortConfig?.col === "__STATUS__"
                                    ? styles.thHeaderIconBtnActive
                                    : ""
                                }`}
                                title="Trier par statut"
                              >
                                <ArrowUpDown size={13} />
                              </button>
                            </div>
                          </div>
                        </th>

                        {/* DYNAMIC REORDERABLE COLUMNS (WITH SORT, FILTER & AUTO-WRAP) */}
                        {visibleOrderedCols.map((col: string, colIdx: number) => {
                          const isEditable = isEditableColumn(col);
                          const isDraggingThis = draggedCol === col;
                          const isDragTarget = dragOverCol === col;
                          const isWrapped =
                            globalWrap || wrappedColumns.includes(col);
                          const isSorted = sortConfig?.col === col;
                          const isFiltered = Boolean(colFilters[col]);
                          const isMenuOpen = openMenuCol === col;

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
                                isWrapped ? styles.thWrappedMode : ""
                              } ${isDraggingThis ? styles.thDragging : ""} ${
                                isDragTarget ? styles.thDragTarget : ""
                              } ${
                                isSorted || isFiltered ? styles.thActiveRule : ""
                              } ${isMenuOpen ? styles.thMenuOpen : ""}`}
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
                                  <span className={styles.thTitleText}>
                                    {col}
                                  </span>
                                </div>

                                {/* IN-COLUMN CONTROLS: SORT A-Z, WRAP TEXT, FILTER STUDIO, REORDER < > */}
                                <div className={styles.thActionCluster}>
                                  {/* 1. Sort A-Z / Z-A Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleQuickSort(col);
                                    }}
                                    className={`${styles.thHeaderIconBtn} ${
                                      isSorted
                                        ? styles.thHeaderIconBtnActive
                                        : ""
                                    }`}
                                    title={
                                      isSorted
                                        ? `Tri actif (${sortConfig?.mode}). Cliquer pour inverser.`
                                        : "Trier A → Z / Z → A"
                                    }
                                  >
                                    {isSorted && sortConfig?.mode === "DESC" ? (
                                      <ArrowDownZA size={13} />
                                    ) : (
                                      <ArrowUpAZ size={13} />
                                    )}
                                  </button>

                                  {/* 2. Wrap / Auto-Fit Text Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleColumnWrap(col);
                                    }}
                                    className={`${styles.thHeaderIconBtn} ${
                                      isWrapped
                                        ? styles.thHeaderIconBtnActive
                                        : ""
                                    }`}
                                    title={
                                      isWrapped
                                        ? "Mode Lecture Intégrale actif (Cliquer pour compacter)"
                                        : "Adapter la colonne pour afficher tout le texte sans défiler"
                                    }
                                  >
                                    <AlignLeft size={13} />
                                  </button>

                                  {/* 3. In-Column Filter & Advanced Sort Popover Trigger */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuCol(isMenuOpen ? null : col);
                                    }}
                                    className={`${styles.thHeaderIconBtn} ${
                                      isFiltered || isMenuOpen
                                        ? styles.thHeaderIconBtnActive
                                        : ""
                                    }`}
                                    title="Filtres et tris avancés de cette colonne"
                                  >
                                    <Filter size={12} />
                                  </button>

                                  {/* 4. Quick Reorder < > */}
                                  <div className={styles.thReorderControls}>
                                    <button
                                      type="button"
                                      disabled={colIdx === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveColumnStep(col, "left");
                                      }}
                                      className={styles.thMoveBtn}
                                      title="Déplacer à gauche"
                                    >
                                      <ChevronLeft size={12} />
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
                                      title="Déplacer à droite"
                                    >
                                      <ChevronRight size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Floating In-Column Studio Popover */}
                              {renderColumnPopover(col, col)}
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

                            {/* DYNAMIC CELLS WITH AUTO-WRAP & EXPANDABLE BENTO BOXES */}
                            {visibleOrderedCols.map((col: string) => {
                              const isEditable = isEditableColumn(col);
                              const cellKey = `${task.id}_${col}`;
                              const isColWrapped =
                                globalWrap ||
                                wrappedColumns.includes(col) ||
                                expandedCells[cellKey];
                              const isColActiveRule =
                                sortConfig?.col === col ||
                                Boolean(colFilters[col]);

                              if (isEditable) {
                                const currentVal =
                                  draftEdits[cellKey] !== undefined
                                    ? draftEdits[cellKey]
                                    : String(dyn[col] ?? "");
                                const useMultiline =
                                  isColWrapped || currentVal.length > 42;

                                return (
                                  <td
                                    key={col}
                                    className={`${styles.tdEditableCell} ${
                                      useMultiline
                                        ? styles.tdWrappedCell
                                        : ""
                                    } ${
                                      dragOverCol === col
                                        ? styles.tdDragTargetCol
                                        : ""
                                    }`}
                                  >
                                    <div className={styles.pilotInputWrapper}>
                                      {useMultiline ? (
                                        <textarea
                                          rows={Math.min(
                                            5,
                                            Math.max(
                                              2,
                                              Math.ceil(currentVal.length / 38)
                                            )
                                          )}
                                          disabled={lockedByAdmin}
                                          className={`${styles.pilotTextarea} ${
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
                                              draftEdits[cellKey] !==
                                                undefined &&
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
                                            if (
                                              e.key === "Enter" &&
                                              !e.shiftKey
                                            ) {
                                              e.preventDefault();
                                              (
                                                e.target as HTMLTextAreaElement
                                              ).blur();
                                            }
                                          }}
                                        />
                                      ) : (
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
                                              draftEdits[cellKey] !==
                                                undefined &&
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
                                      )}

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

                              // LOCKED EXCEL CELL (Click to expand long text or controlled by column wrap)
                              const rawText =
                                dyn[col] !== undefined && dyn[col] !== ""
                                  ? String(dyn[col])
                                  : "";
                              const isLongText = rawText.length > 36;

                              return (
                                <td
                                  key={col}
                                  onClick={() => {
                                    if (isLongText) toggleCellExpand(cellKey);
                                  }}
                                  className={`${styles.tdCell} ${
                                    isColWrapped ? styles.tdWrappedCell : ""
                                  } ${
                                    isLongText ? styles.tdExpandableCursor : ""
                                  } ${
                                    isColActiveRule
                                      ? styles.tdActiveRuleHighlight
                                      : ""
                                  } ${
                                    dragOverCol === col
                                      ? styles.tdDragTargetCol
                                      : ""
                                  }`}
                                  title={
                                    isLongText && !isColWrapped
                                      ? `${rawText}\n\n(Cliquez pour adapter et tout afficher)`
                                      : rawText
                                  }
                                >
                                  {rawText ? (
                                    <div
                                      className={
                                        isColWrapped
                                          ? styles.wrappedBentoContent
                                          : styles.compactCellContent
                                      }
                                    >
                                      <span className={styles.lockedValue}>
                                        {rawText}
                                      </span>
                                      {isLongText && !isColWrapped && (
                                        <span
                                          className={styles.expandCellBadge}
                                          title="Cliquer pour tout lire"
                                        >
                                          <Maximize2 size={10} />
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className={styles.emptyDash}>—</span>
                                  )}
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
                      Utilisez les icônes <strong>A→Z</strong>,{" "}
                      <strong>Filtre</strong> et <strong>Adapter Texte</strong>{" "}
                      dans chaque colonne, ou cliquez directement sur une case
                      longue pour tout afficher sans défiler.
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