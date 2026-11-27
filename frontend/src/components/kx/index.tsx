"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  UploadCloud, Loader2, CheckCircle2, AlertTriangle, Info, Search, ChevronLeft, ChevronRight,
  Inbox, type LucideIcon,
} from "lucide-react";
import s from "./Kx.module.css";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Met à jour --mx / --my pour le halo qui suit le curseur. */
export function trackGlow(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export function KxHeader({
  icon: Icon, eyebrow, title, subtitle, actions,
}: { icon: LucideIcon; eyebrow?: string; title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className={s.header}>
      <div className={s.headerIcon}><Icon size={26} strokeWidth={2.2} /></div>
      <div className={s.headerText}>
        {eyebrow && <span className={s.eyebrow}>{eyebrow}</span>}
        <h1 className={s.title}>{title}</h1>
        {subtitle && <p className={s.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={s.headerActions}>{actions}</div>}
    </header>
  );
}

export function KxCard({
  children, title, icon: Icon, count, actions, className, pad = true, style,
}: {
  children: React.ReactNode; title?: React.ReactNode; icon?: LucideIcon; count?: React.ReactNode;
  actions?: React.ReactNode; className?: string; pad?: boolean; style?: React.CSSProperties;
}) {
  return (
    <section className={cx(s.card, pad && s.cardPad, className)} onPointerMove={trackGlow} style={style}>
      {(title || actions) && (
        <div className={s.cardHead}>
          <div className={s.cardTitle}>
            {Icon && <span className={s.cardTitleIcon}><Icon size={17} /></span>}
            {title}
            {count !== undefined && <span className={s.count}>{count}</span>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function KxDropzone({
  onFile, busy, disabled, title = "Glissez votre fichier Excel ici", hint = "ou cliquez pour parcourir · .xlsx, .xls, .csv",
  busyTitle = "Traitement en cours…", busyHint = "Merci de patienter", accept = ".xlsx,.xls,.csv", icon: Icon = UploadCloud,
}: {
  onFile: (f: File) => void; busy?: boolean; disabled?: boolean; title?: string; hint?: string;
  busyTitle?: string; busyHint?: string; accept?: string; icon?: LucideIcon;
}) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const locked = busy || disabled;
  return (
    <button
      type="button"
      onPointerMove={trackGlow}
      className={cx(s.drop, over && s.dropActive, busy && s.dropBusy, disabled && !busy && s.dropDisabled)}
      onClick={() => !locked && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!locked) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !locked) onFile(f);
      }}
      aria-busy={busy}
      disabled={disabled && !busy}
    >
      <input
        ref={input} type="file" accept={accept} hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />
      <span className={s.dropIcon}>{busy ? <Loader2 size={30} className="kx-spin" /> : <Icon size={30} />}</span>
      <span className={s.dropTitle}>{busy ? busyTitle : over ? "Relâchez pour importer" : title}</span>
      <span className={s.dropHint}>{busy ? busyHint : hint}</span>
      {busy && <span className={s.dropBar} />}
    </button>
  );
}

export function KxAlert({ tone, children, icon }: { tone: "ok" | "bad" | "info"; children: React.ReactNode; icon?: React.ReactNode }) {
  const I = tone === "ok" ? CheckCircle2 : tone === "bad" ? AlertTriangle : Info;
  return (
    <div className={cx(s.alert, s[`alert_${tone}`])} role={tone === "bad" ? "alert" : "status"}>
      <span className={s.alertIcon}>{icon ?? <I size={19} />}</span>
      <div className={s.alertBody}>{children}</div>
    </div>
  );
}

/** Nombre qui s'anime jusqu'à sa valeur (ease-out), respecte reduced-motion. */
export function KxCount({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (reduce) {
      raf = requestAnimationFrame(() => { setShown(value); from.current = value; });
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    const a = from.current;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{shown.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

export function KxStats({ children }: { children: React.ReactNode }) {
  return <div className={s.stats}>{children}</div>;
}

export function KxStat({
  icon: Icon, label, value, tone, delay = 0,
}: { icon: LucideIcon; label: string; value: React.ReactNode; tone?: "ok" | "bad" | "warn" | "sky"; delay?: number }) {
  return (
    <div className={cx(s.stat, tone && s[`stat_${tone}`])} style={{ animationDelay: `${delay}s` }}>
      <span className={s.statIcon}><Icon size={20} /></span>
      <div>
        <div className={s.statValue}>{value}</div>
        <div className={s.statLabel}>{label}</div>
      </div>
    </div>
  );
}

export function KxEmpty({ icon: Icon = Inbox, title, children }: { icon?: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className={s.emptyState}>
      <span className={s.emptyIcon}><Icon size={26} /></span>
      <span className={s.emptyTitle}>{title}</span>
      {children}
    </div>
  );
}

/** Tableau générique : recherche globale + pagination. */
export function KxTable({
  rows, columns, pageSize = 50, title, icon, searchPlaceholder = "Rechercher une valeur…", render,
}: {
  rows: Record<string, unknown>[]; columns: string[]; pageSize?: number; title?: React.ReactNode; icon?: LucideIcon;
  searchPlaceholder?: string; render?: (col: string, value: unknown, row: Record<string, unknown>) => React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => columns.some((c) => String(r[c] ?? "").toLowerCase().includes(t)));
  }, [rows, columns, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * pageSize, cur * pageSize);

  const cell = (c: string, v: unknown, r: Record<string, unknown>) => {
    if (render) { const out = render(c, v, r); if (out !== undefined) return out; }
    if (v === true || v === "TRUE" || v === "true") return <span className={s.cellTrue}>{String(v)}</span>;
    if (v === false || v === "FALSE" || v === "false") return <span className={s.cellFalse}>{String(v)}</span>;
    if (v === undefined || v === null || v === "") return <span className={s.cellMuted}>—</span>;
    return String(v);
  };

  return (
    <KxCard title={title} icon={icon} count={filtered.length.toLocaleString("fr-FR")}
      actions={
        <label className={s.search}>
          <Search size={15} />
          <span className={s.srOnly}>Rechercher</span>
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={searchPlaceholder} />
        </label>
      }
    >
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i}>{columns.map((c) => <td key={c}>{cell(c, r[c], r)}</td>)}</tr>
            ))}
            {slice.length === 0 && (
              <tr><td colSpan={columns.length} className={s.empty}>Aucune ligne ne correspond à « {q} ».</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className={s.pager}>
          <span>Page <b>{cur}</b> sur <b>{pages}</b></span>
          <div className={s.pagerBtns}>
            <button type="button" className={s.pageBtn} disabled={cur === 1} onClick={() => setPage(cur - 1)}><ChevronLeft size={15} /> Précédent</button>
            <button type="button" className={s.pageBtn} disabled={cur === pages} onClick={() => setPage(cur + 1)}>Suivant <ChevronRight size={15} /></button>
          </div>
        </div>
      )}
    </KxCard>
  );
}
