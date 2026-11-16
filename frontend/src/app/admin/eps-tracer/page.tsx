"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  Radar,
  ClipboardPaste,
  Search,
  Eraser,
  FileSpreadsheet,
  Loader2,
  Layers,
  Users,
  CheckCircle2,
  SearchX,
  ListTree,
  Copy,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import styles from "./Tracer.module.css";
import TracerBackground from "./TracerBackground";
import { toast } from "@/components/ui/Toaster";

// ============================================================================
// 🔎 EPS TRACER — colle des centaines d'EPS / LOR → toutes les lignes de tous
//    les templates + qui les a traitées + export Excel.
// ============================================================================

interface TraceRow {
  taskId: number;
  ref: string;
  matchedColumn: string;
  epsReference: string;
  status: string;
  templateId: number | null;
  templateName: string | null;
  assigneeId: number | null;
  assignee: string | null;
  importedAt: string | null;
  deadline: string | null;
  timeSeconds: number | null;
  flaggedError: boolean;
  dynamicData: Record<string, unknown>;
}

interface TraceResult {
  requested: number;
  foundRefs: number;
  rows: TraceRow[];
  notFound: string[];
}

type WorkFilter = "ALL" | "WORKED" | "TODO";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  A_FAIRE: { label: "À faire", cls: styles.stTodo },
  EN_COURS: { label: "En cours", cls: styles.stDoing },
  DONE: { label: "Terminé", cls: styles.stDone },
  VALIDE: { label: "Validé", cls: styles.stValid },
  REJETE: { label: "Rejeté", cls: styles.stReject },
};

const PAGE = 250;

// Colonnes Excel (dynamicData) affichées dans le tableau + export, dans cet ordre
const DATA_COLS = [
  "ANALYSE",
  "Nacelle",
  "Anomalie 1",
  "Anomalie 2",
  "Groupe de catégorie Racco Logement",
  "Typologie PBO-PTO déclarée par le technicien",
];

const normKey = (k: string) =>
  k
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

// Lecture tolérante : ignore majuscules, accents, espaces et tirets dans le nom de colonne
const getCol = (data: Record<string, unknown> | undefined, col: string): string => {
  if (!data) return "";
  let v = data[col];
  if (v === undefined) {
    const target = normKey(col);
    const key = Object.keys(data).find((k) => normKey(k) === target);
    v = key ? data[key] : undefined;
  }
  if (v == null) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
};

