"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useDeferredValue, startTransition } from "react";
import {
  Activity, ListChecks, Lock, Edit3, Copy, Check, CheckCircle2, Clock, CircleDot, ShieldCheck, Layers, Pause, Play,
  Filter, FilterX, ArrowUpAZ, ArrowDownZA, ArrowUpDown, AlignLeft, X, Hourglass, RotateCcw, Zap, AlertTriangle, RefreshCw,
  Rows3, Rows4, Loader2,
} from "lucide-react";
import { toast } from "@/components/ui/Toaster";

// ♻️ Composants & helpers du board pilote (même rendu, mode spectateur)
import BoardActions from "../../../pilot/board/components/BoardActions";
import ColumnFilterPanel, { ColumnFilterRule, EMPTY_RULE, SortMode } from "../../../pilot/board/components/ColumnFilterPanel";
import { StatusPill, rowStatusOf } from "../../../pilot/board/components/BoardRow";
import FloatingLayer from "../../../pilot/board/ui/FloatingLayer";
import { LuxeOption } from "../../../pilot/board/ui/LuxeDropdown";
import {
  universalCopyToClipboard, extractTaskEPS, isTaskLockedByAdmin, isTaskPending, getDecisionKind,
  STATUS_LABELS, EMPTY_TOKEN, readStorage, writeStorage,
} from "../../../pilot/board/lib/boardUtils";
import s from "../../../pilot/board/PilotBoard.module.css";
import l from "../LiveBoard.module.css";

const API_URL = "/api";
const POLL_MS = 2500;
const ROW_CHUNK = 80;
const PENDING_KEY = "kyntus_live_pending_only";
const DENSITY_KEY = "kyntus_live_density";

interface LiveBoardViewProps {
  pilotId: string;
  pilotName: string;
  templateId: string;
  templateName: string;
}

interface FeedEvent {
  id: string;
  taskId: number;
  eps: string;
  text: string;
  kind: "STATUS" | "DATA";
  at: Date;
}

const cmpText = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const statusOf = (t: any) => (isTaskLockedByAdmin(t) ? "VALIDATED" : String(t.status || "A_FAIRE"));
const signature = (t: any) => `${statusOf(t)}|${JSON.stringify(t.dynamicData || {})}`;

const SORT_LABEL: Record<SortMode, string> = {
  ASC: "A → Z",
  DESC: "Z → A",
  EMPTY_FIRST: "Vides en haut",
  FILLED_FIRST: "Remplis en haut",
  LEN_DESC: "Plus longs",
};

// ============================================================================
// READ-ONLY ROW (memoized: a poll only re-renders the rows that changed)
// ============================================================================
interface LiveRowProps {
  task: any;
  index: number;
  eps: string;
  cols: string[];
  editableSet: Set<string>;
  wrapAll: boolean;
  flash: boolean;
  copied: boolean;
  onCopy: (id: number, eps: string) => void;
}

const LiveRow = memo(function LiveRow({ task, index, eps, cols, editableSet, wrapAll, flash, copied, onCopy }: LiveRowProps) {
  const locked = isTaskLockedByAdmin(task);
  const status = rowStatusOf(task, locked);
  const dyn = task.dynamicData || {};
  return (
    <tr data-status={status} className={[s.trRow, locked && s.trLockedAdmin, flash && l.rowFlash].filter(Boolean).join(" ")}>
      <td className={`${s.tdCell} ${s.stickyColCheck} ${l.rowIndex}`}>{index + 1}</td>
      <td className={`${s.tdCell} ${s.stickyColEps}`}>
        <div className={s.epsPillGroup}>
          <span className={s.epsBadge} title={eps}>
            {eps}
          </span>
          <button type="button" className={`${s.copyMiniBtn} ${copied ? s.copyMiniBtnDone : ""}`} onClick={() => onCopy(task.id, eps)} title="Copier cet EPS">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </td>
      <td className={`${s.tdCell} ${s.stickyColStatus}`}>
        <StatusPill status={status} readOnly />
      </td>
      {cols.map((col) => {
        const val = String(dyn[col] ?? "").trim();
        if (editableSet.has(col.toLowerCase())) {
          const kind = val ? getDecisionKind(val) : "AUTRE";
          return (
            <td key={col} className={`${s.tdEditableCell} ${wrapAll ? s.tdWrappedCell : ""}`}>
              <div className={l.readCell} data-kind={val ? kind : "EMPTY"}>
                {kind === "VALIDE" && <span className={`${l.kind} ${l.kindValide}`}>Validé</span>}
                {kind === "CONTESTABLE" && <span className={`${l.kind} ${l.kindContest}`}>Contestable</span>}
                {val ? <span className={l.readValue}>{val}</span> : <span className={l.readEmpty}>— non saisi —</span>}
              </div>
            </td>
          );
        }
        return (
          <td key={col} className={`${s.tdCell} ${wrapAll ? s.tdWrappedCell : ""}`} title={val}>
            {val ? <span className={s.lockedValue}>{val}</span> : <span className={s.emptyDash}>—</span>}
          </td>
        );
      })}
    </tr>
  );
});

