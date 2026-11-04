"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef, useDeferredValue, startTransition } from "react";
import dynamic from "next/dynamic";
import {
  Activity, ListChecks, Lock, Edit3, CheckCircle2, CircleDot, FileSpreadsheet, Info, GripVertical, ChevronLeft,
  ChevronRight, SlidersHorizontal, RotateCcw, Eye, EyeOff, ArrowUpToLine, X, ArrowUpAZ, ArrowDownZA, ArrowUpDown,
  AlignLeft, Filter, FilterX, BookmarkCheck, Scale, Layers, ChevronDown, Hourglass, Rows3, Rows4, Loader2,
} from "lucide-react";
import { toast } from "@/components/ui/Toaster";

import BoardHeader, { BoardStats } from "./components/BoardHeader";
import BoardActions from "./components/BoardActions";
import ColumnFilterPanel, { ColumnFilterRule, EMPTY_RULE, SortMode } from "./components/ColumnFilterPanel";
import DecisionLibraryModal from "./components/DecisionLibraryModal";
import EpsCompareModal from "./components/EpsCompareModal";
import CellDecisionPicker from "./components/CellDecisionPicker";
import BoardRow from "./components/BoardRow";
import FloatingLayer from "./ui/FloatingLayer";
import { LuxeOption } from "./ui/LuxeDropdown";
import {
  universalCopyToClipboard, extractTaskEPS, isTaskLockedByAdmin, isTaskPending, STATUS_LABELS, EMPTY_TOKEN,
  DEFAULT_DECISIONS, DecisionChoice, makeId, readStorage, writeStorage,
} from "./lib/boardUtils";
import styles from "./PilotBoard.module.css";

// Kept for backward compatibility (other files may import them from this page)
export { universalCopyToClipboard, extractTaskEPS, isTaskLockedByAdmin };

const RoyalBackground = dynamic(() => import("./ux/RoyalBackground"), { ssr: false });

const API_URL = "/api";
const DECISIONS_KEY = "kyntus_decision_library_v1";
const PENDING_ONLY_KEY = "kyntus_filter_pending_only";
const DENSITY_KEY = "kyntus_board_density";
const ROW_CHUNK = 80; // rows rendered per chunk (infinite scroll inside the table)

type DropSide = "before" | "after";
const buildDefaultDecisions = (): DecisionChoice[] => DEFAULT_DECISIONS.map((label) => ({ id: makeId(), label }));
const cmpText = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

/** Stable function identity that always calls the latest closure (keeps memo rows from re-rendering). */
function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback(((...args: any[]) => ref.current(...args)) as T, []);
}