const parseRefs = (txt: string) => {
  const tokens = txt
    .split(/[\s,;|]+/)
    .map((t) => t.trim().replace(/^["']|["']$/g, "").toUpperCase())
    .filter(Boolean);
  const unique = Array.from(new Set(tokens));
  return { total: tokens.length, unique };
};

const isWorked = (r: TraceRow) => r.status !== "A_FAIRE" || r.assignee != null;

const fmtDate = (v: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
};

const fmtDuration = (s: number | null) => {
  if (!s) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(sec).padStart(2, "0")}s`;
};

const refKind = (ref: string) =>
  ref.startsWith("EPS") ? styles.tagEps : ref.startsWith("LOR") ? styles.tagLor : styles.tagOther;

const refKindLabel = (ref: string) => (ref.startsWith("EPS") ? "EPS" : ref.startsWith("LOR") ? "LOR" : "REF");

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
};

export default function EpsTracerPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [pulse, setPulse] = useState(0);

  const [workFilter, setWorkFilter] = useState<WorkFilter>("ALL");
  const [tplFilter, setTplFilter] = useState("ALL");
  const [pilotFilter, setPilotFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const parsed = useMemo(() => parseRefs(input), [input]);
  const epsCount = parsed.unique.filter((r) => r.startsWith("EPS")).length;
  const lorCount = parsed.unique.filter((r) => r.startsWith("LOR")).length;

  // -------------------------------------------------------------- SEARCH
  const runSearch = async () => {
    if (!parsed.unique.length) {
      toast({ message: "Colle au moins une référence EPS / LOR", type: "error" });
      return;
    }
    setLoading(true);
    setOpen(null);
    setLimit(PAGE);
    try {
      const res = await fetch("/api/admin/eps-tracer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refs: parsed.unique }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        toast({ message: data?.message || "Erreur serveur pendant la recherche", type: "error" });
        return;
      }
      setResult(data);
      setTplFilter("ALL");
      setPilotFilter("ALL");
      setQuery("");
      setPulse((p) => p + 1);
      toast({
        message: `${data.foundRefs}/${data.requested} références trouvées · ${data.rows.length} lignes`,
        type: data.rows.length ? "success" : "info",
      });
    } catch {
      toast({ message: "Connexion serveur impossible", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------- FILTERS
  const rows = result?.rows ?? [];

  const templates = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.templateName || "—", (m.get(r.templateName || "—") || 0) + 1));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const pilots = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      if (r.assignee) m.set(r.assignee, (m.get(r.assignee) || 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (workFilter === "WORKED" && !isWorked(r)) return false;
      if (workFilter === "TODO" && isWorked(r)) return false;
      if (tplFilter !== "ALL" && (r.templateName || "—") !== tplFilter) return false;
      if (pilotFilter === "__NONE__" && r.assignee) return false;
      if (pilotFilter !== "ALL" && pilotFilter !== "__NONE__" && r.assignee !== pilotFilter) return false;
      if (q) {
        const hay = `${r.ref} ${r.templateName} ${r.assignee} ${r.status} ${Object.values(r.dynamicData || {}).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, workFilter, tplFilter, pilotFilter, query]);

  const workedCount = rows.filter(isWorked).length;
  const maxPilot = pilots[0]?.[1] || 1;

  // -------------------------------------------------------------- EXCEL
  const exportExcel = () => {
    if (!result) return;
    const data = filtered;

    const sheetRows = data.map((r) => {
      const base: Record<string, unknown> = {
        "Référence": r.ref,
        "Template": r.templateName || "",
        "Traité par": r.assignee || "",
        "Statut": STATUS_META[r.status]?.label || r.status,
      };
      DATA_COLS.forEach((c) => {
        base[c] = getCol(r.dynamicData, c);
      });
      return base;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    ws["!cols"] = Object.keys(sheetRows[0] || { a: 1 }).map((k) => ({ wch: Math.min(40, Math.max(12, k.length + 2)) }));
    ws["!autofilter"] = { ref: ws["!ref"] || "A1" };
    XLSX.utils.book_append_sheet(wb, ws, "Résultats");

    const byPilot = new Map<string, { total: number; byTpl: Map<string, number> }>();
    data.forEach((r) => {
      const p = r.assignee || "Non assigné";
      if (!byPilot.has(p)) byPilot.set(p, { total: 0, byTpl: new Map() });
      const e = byPilot.get(p)!;
      e.total++;
      const t = r.templateName || "—";
      e.byTpl.set(t, (e.byTpl.get(t) || 0) + 1);
    });
    const pilotSheet = Array.from(byPilot.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([p, e]) => ({
        "Pilote": p,
        "Lignes": e.total,
        "Templates": Array.from(e.byTpl.entries()).map(([t, n]) => `${t} (${n})`).join(", "),
      }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pilotSheet), "Par pilote");

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(result.notFound.map((r) => ({ "Référence introuvable": r }))),
      "Introuvables"
    );

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Kyntus_EPS_Tracer_${date}.xlsx`);
    toast({ message: `Export Excel prêt · ${data.length} lignes`, type: "success" });
  };

  // -------------------------------------------------------------- UI
  return (
    <div className={styles.page}>
      <TracerBackground pulseKey={pulse} />

      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>
              <span className={styles.kickerDot} /> Admin · Traçabilité
            </span>
            <h1 className={styles.title}>
              EPS <span className={styles.titleAccent}>Tracer</span>
            </h1>
            <p className={styles.subtitle}>
              Colle autant de références EPS ou LOR que tu veux : on retrouve chaque ligne dans tous les templates,
              avec le pilote qui l&apos;a traitée.
            </p>
          </div>
          {result && (
            <button className={styles.btnExcel} onClick={exportExcel} disabled={!filtered.length}>
              <FileSpreadsheet size={18} /> Exporter Excel ({filtered.length})
            </button>
          )}
        </header>

        {/* ------------------------------------------------ INPUT */}
        <section className={styles.inputGrid}>
          <div className={`${styles.card} ${styles.inputCard}`}>
            <h2 className={styles.cardTitle}>
              <span className={styles.cardTitleIcon}>
                <ClipboardPaste size={16} />
              </span>
              Références à tracer
            </h2>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) runSearch();
                }}
                placeholder={"EPS-2026-000123\nEPS-2026-000124\nLOR-88412\n…\n\nColle une colonne Excel directement (une par ligne, ou séparées par virgule / espace)"}
                spellCheck={false}
              />
            </div>
            <div className={styles.chips}>
              <span className={`${styles.chip} ${styles.chipBlue}`}>
                Uniques <b>{parsed.unique.length}</b>
              </span>
              <span className={styles.chip}>
                EPS <b>{epsCount}</b>
              </span>
              <span className={styles.chip}>
                LOR <b>{lorCount}</b>
              </span>
              {parsed.unique.length - epsCount - lorCount > 0 && (
                <span className={styles.chip}>
                  Autres <b>{parsed.unique.length - epsCount - lorCount}</b>
                </span>
              )}
              {parsed.total > parsed.unique.length && (
                <span className={styles.chip}>
                  Doublons retirés <b>{parsed.total - parsed.unique.length}</b>
                </span>
              )}
            </div>
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={runSearch} disabled={loading || !parsed.unique.length}>
                {loading ? <Loader2 size={18} className={styles.spin} /> : <Radar size={18} />}
                {loading ? "Recherche en cours…" : `Tracer ${parsed.unique.length || ""} référence${parsed.unique.length > 1 ? "s" : ""}`}
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => {
                  setInput("");
                  setResult(null);
                }}
              >
                <Eraser size={16} /> Vider
              </button>
            </div>
          </div>

          <aside className={`${styles.card} ${styles.sideCard}`}>
            <div>
              <div className={styles.label}>Afficher</div>
              <div className={styles.segment}>
                {(
                  [
                    ["ALL", "Toutes"],
                    ["WORKED", "Traitées"],
                    ["TODO", "Non traitées"],
                  ] as [WorkFilter, string][]
                ).map(([k, l]) => (
                  <button
                    key={k}
                    className={`${styles.segBtn} ${workFilter === k ? styles.segBtnActive : ""}`}
                    onClick={() => setWorkFilter(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className={styles.label}>Comment ça marche</div>
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepNum}>1</span>
                  Copie ta colonne EPS / LOR depuis Excel et colle-la à gauche.
                </li>
                <li>
                  <span className={styles.stepNum}>2</span>
                  On cherche dans la référence de chaque ligne et dans toutes ses colonnes Excel, sur tous les templates.
                </li>
                <li>
                  <span className={styles.stepNum}>3</span>
                  Filtre par template ou pilote, clique une ligne pour voir ses données, puis exporte en Excel.
                </li>
              </ol>
            </div>
            <div className={styles.chip} style={{ alignSelf: "flex-start" }}>
              <Sparkles size={13} /> Astuce : <b>Ctrl + Entrée</b> pour lancer
            </div>
          </aside>
        </section>

        {/* ------------------------------------------------ KPIs */}
        {result && (
          <section className={styles.kpis}>
            <Kpi icon={<ListTree size={14} />} label="Demandées" value={result.requested} />
            <Kpi
              icon={<CheckCircle2 size={14} />}
              label="Trouvées"
              value={result.foundRefs}
              ratio={result.requested ? result.foundRefs / result.requested : 0}
              accent
            />
            <Kpi icon={<Layers size={14} />} label="Lignes" value={result.rows.length} sub={`${templates.length} template(s)`} />
            <Kpi
              icon={<Users size={14} />}
              label="Traitées"
              value={workedCount}
              ratio={result.rows.length ? workedCount / result.rows.length : 0}
              sub={`${pilots.length} pilote(s)`}
            />
            <Kpi icon={<SearchX size={14} />} label="Introuvables" value={result.notFound.length} warn={result.notFound.length > 0} />
          </section>
        )}

        {/* ------------------------------------------------ TABLE */}
        <section className={`${styles.card} ${styles.resultsCard}`}>
          {result ? (
            <>
              <div className={styles.toolbar}>
                <label className={styles.search}>
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setLimit(PAGE);
                    }}
                    placeholder="Filtrer dans les résultats (réf, pilote, valeur…)"
                  />
                </label>
                <select className={styles.select} value={tplFilter} onChange={(e) => setTplFilter(e.target.value)}>
                  <option value="ALL">Tous les templates</option>
                  {templates.map(([t, n]) => (
                    <option key={t} value={t}>
                      {t} ({n})
                    </option>
                  ))}
                </select>
                <select className={styles.select} value={pilotFilter} onChange={(e) => setPilotFilter(e.target.value)}>
                  <option value="ALL">Tous les pilotes</option>
                  <option value="__NONE__">Non assigné</option>
                  {pilots.map(([p, n]) => (
                    <option key={p} value={p}>
                      {p} ({n})
                    </option>
                  ))}
                </select>
              </div>

              {filtered.length ? (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: 28 }} />
                        <th>Référence</th>
                        <th>Template</th>
                        <th>Traité par</th>
                        <th>Statut</th>
                        {DATA_COLS.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, limit).map((r, i) => {
                        const st = STATUS_META[r.status] || { label: r.status, cls: styles.stTodo };
                        const isOpen = open === r.taskId;
                        return (
                          <React.Fragment key={r.taskId}>
                            <tr
                              className={`${styles.row} ${isOpen ? styles.rowOpen : ""}`}
                              style={{ animationDelay: `${Math.min(i, 30) * 12}ms` }}
                              onClick={() => setOpen(isOpen ? null : r.taskId)}
                            >
                              <td>{isOpen ? <ChevronDown size={15} color="#2563eb" /> : <ChevronRight size={15} color="#94a3b8" />}</td>
                              <td className={styles.refCell}>
                                <span className={`${styles.refTag} ${refKind(r.ref)}`}>{refKindLabel(r.ref)}</span>
                                {r.ref}
                                {r.flaggedError && <span className={styles.flag}> · ERREUR</span>}
                              </td>
                              <td>
                                <span className={styles.tpl}>
                                  <span className={styles.tplDot} />
                                  {r.templateName || "—"}
                                </span>
                              </td>
                              <td>
                                {r.assignee ? (
                                  <span className={styles.avatar}>
                                    <span className={styles.avatarCircle}>{r.assignee.slice(0, 2).toUpperCase()}</span>
                                    {r.assignee}
                                  </span>
                                ) : (
                                  <span className={styles.nobody}>Non assigné</span>
                                )}
                              </td>
                              <td>
                                <span className={`${styles.status} ${st.cls}`}>{st.label}</span>
                              </td>
                              {DATA_COLS.map((c) => {
                                const v = getCol(r.dynamicData, c);
                                return (
                                  <td key={c} className={styles.dataCell} title={v}>
                                    {v || <span className={styles.nobody}>—</span>}
                                  </td>
                                );
                              })}
                            </tr>
                            {isOpen && (
                              <tr className={styles.details}>
                                <td />
                                <td colSpan={4 + DATA_COLS.length}>
                                  <div className={styles.detailGrid}>
                                    {Object.entries(r.dynamicData || {}).map(([k, v]) => (
                                      <div
                                        key={k}
                                        className={`${styles.detailItem} ${k === r.matchedColumn ? styles.detailHit : ""}`}
                                      >
                                        <div className={styles.detailKey} title={k}>
                                          {k}
                                        </div>
                                        <div className={styles.detailVal}>
                                          {v == null || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.empty}>
                  <div className={styles.emptyIcon}>
                    <SearchX size={32} />
                  </div>
                  <div className={styles.emptyTitle}>Aucune ligne pour ces filtres</div>
                  Change le filtre « Afficher », le template ou le pilote.
                </div>
              )}

              <div className={styles.footer}>
                <span>
                  {Math.min(limit, filtered.length)} / {filtered.length} lignes affichées
                </span>
                {filtered.length > limit && (
                  <button className={styles.iconBtn} onClick={() => setLimit((l) => l + PAGE)}>
                    Afficher {Math.min(PAGE, filtered.length - limit)} de plus
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <Radar size={34} />
              </div>
              <div className={styles.emptyTitle}>Prêt à tracer</div>
              Colle tes références au-dessus et lance la recherche.
            </div>
          )}
        </section>

        {/* ------------------------------------------------ PILOTS + MISSING */}
        {result && (pilots.length > 0 || result.notFound.length > 0) && (
          <section className={styles.bottomGrid}>
            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                  <span className={styles.cardTitleIcon}>
                    <Users size={15} />
                  </span>
                  Qui a traité quoi
                </h3>
              </div>
              {pilots.length ? (
                pilots.map(([p, n]) => (
                  <div
                    key={p}
                    className={styles.pilotRow}
                    onClick={() => setPilotFilter(pilotFilter === p ? "ALL" : p)}
                    title="Cliquer pour filtrer le tableau"
                  >
                    <span className={styles.avatar}>
                      <span className={styles.avatarCircle}>{p.slice(0, 2).toUpperCase()}</span>
                      <span style={{ fontWeight: pilotFilter === p ? 800 : 600 }}>{p}</span>
                    </span>
                    <div className={styles.pilotBar}>
                      <div className={styles.pilotBarFill} style={{ width: `${(n / maxPilot) * 100}%` }} />
                    </div>
                    <span className={styles.pilotCount}>{n}</span>
                  </div>
                ))
              ) : (
                <span className={styles.nobody}>Aucune ligne assignée.</span>
              )}
            </div>

            <div className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <h3 className={styles.cardTitle} style={{ margin: 0 }}>
                  <span className={styles.cardTitleIcon} style={{ background: "linear-gradient(135deg,#f59e0b,#fbbf24)" }}>
                    <SearchX size={15} />
                  </span>
                  Introuvables ({result.notFound.length})
                </h3>
                {result.notFound.length > 0 && (
                  <button
                    className={styles.iconBtn}
                    onClick={async () => {
                      await copyText(result.notFound.join("\n"));
                      toast({ message: "Liste copiée", type: "success" });
                    }}
                  >
                    <Copy size={13} /> Copier
                  </button>
                )}
              </div>
              {result.notFound.length ? (
                <div className={styles.missingList}>
                  {result.notFound.map((r) => (
                    <span key={r} className={styles.missingItem}>
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <span style={{ color: "#15803d", fontWeight: 700 }}>Toutes les références ont été trouvées ✓</span>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  ratio,
  accent,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  ratio?: number;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`${styles.card} ${styles.kpi} ${accent ? styles.kpiAccent : ""} ${warn ? styles.kpiWarn : ""}`}>
      <div className={styles.kpiLabel}>
        {icon}
        {label}
      </div>
      <div className={styles.kpiValue}>{value.toLocaleString("fr-FR")}</div>
      {ratio !== undefined ? (
        <div className={styles.kpiBar}>
          <div className={styles.kpiBarFill} style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      ) : sub ? (
        <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#5b6b8c", fontWeight: 600 }}>{sub}</div>
      ) : null}
      {ratio !== undefined && sub && (
        <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#5b6b8c", fontWeight: 600 }}>{sub}</div>
      )}
    </div>
  );
}