// ============================================================================
// LIVE BOARD VIEW
// ============================================================================
export default function LiveBoardView({ pilotId, pilotName, templateId, templateName }: LiveBoardViewProps) {
  const [isLive, setIsLive] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [templateData, setTemplateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);

  // toolbar filters
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [filterColumn, setFilterColumn] = useState("ALL");
  const [columnExactValue, setColumnExactValue] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // in-column filters / sort / wrap / density
  const [colFilters, setColFilters] = useState<Record<string, ColumnFilterRule>>({});
  const [sortConfig, setSortConfig] = useState<{ col: string; mode: SortMode } | null>(null);
  const [openMenu, setOpenMenu] = useState<{ col: string; label: string; anchor: HTMLElement } | null>(null);
  const [pendingOnly, setPendingOnly] = useState(true);
  const [wrapAll, setWrapAll] = useState(true);
  const [density, setDensity] = useState<"comfort" | "compact">("comfort");
  const [renderLimit, setRenderLimit] = useState(ROW_CHUNK);

  // live diff
  const prevByIdRef = useRef<Map<number, { sig: string; task: any }> | null>(null);
  const [flashIds, setFlashIds] = useState<Record<number, number>>({});
  const [feed, setFeed] = useState<FeedEvent[]>([]);

  // table refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const thIdxRef = useRef<HTMLTableCellElement>(null);
  const thEpsRef = useRef<HTMLTableCellElement>(null);
  const [stickyOffsets, setStickyOffsets] = useState({ eps: 56, status: 292 });

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  useEffect(() => {
    setPendingOnly(readStorage<boolean>(PENDING_KEY, true));
    setDensity(readStorage<"comfort" | "compact">(DENSITY_KEY, "comfort"));
  }, []);
  const togglePendingOnly = () =>
    setPendingOnly((p) => {
      writeStorage(PENDING_KEY, !p);
      return !p;
    });
  const toggleDensity = () =>
    setDensity((d) => {
      const next = d === "compact" ? "comfort" : "compact";
      writeStorage(DENSITY_KEY, next);
      return next;
    });

  // ------------------------------------------------------------------
  // 1. TEMPLATE FIELDS
  // ------------------------------------------------------------------
  useEffect(() => {
    fetch(`${API_URL}/templates`)
      .then((res) => res.json())
      .then((data) => {
        const tpl = Array.isArray(data) ? data.find((t: any) => String(t.id) === templateId) : null;
        if (tpl) setTemplateData(tpl);
      })
      .catch(() => {});
  }, [templateId]);

  const allowedFields: string[] = useMemo(() => {
    if (!templateData || !Array.isArray(templateData.fields)) return [];
    return templateData.fields.map((f: any) => (typeof f === "string" ? f : f?.name)).filter(Boolean);
  }, [templateData]);
  const allowedRef = useRef(allowedFields);
  allowedRef.current = allowedFields;

  const editableSet = useMemo(() => new Set(allowedFields.map((f) => f.toLowerCase())), [allowedFields]);
  const isEditableColumn = useCallback((c: string) => editableSet.has(c.toLowerCase()), [editableSet]);

  // ------------------------------------------------------------------
  // 2. LIVE POLLING
  //    - unchanged rows keep the SAME object → memo rows don't re-render
  //    - nothing changed → no state update at all
  // ------------------------------------------------------------------
  const fetchTasks = useCallback(() => {
    return fetch(`${API_URL}/tasks?assigneeId=${pilotId}&templateId=${templateId}`)
      .then((res) => res.json())
      .then((data) => {
        const list: any[] = Array.isArray(data) ? data : [];
        const prev = prevByIdRef.current;
        const nextMap = new Map<number, { sig: string; task: any }>();
        const now = Date.now();
        const flashes: Record<number, number> = {};
        const events: FeedEvent[] = [];
        let changed = !prev || prev.size !== list.length;

        const merged = list.map((t) => {
          const sig = signature(t);
          const old = prev?.get(t.id);
          if (old && old.sig === sig) {
            nextMap.set(t.id, old);
            return old.task;
          }
          changed = true;
          nextMap.set(t.id, { sig, task: t });
          if (prev && old) {
            flashes[t.id] = now;
            const eps = extractTaskEPS(t, allowedRef.current);
            const before = old.sig.split("|")[0];
            const after = statusOf(t);
            events.push(
              before !== after
                ? { id: `${t.id}-${now}-s`, taskId: t.id, eps, kind: "STATUS", text: `→ ${STATUS_LABELS[after] || after}`, at: new Date() }
                : { id: `${t.id}-${now}-d`, taskId: t.id, eps, kind: "DATA", text: "analyse modifiée", at: new Date() }
            );
          }
          return t;
        });

        prevByIdRef.current = nextMap;
        if (changed) setTasks(merged);
        setLastSync(new Date());
        setSyncError(false);

        if (events.length) {
          setFlashIds((p) => ({ ...p, ...flashes }));
          setFeed((p) => [...events.reverse(), ...p].slice(0, 12));
          setTimeout(() => {
            setFlashIds((p) => {
              const copy = { ...p };
              Object.keys(flashes).forEach((id) => {
                if (copy[+id] === now) delete copy[+id];
              });
              return copy;
            });
          }, 2700);
        }
      })
      .catch((e) => {
        console.error("Fetch Tasks Error:", e);
        setSyncError(true);
      })
      .finally(() => setLoading(false));
  }, [pilotId, templateId]);

  useEffect(() => {
    prevByIdRef.current = null;
    setFeed([]);
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      if (!document.hidden) fetchTasks();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [isLive, fetchTasks]);

  // ------------------------------------------------------------------
  // 3. COLUMNS
  // ------------------------------------------------------------------
  const columnsKey = useMemo(() => {
    const cols = new Set<string>(allowedFields);
    tasks.forEach((t) => t.dynamicData && Object.keys(t.dynamicData).forEach((k) => cols.add(k)));
    return Array.from(cols).join("\u0001");
  }, [tasks, allowedFields]);
  const columns = useMemo(() => (columnsKey ? columnsKey.split("\u0001") : []), [columnsKey]);

  useEffect(() => {
    const a = thIdxRef.current;
    const b = thEpsRef.current;
    if (!a || !b) return;
    const measure = () => {
      const x = a.getBoundingClientRect().width;
      const y = b.getBoundingClientRect().width;
      setStickyOffsets((p) => (Math.abs(p.eps - x) < 0.5 && Math.abs(p.status - (x + y)) < 0.5 ? p : { eps: x, status: x + y }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(a);
    ro.observe(b);
    return () => ro.disconnect();
  }, [loading, tasks.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------------
  // 4. FILTER ENGINE (same rules as the pilot board)
  // ------------------------------------------------------------------
  const getVal = useCallback(
    (task: any, col: string) => {
      if (col === "__EPS__" || col === "EPS_ONLY") return extractTaskEPS(task, allowedFields);
      if (col === "__STATUS__") return statusOf(task);
      return String(task.dynamicData?.[col] ?? "").trim();
    },
    [allowedFields]
  );

  const matchesRule = (v: string, r: ColumnFilterRule) => {
    const lower = v.toLowerCase();
    if (r.mode === "EMPTY" && v !== "") return false;
    if (r.mode === "NOT_EMPTY" && v === "") return false;
    const q = r.text.trim().toLowerCase();
    if (q && r.mode === "CONTAINS" && !lower.includes(q)) return false;
    if (q && r.mode === "NOT_CONTAINS" && lower.includes(q)) return false;
    if (r.selectedValues.length && !r.selectedValues.includes(v === "" ? EMPTY_TOKEN : v)) return false;
    return true;
  };

  const pendingRuleActive = pendingOnly && Object.keys(colFilters).length > 0 && statusFilter === "ALL";

  const passes = useCallback(
    (task: any, skipCol?: string) => {
      if (statusFilter !== "ALL" && statusOf(task) !== statusFilter) return false;
      if (pendingRuleActive && !isTaskPending(task)) return false;
      const eps = extractTaskEPS(task, allowedFields);
      const dyn = task.dynamicData || {};
      if (filterColumn !== "ALL" && columnExactValue !== "ALL") {
        const cell = filterColumn === "EPS_ONLY" ? eps : String(dyn[filterColumn] ?? "").trim();
        if (columnExactValue === "__EMPTY__" ? cell !== "" : cell !== columnExactValue) return false;
      }
      for (const [col, rule] of Object.entries(colFilters)) {
        if (col !== skipCol && !matchesRule(getVal(task, col), rule)) return false;
      }
      const q = deferredSearch.trim().toLowerCase();
      if (!q) return true;
      if (filterColumn === "EPS_ONLY") return eps.toLowerCase().includes(q);
      if (filterColumn !== "ALL") return String(dyn[filterColumn] ?? "").toLowerCase().includes(q);
      return eps.toLowerCase().includes(q) || Object.values(dyn).some((v) => String(v ?? "").toLowerCase().includes(q));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusFilter, pendingRuleActive, allowedFields, filterColumn, columnExactValue, colFilters, getVal, deferredSearch]
  );

  const filteredTasks = useMemo(() => {
    const list = tasks.filter((t) => passes(t));
    if (!sortConfig) return list;
    const { col, mode } = sortConfig;
    return [...list].sort((a, b) => {
      const A = getVal(a, col);
      const B = getVal(b, col);
      const eA = A === "";
      const eB = B === "";
      if (mode === "EMPTY_FIRST") return eA !== eB ? (eA ? -1 : 1) : cmpText(A, B);
      if (mode === "FILLED_FIRST") return eA !== eB ? (eA ? 1 : -1) : cmpText(A, B);
      if (mode === "LEN_DESC") return B.length - A.length || cmpText(A, B);
      if (eA !== eB) return eA ? 1 : -1;
      return mode === "ASC" ? cmpText(A, B) : -cmpText(A, B);
    });
  }, [tasks, passes, sortConfig, getVal]);

  const openDistinct = useMemo(() => {
    const counts = new Map<string, number>();
    let pendingCount = 0;
    if (!openMenu) return { values: [] as [string, number][], pendingCount };
    tasks.forEach((t) => {
      if (pendingOnly && statusFilter === "ALL" && !isTaskPending(t)) return;
      if (!passes(t, openMenu.col)) return;
      pendingCount++;
      const v = getVal(t, openMenu.col);
      const k = v === "" ? EMPTY_TOKEN : v;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    (colFilters[openMenu.col]?.selectedValues || []).forEach((v) => !counts.has(v) && counts.set(v, 0));
    const values = Array.from(counts.entries()).sort((a, b) => (a[0] === EMPTY_TOKEN ? -1 : b[0] === EMPTY_TOKEN ? 1 : cmpText(a[0], b[0])));
    return { values, pendingCount };
  }, [openMenu, tasks, pendingOnly, statusFilter, passes, getVal, colFilters]);

  const columnDistinctOptions = useMemo<LuxeOption[]>(() => {
    if (filterColumn === "ALL") return [];
    const counts = new Map<string, number>();
    let empty = 0;
    tasks.forEach((t) => {
      const v = getVal(t, filterColumn);
      if (!v) empty++;
      else counts.set(v, (counts.get(v) || 0) + 1);
    });
    const opts: LuxeOption[] = [{ value: "ALL", label: `Toutes les valeurs (${tasks.length})`, badge: tasks.length, icon: <Layers size={14} /> }];
    if (empty) opts.push({ value: "__EMPTY__", label: "[Vide / Non renseigné]", badge: empty, icon: <CircleDot size={14} /> });
    Array.from(counts.entries()).sort((a, b) => cmpText(a[0], b[0])).forEach(([v, c]) => opts.push({ value: v, label: v, badge: c }));
    return opts;
  }, [tasks, filterColumn, getVal]);

  const stats = useMemo(() => {
    const r = { total: tasks.length, todo: 0, progress: 0, done: 0, validated: 0 };
    tasks.forEach((t) => {
      const st = statusOf(t);
      if (st === "VALIDATED") r.validated++;
      else if (st === "DONE") r.done++;
      else if (st === "EN_COURS") r.progress++;
      else r.todo++;
    });
    return r;
  }, [tasks]);

  const updateRule = (col: string, patch: Partial<ColumnFilterRule>) =>
    setColFilters((prev) => {
      const u = { ...(prev[col] || EMPTY_RULE), ...patch };
      const copy = { ...prev };
      if (u.mode === "CONTAINS" && !u.text.trim() && u.selectedValues.length === 0) delete copy[col];
      else copy[col] = u;
      return copy;
    });
  const clearRule = (col: string) =>
    setColFilters((prev) => {
      const copy = { ...prev };
      delete copy[col];
      return copy;
    });

  const resetAll = () => {
    setFilterColumn("ALL");
    setColumnExactValue("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
    setColFilters({});
    setSortConfig(null);
  };

  // ------------------------------------------------------------------
  // 5. PROGRESSIVE RENDERING + SCROLL SHADOWS
  // ------------------------------------------------------------------
  const filterSignature = `${statusFilter}|${deferredSearch}|${filterColumn}|${columnExactValue}|${pendingOnly}|${JSON.stringify(colFilters)}|${sortConfig?.col}|${sortConfig?.mode}`;
  useEffect(() => {
    setRenderLimit(ROW_CHUNK);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [filterSignature, pilotId, templateId]);

  const hasMoreRows = filteredTasks.length > renderLimit;
  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasMoreRows) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && startTransition(() => setRenderLimit((n) => n + ROW_CHUNK)), {
      root,
      rootMargin: "0px 0px 700px 0px",
    });
    io.observe(target);
    return () => io.disconnect();
  }, [hasMoreRows, renderLimit, loading]);

  const handleTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const y = el.scrollTop > 2 ? "1" : "0";
    const x = el.scrollLeft > 2 ? "1" : "0";
    if (el.dataset.sy !== y) el.dataset.sy = y;
    if (el.dataset.sx !== x) el.dataset.sx = x;
  }, []);

  const visibleRows = hasMoreRows ? filteredTasks.slice(0, renderLimit) : filteredTasks;

  // ------------------------------------------------------------------
  // 6. ACTIONS (spectator)
  // ------------------------------------------------------------------
  const spectatorWarning = () => toast({ message: "MODE SPECTATEUR : lecture seule.", type: "warning" });

  const handleCopyColumnValues = async (target?: string) => {
    const col = target && target !== "ALL" ? target : "EPS_ONLY";
    const values = filteredTasks.map((t) => getVal(t, col)).filter(Boolean);
    if (!values.length) return toast({ message: "AUCUNE VALEUR À COPIER", type: "error" });
    const ok = await universalCopyToClipboard(values.join("\n"));
    toast({ message: ok ? `${values.length} valeur(s) copiée(s)` : "Copie impossible", type: ok ? "success" : "error" });
  };

  const handleCopySingleEPS = useCallback(async (taskId: number, eps: string) => {
    if (await universalCopyToClipboard(eps)) {
      setCopiedId(taskId);
      setTimeout(() => setCopiedId(null), 1500);
    }
  }, []);

  const colName = (k: string) => (k === "__EPS__" ? "EPS" : k === "__STATUS__" ? "STATUT" : k);

  const headerActions = (col: string, label: string) => {
    const isSorted = sortConfig?.col === col;
    const isFiltered = !!colFilters[col];
    const isOpen = openMenu?.col === col;
    const sel = colFilters[col]?.selectedValues.length || 0;
    return (
      <div className={s.thActionCluster}>
        <button
          type="button"
          className={`${s.thIconBtn} ${isSorted ? s.thIconBtnActive : ""}`}
          onClick={() => setSortConfig((p) => (!p || p.col !== col ? { col, mode: "ASC" } : p.mode === "ASC" ? { col, mode: "DESC" } : null))}
          title="Trier A → Z / Z → A"
        >
          {isSorted && sortConfig?.mode === "DESC" ? <ArrowDownZA size={13} /> : <ArrowUpAZ size={13} />}
        </button>
        <button
          type="button"
          className={`${s.thIconBtn} ${isFiltered || isOpen ? s.thIconBtnActive : ""}`}
          onClick={(e) => setOpenMenu(isOpen ? null : { col, label, anchor: e.currentTarget })}
          title="Filtrer cette colonne"
        >
          <Filter size={12} />
          {sel > 0 && <span className={s.thFilterCount}>{sel}</span>}
        </button>
        {isFiltered && (
          <button type="button" className={`${s.thIconBtn} ${s.thIconBtnDanger}`} onClick={() => clearRule(col)} title="Supprimer le filtre">
            <FilterX size={12} />
          </button>
        )}
      </div>
    );
  };

  const pct = stats.total ? Math.round(((stats.done + stats.validated) / stats.total) * 100) : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  const initials = pilotName.split(/[\s._-]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "P";
  const activeRuleKeys = Object.keys(colFilters);

  const tiles = [
    { id: "A_FAIRE", label: "À faire", value: stats.todo, icon: <CircleDot size={15} />, tone: s.kpiTodo },
    { id: "EN_COURS", label: "En cours", value: stats.progress, icon: <Clock size={15} />, tone: s.kpiProgress },
    { id: "DONE", label: "Terminé", value: stats.done, icon: <CheckCircle2 size={15} />, tone: s.kpiDone },
    { id: "VALIDATED", label: "Validé admin", value: stats.validated, icon: <ShieldCheck size={15} />, tone: s.kpiValidated },
  ];

  return (
    <div className={`${s.boardContainer} ${l.liveBoardShell}`}>
      <div className={s.boardContent}>
        {/* HERO: pilot + KPI */}
        <div className={s.headerBento}>
          <header className={s.heroHeader} style={{ gridTemplateColumns: "auto 1fr" }}>
            <div className={s.heroStripe} />
            <div className={s.heroIdentity}>
              <div className={s.heroAvatar}>
                <span>{initials}</span>
                <i className={s.heroLive} style={isLive ? undefined : { background: "#94a3b8" }} />
              </div>
              <div className={s.heroIdText}>
                <span className={s.heroKicker}>Mode spectateur · lecture seule</span>
                <strong className={s.heroName}>{pilotName}</strong>
                <span className={s.heroMission} title={templateName}>
                  <Layers size={12} /> {templateName}
                </span>
              </div>
            </div>
            <div className={s.heroKpis} style={{ justifyContent: "flex-end" }}>
              <div className={s.heroRing} title={`${stats.done + stats.validated} / ${stats.total} traités`}>
                <svg viewBox="0 0 64 64" width="64" height="64">
                  <circle cx="32" cy="32" r={R} className={s.ringTrack} />
                  <circle cx="32" cy="32" r={R} className={s.ringValue} strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} />
                </svg>
                <div className={s.ringLabel}>
                  <b>{pct}%</b>
                  <small>traité</small>
                </div>
              </div>
              {tiles.map((t) => {
                const active = statusFilter === t.id;
                return (
                  <button key={t.id} type="button" className={`${s.kpiTile} ${t.tone} ${active ? s.kpiTileActive : ""}`} onClick={() => setStatusFilter(active ? "ALL" : t.id)}>
                    <span className={s.kpiIcon}>{t.icon}</span>
                    <span className={s.kpiText}>
                      <b>{t.value}</b>
                      <small>{t.label}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </header>
        </div>

        {/* LIVE BAR */}
        <div className={`${l.liveBar} ${isLive ? "" : l.liveBarPaused}`}>
          <div className={l.liveLeft}>
            <span className={l.liveTag}>
              <i className={`${l.liveDot} ${isLive ? "" : l.liveDotOff}`} />
              {isLive ? "LIVE" : "PAUSE"}
            </span>
            <span className={l.liveWho}>
              <span>Pilote</span> {pilotName} <span>· Mission</span> {templateName}
            </span>
          </div>
          <div className={l.liveRight}>
            <span className={l.liveMeta}>
              {syncError ? <AlertTriangle size={14} /> : <RefreshCw size={14} className={isLive ? s.spinSlow : ""} />}
              {syncError ? "Connexion perdue — nouvel essai..." : lastSync ? `Synchro ${lastSync.toLocaleTimeString("fr-FR")}` : "Connexion..."}
              {isLive && !syncError && ` · toutes les ${POLL_MS / 1000}s`}
            </span>
            <button type="button" className={l.liveToggle} onClick={() => fetchTasks()} title="Actualiser maintenant">
              <RefreshCw size={14} />
            </button>
            <button type="button" className={l.liveToggle} onClick={() => setIsLive((p) => !p)}>
              {isLive ? <Pause size={14} /> : <Play size={14} />}
              {isLive ? "Mettre en pause" : "Reprendre le live"}
            </button>
          </div>
        </div>

        {/* ACTIVITY FEED */}
        {feed.length > 0 && (
          <div className={l.feed}>
            {feed.map((ev) => (
              <span key={ev.id} className={l.feedItem}>
                <span className={`${l.feedIcon} ${ev.kind === "STATUS" ? l.feedIconStatus : ""}`}>{ev.kind === "STATUS" ? <Zap size={12} /> : <Edit3 size={12} />}</span>
                <b>{ev.eps}</b> {ev.text}
                <time>{ev.at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
              </span>
            ))}
          </div>
        )}

        {/* TOOLBAR */}
        <div className={`${s.bentoCard} ${s.actionsWrapper}`}>
          <BoardActions
            tasksCount={tasks.length}
            filteredCount={filteredTasks.length}
            selectedCount={0}
            allowedFields={allowedFields}
            allColumns={columns}
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
            onPurgeDoublons={spectatorWarning}
            onCoachSync={spectatorWarning}
            onBulkEdit={spectatorWarning}
            onClearSelection={() => {}}
            onResetFilters={resetAll}
          />
        </div>

        {/* COMMAND STRIP */}
        <div className={s.commandBar}>
          <div className={s.commandGroup}>
            <button type="button" className={`${s.toolBtn} ${pendingOnly ? s.toolBtnActive : ""}`} onClick={togglePendingOnly}>
              <Hourglass size={14} />
              <span>Filtres : {pendingOnly ? "à traiter seulement" : "tout inclure"}</span>
            </button>
            <button type="button" className={`${s.toolBtn} ${wrapAll ? s.toolBtnActive : ""}`} onClick={() => setWrapAll((p) => !p)}>
              <AlignLeft size={14} />
              <span>{wrapAll ? "Texte complet : ON" : "Textes compacts"}</span>
            </button>
            <button type="button" className={`${s.toolBtn} ${density === "compact" ? s.toolBtnActive : ""}`} onClick={toggleDensity}>
              {density === "compact" ? <Rows4 size={14} /> : <Rows3 size={14} />}
              <span>{density === "compact" ? "Compact" : "Confort"}</span>
            </button>
          </div>
          <div className={s.countBadge}>
            <ListChecks size={15} />
            <span>
              <b>{filteredTasks.length}</b> / {tasks.length} lignes
            </span>
          </div>
        </div>

        {/* ACTIVE RULES */}
        {(sortConfig || activeRuleKeys.length > 0) && (
          <div className={s.activeRulesBar}>
            <span className={s.activeRulesLabel}>
              <Filter size={13} />
              <span>FILTRES ACTIFS</span>
            </span>
            {pendingRuleActive && (
              <button type="button" className={s.ruleChipPending} onClick={togglePendingOnly}>
                <Hourglass size={12} />
                <span>À faire + En cours uniquement</span>
                <X size={12} />
              </button>
            )}
            {sortConfig && (
              <div className={s.ruleChipSort}>
                <ArrowUpDown size={12} />
                <span>
                  Tri {colName(sortConfig.col)} : <strong>{SORT_LABEL[sortConfig.mode]}</strong>
                </span>
                <button type="button" className={s.ruleChipRemove} onClick={() => setSortConfig(null)}>
                  <X size={12} />
                </button>
              </div>
            )}
            {activeRuleKeys.map((k) => (
              <div key={k} className={s.ruleChipFilter}>
                <Filter size={12} />
                <button type="button" className={s.ruleChipBody} onClick={(e) => setOpenMenu({ col: k, label: colName(k), anchor: e.currentTarget })}>
                  <b>{colName(k)}</b> <span>{colFilters[k].selectedValues.length ? `${colFilters[k].selectedValues.length} valeur(s)` : colFilters[k].text || colFilters[k].mode.toLowerCase()}</span>
                </button>
                <button type="button" className={s.ruleChipRemove} onClick={() => clearRule(k)}>
                  <X size={12} />
                </button>
              </div>
            ))}
            <button type="button" className={s.clearAllRulesBtn} onClick={() => { setColFilters({}); setSortConfig(null); }}>
              <FilterX size={13} /> Tout effacer
            </button>
          </div>
        )}

        {/* GRID */}
        <div className={`${s.bentoCard} ${s.gridWrapper}`}>
          {loading && tasks.length === 0 ? (
            <div className={s.emptyStateBox}>
              <div className={s.emptyIconCircle}>
                <Activity size={30} />
              </div>
              <h3>Connexion au flux du pilote...</h3>
              <p>Récupération des EPS de {pilotName}.</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className={s.emptyStateBox}>
              <div className={s.emptyIconCircle}>
                <ListChecks size={30} />
              </div>
              <h3>Aucun EPS assigné</h3>
              <p>Ce pilote n&apos;a pas encore de lignes sur cette mission.</p>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className={s.tableScrollContainer} onScroll={handleTableScroll} data-sy="0" data-sx="0">
                <table
                  className={`${s.luxeTable} ${density === "compact" ? s.densityCompact : ""}`}
                  style={{ "--sticky-eps-left": `${stickyOffsets.eps}px`, "--sticky-status-left": `${stickyOffsets.status}px` } as React.CSSProperties}
                >
                  <thead>
                    <tr>
                      <th ref={thIdxRef} className={`${s.th} ${s.stickyColCheck}`}>#</th>
                      <th ref={thEpsRef} className={`${s.th} ${s.stickyColEps} ${sortConfig?.col === "__EPS__" || colFilters.__EPS__ ? s.thActiveRule : ""}`}>
                        <div className={s.thInteractiveBar}>
                          <div className={s.thContent}><span className={s.thTitleText}>RÉFÉRENCE EPS</span></div>
                          {headerActions("__EPS__", "RÉFÉRENCE EPS")}
                        </div>
                      </th>
                      <th className={`${s.th} ${s.stickyColStatus} ${sortConfig?.col === "__STATUS__" || colFilters.__STATUS__ ? s.thActiveRule : ""}`}>
                        <div className={s.thInteractiveBar}>
                          <div className={s.thContent}><span className={s.thTitleText}>STATUT</span></div>
                          {headerActions("__STATUS__", "STATUT PILOTE / ADMIN")}
                        </div>
                      </th>
                      {columns.map((col) => {
                        const editable = isEditableColumn(col);
                        return (
                          <th
                            key={col}
                            className={[s.th, editable && s.thEditable, wrapAll && s.thWrappedMode, (sortConfig?.col === col || colFilters[col]) && s.thActiveRule].filter(Boolean).join(" ")}
                          >
                            <div className={s.thInteractiveBar}>
                              <div className={s.thContent}>
                                {editable ? <Edit3 size={13} className={s.thTypeIcon} /> : <Lock size={11} className={s.thTypeIcon} />}
                                <span className={s.thTitleText} title={col}>{col}</span>
                              </div>
                              {headerActions(col, col)}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 && (
                      <tr>
                        <td colSpan={columns.length + 3} className={s.noMatchCell}>
                          <div className={s.noMatchBox}>
                            <CheckCircle2 size={22} />
                            <span>{pendingRuleActive ? "Plus aucun EPS à traiter pour ces filtres." : "Aucune ligne ne correspond aux filtres."}</span>
                            <button type="button" className={s.noMatchBtn} onClick={resetAll}>
                              <RotateCcw size={13} /> Réinitialiser
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {visibleRows.map((task, idx) => (
                      <LiveRow
                        key={task.id}
                        task={task}
                        index={idx}
                        eps={extractTaskEPS(task, allowedFields)}
                        cols={columns}
                        editableSet={editableSet}
                        wrapAll={wrapAll}
                        flash={!!flashIds[task.id]}
                        copied={copiedId === task.id}
                        onCopy={handleCopySingleEPS}
                      />
                    ))}
                    {hasMoreRows && (
                      <tr ref={sentinelRef} className={s.sentinelRow}>
                        <td colSpan={columns.length + 3}>
                          <div className={s.sentinelBox}>
                            <Loader2 size={15} className={s.spinSlow} />
                            <span>
                              Chargement de la suite… <b>{filteredTasks.length - renderLimit}</b> ligne(s) restante(s)
                            </span>
                            <button type="button" className={s.noMatchBtn} onClick={() => setRenderLimit(filteredTasks.length)}>
                              Tout afficher
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className={s.tableFooter}>
                <span className={s.footerNote}>
                  <Lock size={14} />
                  <span>
                    <strong>Mode spectateur</strong> — les lignes modifiées par le pilote s&apos;illuminent en direct.
                  </span>
                </span>
                <div className={s.footerRight}>
                  <div className={s.footerProgress} title="Avancement">
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  <span className={s.footerCount}>{filteredTasks.length} ligne(s) filtrée(s)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <FloatingLayer anchor={openMenu?.anchor || null} open={!!openMenu} onClose={closeMenu} width={350}>
        {openMenu && (
          <ColumnFilterPanel
            key={openMenu.col}
            label={openMenu.label}
            rule={colFilters[openMenu.col] || EMPTY_RULE}
            distinct={openDistinct.values}
            sortMode={sortConfig?.col === openMenu.col ? sortConfig.mode : null}
            canWrap={false}
            isWrapped={wrapAll}
            valueLabel={openMenu.col === "__STATUS__" ? (v) => STATUS_LABELS[v] || v : undefined}
            onRuleChange={(patch) => updateRule(openMenu.col, patch)}
            onClearFilter={() => clearRule(openMenu.col)}
            onSort={(mode) => setSortConfig(mode ? { col: openMenu.col, mode } : null)}
            onToggleWrap={() => setWrapAll((p) => !p)}
            onClose={closeMenu}
            pendingOnly={pendingOnly}
            onTogglePending={togglePendingOnly}
            pendingCount={openDistinct.pendingCount}
          />
        )}
      </FloatingLayer>
    </div>
  );
}