export default function PilotBoard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);

  // Toolbar filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterColumn, setFilterColumn] = useState("ALL");
  const [columnExactValue, setColumnExactValue] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Editable cells (drafts live inside each cell → no full-table re-render while typing)
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Columns: order / visibility / drag & drop
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [draggedCol, setDraggedCol] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ col: string; side: DropSide } | null>(null);
  const dropTargetRef = useRef<{ col: string; side: DropSide } | null>(null);
  const [armedDragCol, setArmedDragCol] = useState<string | null>(null);
  const [isColStudioOpen, setIsColStudioOpen] = useState(false);
  const colStudioBtnRef = useRef<HTMLButtonElement>(null);

  // In-column sort & filters (multi columns, multi values)
  const [sortConfig, setSortConfig] = useState<{ col: string; mode: SortMode } | null>(null);
  const [colFilters, setColFilters] = useState<Record<string, ColumnFilterRule>>({});
  const [openMenu, setOpenMenu] = useState<{ col: string; label: string; anchor: HTMLElement } | null>(null);
  const [pendingOnly, setPendingOnly] = useState(true);

  // Text wrap
  const [wrappedColumns, setWrappedColumns] = useState<string[]>([]);
  const [globalWrap, setGlobalWrap] = useState(false);
  const [expandedCells, setExpandedCells] = useState<Record<number, Record<string, boolean>>>({});
  const [density, setDensity] = useState<"comfort" | "compact">("comfort");
  const [renderLimit, setRenderLimit] = useState(ROW_CHUNK);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const deferredSearch = useDeferredValue(searchQuery);

  // Decision library + comparator
  const [decisions, setDecisions] = useState<DecisionChoice[]>([]);
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [decisionDefaultCol, setDecisionDefaultCol] = useState<string | undefined>(undefined);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [cellPicker, setCellPicker] = useState<{ taskId: number; col: string; anchor: HTMLElement } | null>(null);

  // Sticky offsets measured from the real header cells
  const thCheckRef = useRef<HTMLTableCellElement>(null);
  const thEpsRef = useRef<HTMLTableCellElement>(null);
  const [stickyOffsets, setStickyOffsets] = useState({ eps: 52, status: 282 });

  const closeMenu = useCallback(() => setOpenMenu(null), []);
  const closeCellPicker = useCallback(() => setCellPicker(null), []);

  // ========================================================================
  // 1. INITIAL LOAD
  // ========================================================================
  useEffect(() => {
    const saved = readStorage<DecisionChoice[] | null>(DECISIONS_KEY, null);
    setDecisions(Array.isArray(saved) && saved.length > 0 ? saved : buildDefaultDecisions());
    setPendingOnly(readStorage<boolean>(PENDING_ONLY_KEY, true));
    setDensity(readStorage<"comfort" | "compact">(DENSITY_KEY, "comfort"));

    const stored = localStorage.getItem("kyntus_user");
    if (!stored) return;
    try {
      const currentUser = JSON.parse(stored);
      setUser(currentUser);
      if (currentUser?.id) {
        fetch(`${API_URL}/templates?userId=${currentUser.id}`)
          .then((res) => res.json())
          .then((data) => {
            const list = Array.isArray(data) ? data : [];
            setTemplates(list);
            if (list.length > 0) setSelectedTemplate((prev) => prev || String(list[0].id));
          })
          .catch((err) => {
            console.error("Connection Error:", err);
            toast({ message: "ERREUR SYNCHRONISATION SERVEUR", type: "error" });
          });
      }
    } catch (e) {
      console.error("Invalid user in localStorage", e);
    }
  }, []);

  const updateDecisions = (next: DecisionChoice[]) => {
    setDecisions(next);
    writeStorage(DECISIONS_KEY, next);
  };

  const resetDecisions = () => {
    updateDecisions(buildDefaultDecisions());
    toast({ message: "BIBLIOTHÈQUE RESTAURÉE PAR DÉFAUT", type: "success" });
  };

  const toggleDensity = () =>
    setDensity((d) => {
      const next = d === "compact" ? "comfort" : "compact";
      writeStorage(DENSITY_KEY, next);
      return next;
    });

  const togglePendingOnly = () => {
    setPendingOnly((prev) => {
      writeStorage(PENDING_ONLY_KEY, !prev);
      return !prev;
    });
  };

  // ========================================================================
  // 2. DATA
  // ========================================================================
  const refreshTasks = () => {
    if (!user || !selectedTemplate) return;
    setLoading(true);
    setSelectedTasks([]);
    fetch(`${API_URL}/tasks?assigneeId=${user.id}&templateId=${selectedTemplate}`)
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((e) => console.error("Fetch Tasks Error:", e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshTasks();
    setColFilters({});
    setSortConfig(null);
    setOpenMenu(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedTemplate]);

  // ========================================================================
  // 3. COLUMNS
  // ========================================================================
  const allowedFields: string[] = useMemo(() => {
    const tmpl = templates.find((t) => t.id?.toString() === selectedTemplate);
    if (!tmpl || !Array.isArray(tmpl.fields)) return [];
    return tmpl.fields.map((f: any) => (typeof f === "string" ? f : f?.name)).filter(Boolean);
  }, [selectedTemplate, templates]);

  const editableLowerSet = useMemo(() => new Set(allowedFields.map((f) => f.toLowerCase())), [allowedFields]);
  const isEditableColumn = useCallback((c: string) => editableLowerSet.has(c.toLowerCase()), [editableLowerSet]);

  const defaultOrderedCols = useMemo(() => {
    const cols = new Set<string>(allowedFields);
    tasks.forEach((t) => t.dynamicData && Object.keys(t.dynamicData).forEach((k) => cols.add(k)));
    return Array.from(cols);
  }, [tasks, allowedFields]);

  useEffect(() => {
    if (!selectedTemplate || defaultOrderedCols.length === 0) {
      setColumnOrder(defaultOrderedCols);
      return;
    }
    const hidden = readStorage<string[] | null>(`kyntus_col_hidden_${selectedTemplate}`, null);
    const wrap = readStorage<string[] | null>(`kyntus_col_wrap_${selectedTemplate}`, null);
    const order = readStorage<string[] | null>(`kyntus_col_order_${selectedTemplate}`, null);
    setHiddenColumns(Array.isArray(hidden) ? hidden : []);
    setWrappedColumns(Array.isArray(wrap) ? wrap : allowedFields);
    if (Array.isArray(order) && order.length > 0) {
      const existing = new Set(defaultOrderedCols);
      const valid = order.filter((c) => existing.has(c));
      const validSet = new Set(valid);
      setColumnOrder([...valid, ...defaultOrderedCols.filter((c) => !validSet.has(c))]);
    } else {
      setColumnOrder(defaultOrderedCols);
    }
  }, [selectedTemplate, defaultOrderedCols, allowedFields]);

  const saveColumnOrder = (next: string[]) => {
    setColumnOrder(next);
    if (selectedTemplate) writeStorage(`kyntus_col_order_${selectedTemplate}`, next);
  };

  const toggleInList = (setter: React.Dispatch<React.SetStateAction<string[]>>, key: string, col: string) =>
    setter((prev) => {
      const next = prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col];
      if (selectedTemplate) writeStorage(`${key}_${selectedTemplate}`, next);
      return next;
    });
  const toggleColumnVisibility = (col: string) => toggleInList(setHiddenColumns, "kyntus_col_hidden", col);
  const toggleColumnWrap = (col: string) => toggleInList(setWrappedColumns, "kyntus_col_wrap", col);

  const handleResetColumnLayout = () => {
    setColumnOrder(defaultOrderedCols);
    setHiddenColumns([]);
    setWrappedColumns(allowedFields);
    setGlobalWrap(false);
    if (selectedTemplate) {
      ["order", "hidden", "wrap"].forEach((k) => localStorage.removeItem(`kyntus_col_${k}_${selectedTemplate}`));
    }
    toast({ message: "ORDRE ET AFFICHAGE DES COLONNES RÉINITIALISÉS", type: "success" });
  };

  const moveColumnStep = (col: string, direction: "left" | "right") => {
    const idx = columnOrder.indexOf(col);
    const target = direction === "left" ? idx - 1 : idx + 1;
    if (idx === -1 || target < 0 || target >= columnOrder.length) return;
    const next = [...columnOrder];
    [next[idx], next[target]] = [next[target], next[idx]];
    saveColumnOrder(next);
  };

  const pinColumnFirst = (col: string) => {
    saveColumnOrder([col, ...columnOrder.filter((c) => c !== col)]);
    toast({ message: `COLONNE [${col.toUpperCase()}] PLACÉE EN TÊTE`, type: "success" });
  };

  const visibleOrderedCols = useMemo(
    () => columnOrder.filter((c) => !hiddenColumns.includes(c)),
    [columnOrder, hiddenColumns]
  );

  // ------------------------------------------------------------------------
  // DRAG & DROP (only from the grip, light ghost, before/after indicator)
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!armedDragCol) return;
    const disarm = () => !draggedCol && setArmedDragCol(null);
    window.addEventListener("mouseup", disarm);
    return () => window.removeEventListener("mouseup", disarm);
  }, [armedDragCol, draggedCol]);

  const handleColDragStart = (e: React.DragEvent, col: string) => {
    setDraggedCol(col);
    setOpenMenu(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", col);
    const ghost = document.createElement("div");
    ghost.textContent = col;
    ghost.style.cssText =
      "position:fixed;top:-1000px;left:-1000px;padding:9px 15px;border-radius:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);" +
      "color:#fff;font:800 12px Inter,system-ui,sans-serif;letter-spacing:.4px;text-transform:uppercase;" +
      "box-shadow:0 14px 30px rgba(29,78,216,.4);white-space:nowrap;";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 18);
    setTimeout(() => ghost.remove(), 0);
  };

  const handleColDragOver = (e: React.DragEvent, targetCol: string, axis: "x" | "y" = "x") => {
    if (!draggedCol) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedCol === targetCol) {
      if (dropTargetRef.current) {
        dropTargetRef.current = null;
        setDropTarget(null);
      }
      return;
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const before = axis === "x" ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
    const side: DropSide = before ? "before" : "after";
    const prev = dropTargetRef.current;
    if (!prev || prev.col !== targetCol || prev.side !== side) {
      dropTargetRef.current = { col: targetCol, side };
      setDropTarget({ col: targetCol, side });
    }
  };

  const resetDrag = () => {
    setDraggedCol(null);
    setArmedDragCol(null);
    dropTargetRef.current = null;
    setDropTarget(null);
  };

  const handleColDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    const source = draggedCol || e.dataTransfer.getData("text/plain");
    const side = dropTargetRef.current?.side || "before";
    resetDrag();
    if (!source || source === targetCol) return;
    const next = columnOrder.filter((c) => c !== source);
    const idx = next.indexOf(targetCol);
    if (idx === -1) return;
    next.splice(side === "after" ? idx + 1 : idx, 0, source);
    saveColumnOrder(next);
  };

  // Sticky offsets
  useEffect(() => {
    const check = thCheckRef.current;
    const eps = thEpsRef.current;
    if (!check || !eps) return;
    const measure = () => {
      const c = check.getBoundingClientRect().width;
      const e = eps.getBoundingClientRect().width;
      setStickyOffsets((p) =>
        Math.abs(p.eps - c) < 0.5 && Math.abs(p.status - (c + e)) < 0.5 ? p : { eps: c, status: c + e }
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(check);
    ro.observe(eps);
    return () => ro.disconnect();
  }, [loading, tasks.length, selectedTemplate]);

  // ========================================================================
  // 4. CELL VALUES + FILTER ENGINE
  // ========================================================================
  const getTaskCellValue = useCallback(
    (task: any, colKey: string): string => {
      if (colKey === "__EPS__" || colKey === "EPS_ONLY") return extractTaskEPS(task, allowedFields);
      if (colKey === "__STATUS__") return isTaskLockedByAdmin(task) ? "VALIDATED" : String(task.status || "A_FAIRE");
      return String(task.dynamicData?.[colKey] ?? "").trim();
    },
    [allowedFields]
  );

  const colDisplayName = (key: string) => (key === "__EPS__" ? "EPS" : key === "__STATUS__" ? "STATUT" : key);

  const toggleQuickSort = (colKey: string) =>
    setSortConfig((prev) => {
      if (!prev || prev.col !== colKey) return { col: colKey, mode: "ASC" };
      if (prev.mode === "ASC") return { col: colKey, mode: "DESC" };
      return null;
    });

  const updateColFilterRule = (colKey: string, patch: Partial<ColumnFilterRule>) =>
    setColFilters((prev) => {
      const updated = { ...(prev[colKey] || EMPTY_RULE), ...patch };
      const isDefault = updated.mode === "CONTAINS" && !updated.text.trim() && updated.selectedValues.length === 0;
      const copy = { ...prev };
      if (isDefault) delete copy[colKey];
      else copy[colKey] = updated;
      return copy;
    });

  const clearSingleColFilter = (colKey: string) =>
    setColFilters((prev) => {
      const copy = { ...prev };
      delete copy[colKey];
      return copy;
    });

  const matchesRule = (cellVal: string, rule: ColumnFilterRule): boolean => {
    const lower = cellVal.toLowerCase();
    if (rule.mode === "EMPTY" && cellVal !== "") return false;
    if (rule.mode === "NOT_EMPTY" && cellVal === "") return false;
    const q = rule.text.trim().toLowerCase();
    if (q && rule.mode === "CONTAINS" && !lower.includes(q)) return false;
    if (q && rule.mode === "NOT_CONTAINS" && lower.includes(q)) return false;
    if (rule.selectedValues.length > 0 && !rule.selectedValues.includes(cellVal === "" ? EMPTY_TOKEN : cellVal)) {
      return false;
    }
    return true;
  };

  const hasColFilters = Object.keys(colFilters).length > 0;
  // "À traiter uniquement": active when column filters exist and no explicit status was chosen
  const pendingRuleActive = pendingOnly && hasColFilters && statusFilter === "ALL";

  /** skipCol: ignore that column's own rule (cascading value lists) */
  const taskPassesFilters = useCallback(
    (task: any, skipCol?: string): boolean => {
      if (statusFilter !== "ALL") {
        if (statusFilter === "VALIDATED") {
          if (!isTaskLockedByAdmin(task)) return false;
        } else if (isTaskLockedByAdmin(task) || (task.status || "A_FAIRE") !== statusFilter) {
          return false;
        }
      }
      if (pendingRuleActive && !isTaskPending(task)) return false;

      const eps = extractTaskEPS(task, allowedFields);
      const dyn = task.dynamicData || {};

      if (filterColumn !== "ALL" && columnExactValue !== "ALL") {
        const cell = filterColumn === "EPS_ONLY" ? eps : String(dyn[filterColumn] ?? "").trim();
        if (columnExactValue === "__EMPTY__" ? cell !== "" : cell !== columnExactValue) return false;
      }

      for (const [colKey, rule] of Object.entries(colFilters)) {
        if (colKey !== skipCol && !matchesRule(getTaskCellValue(task, colKey), rule)) return false;
      }

      const q = deferredSearch.trim().toLowerCase();
      if (!q) return true;
      if (filterColumn === "EPS_ONLY") return eps.toLowerCase().includes(q);
      if (filterColumn !== "ALL") return String(dyn[filterColumn] ?? "").toLowerCase().includes(q);
      return eps.toLowerCase().includes(q) || Object.values(dyn).some((v) => String(v ?? "").toLowerCase().includes(q));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusFilter, pendingRuleActive, allowedFields, filterColumn, columnExactValue, colFilters, getTaskCellValue, deferredSearch]
  );

  // Values of the opened column: counts only what is still to treat (if pendingOnly)
  const openColDistinct = useMemo(() => {
    const counts = new Map<string, number>();
    let pendingCount = 0;
    if (!openMenu) return { values: [] as [string, number][], pendingCount };
    tasks.forEach((t) => {
      if (pendingOnly && statusFilter === "ALL" && !isTaskPending(t)) return;
      if (!taskPassesFilters(t, openMenu.col)) return;
      pendingCount++;
      const val = getTaskCellValue(t, openMenu.col);
      const key = val === "" ? EMPTY_TOKEN : val;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    (colFilters[openMenu.col]?.selectedValues || []).forEach((v) => !counts.has(v) && counts.set(v, 0));
    const values = Array.from(counts.entries()).sort((a, b) =>
      a[0] === EMPTY_TOKEN ? -1 : b[0] === EMPTY_TOKEN ? 1 : cmpText(a[0], b[0])
    );
    return { values, pendingCount };
  }, [openMenu, tasks, pendingOnly, statusFilter, taskPassesFilters, getTaskCellValue, colFilters]);

  // Toolbar cascading values
  const columnDistinctOptions = useMemo<LuxeOption[]>(() => {
    if (filterColumn === "ALL") return [];
    const counts = new Map<string, number>();
    let empty = 0;
    tasks.forEach((t) => {
      const v = getTaskCellValue(t, filterColumn);
      if (!v) empty++;
      else counts.set(v, (counts.get(v) || 0) + 1);
    });
    const opts: LuxeOption[] = [
      { value: "ALL", label: `Toutes les valeurs (${tasks.length})`, badge: tasks.length, icon: <Layers size={14} /> },
    ];
    if (empty > 0) opts.push({ value: "__EMPTY__", label: "[Vide / Non renseigné]", badge: empty, icon: <CircleDot size={14} /> });
    Array.from(counts.entries())
      .sort((a, b) => cmpText(a[0], b[0]))
      .forEach(([v, c]) => opts.push({ value: v, label: v, badge: c }));
    return opts;
  }, [tasks, filterColumn, getTaskCellValue]);

  const filteredTasks = useMemo(() => {
    const matching = tasks.filter((t) => taskPassesFilters(t));
    if (!sortConfig) return matching;
    const { col, mode } = sortConfig;
    return [...matching].sort((a, b) => {
      const A = getTaskCellValue(a, col);
      const B = getTaskCellValue(b, col);
      const eA = A === "";
      const eB = B === "";
      if (mode === "EMPTY_FIRST") return eA !== eB ? (eA ? -1 : 1) : cmpText(A, B);
      if (mode === "FILLED_FIRST") return eA !== eB ? (eA ? 1 : -1) : cmpText(A, B);
      if (mode === "LEN_DESC") return B.length !== A.length ? B.length - A.length : cmpText(A, B);
      if (eA !== eB) return eA ? 1 : -1;
      return mode === "ASC" ? cmpText(A, B) : -cmpText(A, B);
    });
  }, [tasks, taskPassesFilters, sortConfig, getTaskCellValue]);

  const stats: BoardStats = useMemo(() => {
    const s = { total: tasks.length, todo: 0, progress: 0, done: 0, validated: 0 };
    tasks.forEach((t) => {
      if (isTaskLockedByAdmin(t)) s.validated++;
      else if (t.status === "DONE") s.done++;
      else if (t.status === "EN_COURS") s.progress++;
      else s.todo++;
    });
    return s;
  }, [tasks]);

  const handleResetFilters = () => {
    setFilterColumn("ALL");
    setColumnExactValue("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
    setColFilters({});
    setSortConfig(null);
  };

  // ========================================================================
  // 5. MISSION HANDLERS
  // ========================================================================
  const patchTask = (id: number, path: "data" | "status", body: object) =>
    fetch(`${API_URL}/tasks/${id}/${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const unlockedIdsOf = (ids: number[]) =>
    ids.filter((id) => {
      const t = tasks.find((x) => x.id === id);
      return t && !isTaskLockedByAdmin(t);
    });

  const handleUpdateData = async (taskId: number, key: string, value: any) => {
    if (isTaskLockedByAdmin(tasks.find((t) => t.id === taskId))) {
      return toast({ message: "VALIDÉ PAR L'ADMIN : Modification impossible.", type: "error" });
    }
    const cellKey = `${taskId}_${key}`;
    setSavingCell(cellKey);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, dynamicData: { ...t.dynamicData, [key]: value } } : t)));
    try {
      const res = await patchTask(taskId, "data", { key, value });
      if (res.ok) toast({ message: `Analyse enregistrée (${key})`, type: "success" });
    } catch (err) {
      console.error(err);
      toast({ message: "Erreur de sauvegarde", type: "error" });
    } finally {
      setTimeout(() => setSavingCell(null), 500);
    }
  };

  const handleStatusToggle = async (task: any) => {
    if (isTaskLockedByAdmin(task)) {
      return toast({ message: "Cet EPS a été validé finalement par l'Admin dans le Kanban.", type: "error" });
    }
    const cur = task.status || "A_FAIRE";
    const newStatus = cur === "EN_COURS" ? "DONE" : "EN_COURS";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      const res = await patchTask(task.id, "status", { status: newStatus });
      if (!res.ok) throw new Error("Server error");
      if (newStatus === "DONE") {
        toast({
          message: pendingRuleActive
            ? `${extractTaskEPS(task, allowedFields)} TERMINÉ — retiré de la liste filtrée`
            : "TERMINÉ (En attente de validation finale Admin)",
          type: "success",
        });
      }
    } catch (e) {
      refreshTasks();
    }
  };

  const handleBulkEdit = async (columnKey: string, value: string) => {
    if (selectedTasks.length === 0) return toast({ message: "SÉLECTIONNEZ DES LIGNES D'ABORD", type: "error" });
    if (!columnKey) return toast({ message: "CHOISISSEZ UNE COLONNE D'ANALYSE", type: "error" });
    const ids = unlockedIdsOf(selectedTasks);
    if (ids.length === 0) return toast({ message: "Les lignes sélectionnées sont déjà validées par l'Admin.", type: "error" });

    setTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, dynamicData: { ...t.dynamicData, [columnKey]: value } } : t)));
    try {
      await Promise.all(ids.map((id) => patchTask(id, "data", { key: columnKey, value })));
      toast({ message: `${ids.length} LIGNE(S) MISE(S) À JOUR AVEC SUCCÈS`, type: "success" });
      setSelectedTasks([]);
    } catch (e) {
      refreshTasks();
    }
  };

  const handleCoachSync = async () => {
    if (selectedTasks.length === 0) return toast({ message: "SÉLECTIONNEZ DES LIGNES D'ABORD", type: "error" });
    const ids = unlockedIdsOf(selectedTasks);
    setTasks((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, status: "DONE" } : t)));
    try {
      await Promise.all(ids.map((id) => patchTask(id, "status", { status: "DONE" })));
      toast({ message: `${ids.length} TÂCHES MARQUÉES TERMINÉES`, type: "success" });
      setSelectedTasks([]);
    } catch (e) {
      refreshTasks();
    }
  };

  const handlePurgeDoublons = async () => {
    if (!window.confirm("Voulez-vous vraiment purger les doublons ?")) return;
    try {
      const res = await fetch(`${API_URL}/pilot-records/deduplicate`, { method: "DELETE" });
      if (res.ok) {
        toast({ message: "DOUBLONS PURGÉS AVEC SUCCÈS", type: "success" });
        refreshTasks();
      }
    } catch (e) {
      toast({ message: "ERREUR LORS DE LA PURGE", type: "error" });
    }
  };

  const handleCopyColumnValues = async (targetCol?: string) => {
    const col = targetCol && targetCol !== "ALL" ? targetCol : filterColumn !== "ALL" ? filterColumn : "EPS_ONLY";
    const source = selectedTasks.length > 0 ? tasks.filter((t) => selectedTasks.includes(t.id)) : filteredTasks;
    if (source.length === 0) return toast({ message: "AUCUNE LIGNE À COPIER", type: "error" });
    const values = source.map((t) => getTaskCellValue(t, col)).filter((v) => v !== "");
    const label = col === "EPS_ONLY" ? "EPS" : col;
    if (values.length === 0) return toast({ message: `AUCUNE VALEUR TROUVÉE DANS LA COLONNE [${label}]`, type: "error" });
    const ok = await universalCopyToClipboard(values.join("\n"));
    toast({
      message: ok ? `${values.length} VALEUR(S) [${label}] COPIÉE(S)` : "Erreur d'accès au presse-papiers",
      type: ok ? "success" : "error",
    });
  };

  const handleCopySingleEPS = async (taskId: number, eps: string) => {
    if (await universalCopyToClipboard(eps)) {
      setCopiedId(taskId);
      toast({ message: `${eps} copié dans le presse-papiers`, type: "success" });
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handlePickForCell = (taskId: number, col: string, value: string) => {
    handleUpdateData(taskId, col, value);
    setCellPicker(null);
  };

  const openDecisionLibrary = (col?: string) => {
    setDecisionDefaultCol(col);
    setIsDecisionOpen(true);
  };

  const allFilteredSelected = useMemo(() => {
    if (filteredTasks.length === 0) return false;
    const sel = new Set(selectedTasks);
    return filteredTasks.every((t) => sel.has(t.id));
  }, [filteredTasks, selectedTasks]);
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const ids = new Set(filteredTasks.map((t) => t.id));
      setSelectedTasks((prev) => prev.filter((id) => !ids.has(id)));
    } else {
      setSelectedTasks(Array.from(new Set([...selectedTasks, ...filteredTasks.map((t) => t.id)])));
    }
  };
  const toggleSelectRow = (id: number) =>
    setSelectedTasks((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const unlockedSelectedCount = useMemo(() => unlockedIdsOf(selectedTasks).length, [selectedTasks, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const missionOptions: LuxeOption[] = templates.map((tpl: any) => ({
    value: tpl.id?.toString() || "",
    label: (tpl.name || "SANS NOM").toUpperCase(),
    badge: tpl.fields?.length ? `${tpl.fields.length} col.` : undefined,
  }));
  const missionName = templates.find((t) => t.id?.toString() === selectedTemplate)?.name || null;
  const activeColFilterKeys = Object.keys(colFilters);

  const describeRule = (r: ColumnFilterRule) =>
    [
      r.mode === "EMPTY" ? "vides" : "",
      r.mode === "NOT_EMPTY" ? "remplis" : "",
      r.text.trim() ? `${r.mode === "NOT_CONTAINS" ? "≠" : "∋"} "${r.text.trim()}"` : "",
      r.selectedValues.length ? `${r.selectedValues.length} valeur(s)` : "",
    ]
      .filter(Boolean)
      .join(" · ");

  const sortLabel: Record<SortMode, string> = {
    ASC: "A → Z",
    DESC: "Z → A",
    EMPTY_FIRST: "Vides en haut",
    FILLED_FIRST: "Remplis en haut",
    LEN_DESC: "Plus longs",
  };

  // Header actions (sort / wrap / filter / remove filter)
  const renderHeaderActions = (colKey: string, label: string, canWrap: boolean) => {
    const isSorted = sortConfig?.col === colKey;
    const isFiltered = Boolean(colFilters[colKey]);
    const isMenuOpen = openMenu?.col === colKey;
    const isWrapped = globalWrap || wrappedColumns.includes(colKey);
    const selCount = colFilters[colKey]?.selectedValues.length || 0;
    return (
      <div className={styles.thActionCluster} onMouseDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => toggleQuickSort(colKey)}
          className={`${styles.thIconBtn} ${isSorted ? styles.thIconBtnActive : ""}`}
          title={isSorted ? `Tri : ${sortLabel[sortConfig!.mode]}` : "Trier A → Z / Z → A"}
        >
          {isSorted && sortConfig?.mode === "DESC" ? <ArrowDownZA size={13} /> : <ArrowUpAZ size={13} />}
        </button>
        {canWrap && (
          <button
            type="button"
            onClick={() => toggleColumnWrap(colKey)}
            className={`${styles.thIconBtn} ${isWrapped ? styles.thIconBtnActive : ""}`}
            title={isWrapped ? "Texte complet (cliquer pour compacter)" : "Afficher tout le texte"}
          >
            <AlignLeft size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => setOpenMenu(isMenuOpen ? null : { col: colKey, label, anchor: e.currentTarget })}
          className={`${styles.thIconBtn} ${isFiltered || isMenuOpen ? styles.thIconBtnActive : ""}`}
          title="Filtrer / trier cette colonne"
        >
          <Filter size={12} />
          {selCount > 0 && <span className={styles.thFilterCount}>{selCount}</span>}
        </button>
        {isFiltered && (
          <button
            type="button"
            onClick={() => clearSingleColFilter(colKey)}
            className={`${styles.thIconBtn} ${styles.thIconBtnDanger}`}
            title="Supprimer le filtre de cette colonne"
          >
            <FilterX size={12} />
          </button>
        )}
      </div>
    );
  };

  // ========================================================================
  // ROW PERFORMANCE: stable handlers + memo inputs + progressive rendering
  // ========================================================================
  const wrappedSet = useMemo(() => new Set(wrappedColumns), [wrappedColumns]);
  const ruleColsKey = [sortConfig?.col || "", ...Object.keys(colFilters)].join("\u0001");
  const ruleCols = useMemo(() => new Set(ruleColsKey.split("\u0001").filter(Boolean)), [ruleColsKey]);
  const selectedSet = useMemo(() => new Set(selectedTasks), [selectedTasks]);

  const onRowToggleSelect = useStableCallback(toggleSelectRow);
  const onRowCopyEps = useStableCallback(handleCopySingleEPS);
  const onRowStatus = useStableCallback(handleStatusToggle);
  const onRowCommit = useStableCallback((taskId: number, col: string, value: string) => handleUpdateData(taskId, col, value));
  const onRowOpenPicker = useStableCallback((taskId: number, col: string, anchor: HTMLElement) =>
    setCellPicker((prev) => (prev?.taskId === taskId && prev?.col === col ? null : { taskId, col, anchor }))
  );
  const onRowToggleExpand = useStableCallback((taskId: number, col: string) =>
    setExpandedCells((prev) => ({ ...prev, [taskId]: { ...(prev[taskId] || {}), [col]: !prev[taskId]?.[col] } }))
  );

  // reset the rendered window when the filter set changes (not on simple edits)
  const filterSignature = `${selectedTemplate}|${statusFilter}|${deferredSearch}|${filterColumn}|${columnExactValue}|${pendingOnly}|${JSON.stringify(colFilters)}|${sortConfig?.col}|${sortConfig?.mode}`;
  useEffect(() => {
    setRenderLimit(ROW_CHUNK);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [filterSignature]);

  // load the next chunk when the sentinel row approaches the bottom of the table
  const hasMoreRows = filteredTasks.length > renderLimit;
  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasMoreRows) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && startTransition(() => setRenderLimit((l) => l + ROW_CHUNK)),
      { root, rootMargin: "0px 0px 700px 0px" }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [hasMoreRows, renderLimit, loading]);

  // header / sticky-column shadows on scroll (DOM attributes → zero React renders)
  const handleTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const y = el.scrollTop > 2 ? "1" : "0";
    const x = el.scrollLeft > 2 ? "1" : "0";
    if (el.dataset.sy !== y) el.dataset.sy = y;
    if (el.dataset.sx !== x) el.dataset.sx = x;
  }, []);

  const visibleRows = hasMoreRows ? filteredTasks.slice(0, renderLimit) : filteredTasks;

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className={styles.boardContainer}>
      <RoyalBackground />

      <div className={styles.glassOverlay}>
        <div className={styles.headerBento}>
          <BoardHeader
            user={user || { username: "PILOTE_KYNTUS" }}
            missionOptions={missionOptions}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            missionName={missionName}
            stats={stats}
            statusFilter={statusFilter}
            onStatusClick={setStatusFilter}
          />
        </div>

        <div className={styles.boardContent}>
          {/* COMMAND BAR */}
          <div className={styles.commandBar}>
            <div className={styles.commandGroup}>
              <button type="button" onClick={() => openDecisionLibrary()} className={`${styles.toolBtn} ${styles.toolBtnHero}`}>
                <BookmarkCheck size={15} />
                <span>Motifs Contester / Valider</span>
              </button>
              <button type="button" onClick={() => setIsCompareOpen(true)} className={styles.toolBtn}>
                <Scale size={15} />
                <span>Comparateur EPS</span>
              </button>
              <span className={styles.commandDivider} />
              <button
                type="button"
                onClick={togglePendingOnly}
                className={`${styles.toolBtn} ${pendingOnly ? styles.toolBtnActive : ""}`}
                title="Quand un filtre de colonne est actif, n'afficher que les EPS À faire / En cours"
              >
                <Hourglass size={14} />
                <span>Filtres : {pendingOnly ? "à traiter seulement" : "tout inclure"}</span>
              </button>
              <button
                type="button"
                onClick={() => setGlobalWrap((p) => !p)}
                className={`${styles.toolBtn} ${globalWrap ? styles.toolBtnActive : ""}`}
              >
                <AlignLeft size={14} />
                <span>{globalWrap ? "Texte complet : ON" : "Textes longs"}</span>
              </button>
              <button
                type="button"
                onClick={toggleDensity}
                className={`${styles.toolBtn} ${density === "compact" ? styles.toolBtnActive : ""}`}
                title="Densité des lignes"
              >
                {density === "compact" ? <Rows4 size={14} /> : <Rows3 size={14} />}
                <span>{density === "compact" ? "Compact" : "Confort"}</span>
              </button>
              <button
                ref={colStudioBtnRef}
                type="button"
                onClick={() => setIsColStudioOpen((p) => !p)}
                className={`${styles.toolBtn} ${isColStudioOpen ? styles.toolBtnActive : ""}`}
              >
                <SlidersHorizontal size={14} />
                <span>Colonnes {visibleOrderedCols.length}/{columnOrder.length}</span>
                <ChevronDown size={13} />
              </button>
            </div>
            <div className={styles.countBadge}>
              <ListChecks size={15} />
              <span>
                <b>{filteredTasks.length}</b> / {tasks.length} lignes
              </span>
            </div>
          </div>

          {/* COLUMN STUDIO (portal) */}
          <FloatingLayer anchor={colStudioBtnRef.current} open={isColStudioOpen} onClose={() => setIsColStudioOpen(false)} width={440} align="right">
            <div className={styles.colStudioPopover}>
              <div className={styles.colStudioHeader}>
                <div className={styles.colStudioTitle}>
                  <SlidersHorizontal size={15} />
                  <span>ORGANISER LES COLONNES</span>
                </div>
                <div className={styles.colStudioHeaderActions}>
                  <button type="button" onClick={handleResetColumnLayout} className={styles.colResetMiniBtn}>
                    <RotateCcw size={12} />
                    <span>DÉFAUT</span>
                  </button>
                  <button type="button" onClick={() => setIsColStudioOpen(false)} className={styles.colCloseMiniBtn}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className={styles.colStudioHint}>Glissez-déposez pour réordonner · œil pour masquer · texte complet.</div>
              <div className={styles.colStudioList}>
                {columnOrder.map((col, index) => {
                  const isHidden = hiddenColumns.includes(col);
                  const isDrop = dropTarget?.col === col;
                  return (
                    <div
                      key={col}
                      draggable
                      onDragStart={(e) => handleColDragStart(e, col)}
                      onDragOver={(e) => handleColDragOver(e, col, "y")}
                      onDrop={(e) => handleColDrop(e, col)}
                      onDragEnd={resetDrag}
                      className={[
                        styles.colStudioItem,
                        isEditableColumn(col) && styles.colStudioItemEditable,
                        isHidden && styles.colStudioItemHidden,
                        draggedCol === col && styles.colStudioItemDragging,
                        isDrop && dropTarget?.side === "before" && styles.dropLineTop,
                        isDrop && dropTarget?.side === "after" && styles.dropLineBottom,
                      ].filter(Boolean).join(" ")}
                    >
                      <div className={styles.colStudioItemLeft}>
                        <GripVertical size={14} className={styles.colGripIcon} />
                        <span className={styles.colIndexBadge}>#{index + 1}</span>
                        <span className={styles.colStudioName} title={col}>{col}</span>
                        {isEditableColumn(col) && <span className={styles.colEditableTag}>PILOTE</span>}
                      </div>
                      <div className={styles.colStudioItemRight}>
                        <button type="button" onClick={() => toggleColumnWrap(col)} className={`${styles.colIconBtn} ${wrappedColumns.includes(col) ? styles.colIconBtnActive : ""}`} title="Texte complet">
                          <AlignLeft size={13} />
                        </button>
                        <button type="button" onClick={() => pinColumnFirst(col)} disabled={index === 0} className={styles.colIconBtn} title="Placer en 1ère position">
                          <ArrowUpToLine size={13} />
                        </button>
                        <button type="button" onClick={() => moveColumnStep(col, "left")} disabled={index === 0} className={styles.colIconBtn} title="Monter">
                          <ChevronLeft size={14} />
                        </button>
                        <button type="button" onClick={() => moveColumnStep(col, "right")} disabled={index === columnOrder.length - 1} className={styles.colIconBtn} title="Descendre">
                          <ChevronRight size={14} />
                        </button>
                        <button type="button" onClick={() => toggleColumnVisibility(col)} className={`${styles.colIconBtn} ${isHidden ? styles.colIconBtnMuted : ""}`} title={isHidden ? "Afficher" : "Masquer"}>
                          {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </FloatingLayer>

          {/* TOOLBAR */}
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
              onOpenDecisions={openDecisionLibrary}
            />
          </div>

          {/* ACTIVE RULES */}
          {(sortConfig || activeColFilterKeys.length > 0) && (
            <div className={styles.activeRulesBar}>
              <span className={styles.activeRulesLabel}>
                <Filter size={13} />
                <span>FILTRES ACTIFS</span>
              </span>
              {pendingRuleActive && (
                <button type="button" className={styles.ruleChipPending} onClick={togglePendingOnly} title="Cliquer pour inclure aussi les terminés">
                  <Hourglass size={12} />
                  <span>À faire + En cours uniquement</span>
                  <X size={12} />
                </button>
              )}
              {sortConfig && (
                <div className={styles.ruleChipSort}>
                  <ArrowUpDown size={12} />
                  <span>
                    Tri {colDisplayName(sortConfig.col)} : <strong>{sortLabel[sortConfig.mode]}</strong>
                  </span>
                  <button type="button" onClick={() => setSortConfig(null)} className={styles.ruleChipRemove}>
                    <X size={12} />
                  </button>
                </div>
              )}
              {activeColFilterKeys.map((k) => (
                <div key={k} className={styles.ruleChipFilter}>
                  <Filter size={12} />
                  <button
                    type="button"
                    className={styles.ruleChipBody}
                    onClick={(e) => setOpenMenu({ col: k, label: colDisplayName(k), anchor: e.currentTarget })}
                    title="Modifier ce filtre"
                  >
                    <b>{colDisplayName(k)}</b> <span>{describeRule(colFilters[k])}</span>
                  </button>
                  <button type="button" onClick={() => clearSingleColFilter(k)} className={styles.ruleChipRemove} title="Supprimer ce filtre">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => { setSortConfig(null); setColFilters({}); }} className={styles.clearAllRulesBtn}>
                <FilterX size={13} />
                Tout effacer
              </button>
            </div>
          )}

          {/* GRID */}
          <div className={`${styles.bentoCard} ${styles.gridWrapper}`}>
            {!selectedTemplate ? (
              <div className={styles.emptyStateBox}>
                <div className={styles.emptyIconCircle}><FileSpreadsheet size={30} /></div>
                <h3>Aucune mission sélectionnée</h3>
                <p>Choisissez une mission dans le sélecteur en haut à droite pour charger vos lignes EPS.</p>
              </div>
            ) : loading ? (
              <div className={styles.emptyStateBox}>
                <div className={styles.emptyIconCircle}><Activity size={30} /></div>
                <h3>Synchronisation des données...</h3>
                <p>Chargement des interventions EPS et colonnes d&apos;analyse.</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className={styles.emptyStateBox}>
                <div className={styles.emptyIconCircle}><ListChecks size={30} /></div>
                <h3>Aucune ligne dans cette mission</h3>
                <p>Aucune tâche EPS ne vous est encore assignée pour cette mission.</p>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className={styles.tableScrollContainer} onScroll={handleTableScroll} data-sy="0" data-sx="0">
                  <table
                    className={`${styles.luxeTable} ${density === "compact" ? styles.densityCompact : ""}`}
                    style={{ "--sticky-eps-left": `${stickyOffsets.eps}px`, "--sticky-status-left": `${stickyOffsets.status}px` } as React.CSSProperties}
                  >
                    <thead>
                      <tr>
                        <th ref={thCheckRef} className={`${styles.th} ${styles.stickyColCheck}`}>
                          <input type="checkbox" className={styles.luxeCheckbox} checked={allFilteredSelected} onChange={toggleSelectAll} title="Tout sélectionner" />
                        </th>
                        <th ref={thEpsRef} className={`${styles.th} ${styles.stickyColEps} ${sortConfig?.col === "__EPS__" || colFilters.__EPS__ ? styles.thActiveRule : ""}`}>
                          <div className={styles.thInteractiveBar}>
                            <div className={styles.thContent}><span className={styles.thTitleText}>RÉFÉRENCE EPS</span></div>
                            {renderHeaderActions("__EPS__", "RÉFÉRENCE EPS", false)}
                          </div>
                        </th>
                        <th className={`${styles.th} ${styles.stickyColStatus} ${sortConfig?.col === "__STATUS__" || colFilters.__STATUS__ ? styles.thActiveRule : ""}`}>
                          <div className={styles.thInteractiveBar}>
                            <div className={styles.thContent}><span className={styles.thTitleText}>STATUT</span></div>
                            {renderHeaderActions("__STATUS__", "STATUT PILOTE / ADMIN", false)}
                          </div>
                        </th>

                        {visibleOrderedCols.map((col) => {
                          const isEditable = isEditableColumn(col);
                          const isDrop = dropTarget?.col === col;
                          return (
                            <th
                              key={col}
                              draggable={armedDragCol === col}
                              onDragStart={(e) => handleColDragStart(e, col)}
                              onDragOver={(e) => handleColDragOver(e, col, "x")}
                              onDrop={(e) => handleColDrop(e, col)}
                              onDragEnd={resetDrag}
                              className={[
                                styles.th,
                                isEditable && styles.thEditable,
                                (globalWrap || wrappedColumns.includes(col)) && styles.thWrappedMode,
                                draggedCol === col && styles.thDragging,
                                isDrop && dropTarget?.side === "before" && styles.dropLineLeft,
                                isDrop && dropTarget?.side === "after" && styles.dropLineRight,
                                (sortConfig?.col === col || colFilters[col]) && styles.thActiveRule,
                              ].filter(Boolean).join(" ")}
                            >
                              <div className={styles.thInteractiveBar}>
                                <div className={styles.thContent}>
                                  <span
                                    className={styles.thGripHandle}
                                    onMouseDown={() => setArmedDragCol(col)}
                                    onMouseUp={() => setArmedDragCol(null)}
                                    title="Glisser pour déplacer la colonne"
                                  >
                                    <GripVertical size={14} />
                                  </span>
                                  {isEditable ? <Edit3 size={13} className={styles.thTypeIcon} /> : <Lock size={11} className={styles.thTypeIcon} />}
                                  <span className={styles.thTitleText} title={col}>{col}</span>
                                </div>
                                {renderHeaderActions(col, col, true)}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTasks.length === 0 && (
                        <tr>
                          <td colSpan={visibleOrderedCols.length + 3} className={styles.noMatchCell}>
                            <div className={styles.noMatchBox}>
                              <CheckCircle2 size={22} />
                              <span>
                                {pendingRuleActive ? "Bravo — plus aucun EPS à traiter pour ces filtres." : "Aucune ligne ne correspond aux filtres."}
                              </span>
                              <button type="button" onClick={handleResetFilters} className={styles.noMatchBtn}>
                                <RotateCcw size={13} /> Réinitialiser les filtres
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {visibleRows.map((task) => {
                        const locked = isTaskLockedByAdmin(task);
                        return (
                          <BoardRow
                            key={task.id}
                            task={task}
                            epsCode={extractTaskEPS(task, allowedFields)}
                            locked={locked}
                            isSelected={selectedSet.has(task.id)}
                            cols={visibleOrderedCols}
                            isEditable={isEditableColumn}
                            globalWrap={globalWrap}
                            wrappedSet={wrappedSet}
                            ruleCols={ruleCols}
                            expanded={expandedCells[task.id]}
                            copied={copiedId === task.id}
                            savingCol={savingCell && savingCell.startsWith(`${task.id}_`) ? savingCell.slice(String(task.id).length + 1) : null}
                            dropCol={dropTarget?.col || null}
                            onToggleSelect={onRowToggleSelect}
                            onCopyEps={onRowCopyEps}
                            onStatus={onRowStatus}
                            onCommit={onRowCommit}
                            onOpenPicker={onRowOpenPicker}
                            onToggleExpand={onRowToggleExpand}
                          />
                        );
                      })}

                      {hasMoreRows && (
                        <tr ref={sentinelRef} className={styles.sentinelRow}>
                          <td colSpan={visibleOrderedCols.length + 3}>
                            <div className={styles.sentinelBox}>
                              <Loader2 size={15} className={styles.spinSlow} />
                              <span>
                                Chargement de la suite… <b>{filteredTasks.length - renderLimit}</b> ligne(s) restante(s)
                              </span>
                              <button type="button" className={styles.noMatchBtn} onClick={() => setRenderLimit(filteredTasks.length)}>
                                Tout afficher
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={styles.tableFooter}>
                  <span className={styles.footerNote}>
                    <Info size={15} />
                    <span>
                      <strong>Filtre</strong> par colonne (plusieurs valeurs, plusieurs colonnes) · <strong>⠿</strong> pour déplacer · icône motif dans une case.
                    </span>
                  </span>
                  <div className={styles.footerRight}>
                    <div className={styles.footerProgress} title="Avancement de la mission">
                      <i style={{ width: `${stats.total ? Math.round(((stats.done + stats.validated) / stats.total) * 100) : 0}%` }} />
                    </div>
                    <span className={styles.footerCount}>
                      {selectedTasks.length > 0 ? `${selectedTasks.length} ligne(s) cochée(s)` : `${filteredTasks.length} ligne(s) filtrée(s)`}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING LAYERS */}
      <FloatingLayer anchor={openMenu?.anchor || null} open={!!openMenu} onClose={closeMenu} width={350}>
        {openMenu && (
          <ColumnFilterPanel
            key={openMenu.col}
            label={openMenu.label}
            rule={colFilters[openMenu.col] || EMPTY_RULE}
            distinct={openColDistinct.values}
            sortMode={sortConfig?.col === openMenu.col ? sortConfig.mode : null}
            canWrap={openMenu.col !== "__EPS__" && openMenu.col !== "__STATUS__"}
            isWrapped={globalWrap || wrappedColumns.includes(openMenu.col)}
            valueLabel={openMenu.col === "__STATUS__" ? (v) => STATUS_LABELS[v] || v : undefined}
            onRuleChange={(patch) => updateColFilterRule(openMenu.col, patch)}
            onClearFilter={() => clearSingleColFilter(openMenu.col)}
            onSort={(mode) => setSortConfig(mode ? { col: openMenu.col, mode } : null)}
            onToggleWrap={() => toggleColumnWrap(openMenu.col)}
            onClose={closeMenu}
            pendingOnly={pendingOnly}
            onTogglePending={togglePendingOnly}
            pendingCount={openColDistinct.pendingCount}
          />
        )}
      </FloatingLayer>

      <FloatingLayer anchor={cellPicker?.anchor || null} open={!!cellPicker} onClose={closeCellPicker} width={380} align="right">
        {cellPicker &&
          (() => {
            const t = tasks.find((x) => x.id === cellPicker.taskId);
            if (!t) return null;
            return (
              <CellDecisionPicker
                column={cellPicker.col}
                eps={extractTaskEPS(t, allowedFields)}
                currentValue={getTaskCellValue(t, cellPicker.col)}
                choices={decisions}
                onPick={(v) => handlePickForCell(t.id, cellPicker.col, v)}
                onClear={() => handlePickForCell(t.id, cellPicker.col, "")}
                onManage={() => {
                  const c = cellPicker.col;
                  setCellPicker(null);
                  openDecisionLibrary(c);
                }}
                onClose={closeCellPicker}
              />
            );
          })()}
      </FloatingLayer>

      <DecisionLibraryModal
        open={isDecisionOpen}
        onClose={() => setIsDecisionOpen(false)}
        choices={decisions}
        onChoicesChange={updateDecisions}
        onResetDefaults={resetDecisions}
        editableColumns={allowedFields}
        defaultColumn={decisionDefaultCol}
        selectedCount={selectedTasks.length}
        unlockedSelectedCount={unlockedSelectedCount}
        onApply={(col, value) => handleBulkEdit(col, value)}
      />

      <EpsCompareModal
        open={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        tasks={filteredTasks}
        columns={visibleOrderedCols}
        getEps={(t) => extractTaskEPS(t, allowedFields)}
        getCellValue={getTaskCellValue}
      />
    </div>
  );
}