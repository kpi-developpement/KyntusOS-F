"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Radio, FolderKanban, Users, Archive, Search, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/Toaster";
import styles from "./LiveBoard.module.css";

import TemplateList, { TemplateStats, EMPTY_TEMPLATE_STATS, isTemplateCompleted } from "./components/TemplateList";
import PilotList from "./components/PilotList";
import LiveBoardView from "./components/LiveBoardView";
import ArchiveModal from "./components/ArchiveModal";

const LiveNetworkBackground = dynamic(() => import("./ux/LiveNetworkBackground"), { ssr: false });

const API_URL = "/api";
const ARCHIVE_KEY = "kyntus_live_archive_overrides";
const STATS_REFRESH_MS = 30000;

type ViewState = "TEMPLATES" | "PILOTS" | "BOARD";
type ArchiveOverride = "ARCHIVED" | "ACTIVE";
type SortKey = "PROGRESS" | "NAME" | "ACTIVITY";

const readOverrides = (): Record<string, ArchiveOverride> => {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "{}") || {};
  } catch {
    return {};
  }
};

export default function AdminLiveBoardOrchestrator() {
  const [view, setView] = useState<ViewState>("TEMPLATES");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedPilot, setSelectedPilot] = useState<any>(null);

  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, TemplateStats>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, ArchiveOverride>>({});
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ACTIVITY");

  // ------------------------------------------------------------------
  // DATA: templates + aggregated stats per template
  // ------------------------------------------------------------------
  useEffect(() => {
    setOverrides(readOverrides());
    fetch(`${API_URL}/templates`)
      .then((res) => res.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Erreur templates:", err))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const loadStats = useCallback(async (list: any[]) => {
    if (list.length === 0) {
      setStatsLoading(false);
      return;
    }
    const results = await Promise.allSettled(
      list.map((tpl) =>
        fetch(`${API_URL}/stats/template/${tpl.id}/pilots`)
          .then((r) => r.json())
          .then((pilots) => {
            const agg: TemplateStats = { ...EMPTY_TEMPLATE_STATS };
            (Array.isArray(pilots) ? pilots : []).forEach((p: any) => {
              const t = (p.todoCount || 0) + (p.inProgressCount || 0) + (p.doneCount || 0) + (p.validCount || 0) + (p.errorCount || 0);
              agg.todo += p.todoCount || 0;
              agg.progress += p.inProgressCount || 0;
              agg.done += p.doneCount || 0;
              agg.valid += p.validCount || 0;
              agg.error += p.errorCount || 0;
              agg.total += t;
              if (t > 0) agg.pilots++;
            });
            return [String(tpl.id), agg] as const;
          })
      )
    );
    const next: Record<string, TemplateStats> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
    });
    setStats((prev) => ({ ...prev, ...next }));
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    if (templatesLoading) return;
    loadStats(templates);
    if (view !== "TEMPLATES") return;
    const id = setInterval(() => loadStats(templates), STATS_REFRESH_MS);
    return () => clearInterval(id);
  }, [templates, templatesLoading, view, loadStats]);

  // ------------------------------------------------------------------
  // ARCHIVE LOGIC
  //  auto  : 100% des EPS terminés/validés → archive
  //  manuel: override "ARCHIVED" / "ACTIVE" (gardé sur ce poste)
  // ------------------------------------------------------------------
  const isArchived = useCallback(
    (tpl: any) => {
      const o = overrides[String(tpl.id)];
      if (o) return o === "ARCHIVED";
      return isTemplateCompleted(stats[String(tpl.id)]);
    },
    [overrides, stats]
  );

  const saveOverride = (tpl: any, value: ArchiveOverride) => {
    setOverrides((prev) => {
      const next = { ...prev, [String(tpl.id)]: value };
      try {
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const archiveTemplate = (tpl: any) => {
    saveOverride(tpl, "ARCHIVED");
    toast({ message: `« ${tpl.name} » envoyée aux archives`, type: "success" });
  };

  const restoreTemplate = (tpl: any) => {
    saveOverride(tpl, "ACTIVE");
    toast({ message: `« ${tpl.name} » restaurée dans les missions actives`, type: "success" });
  };

  const archiveReason = (tpl: any): "AUTO" | "MANUAL" =>
    overrides[String(tpl.id)] === "ARCHIVED" && !isTemplateCompleted(stats[String(tpl.id)]) ? "MANUAL" : "AUTO";

  const archivedTemplates = useMemo(() => templates.filter(isArchived), [templates, isArchived]);

  const activeTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = templates.filter((t) => !isArchived(t) && (!q || String(t.name || "").toLowerCase().includes(q)));
    const pct = (t: any) => {
      const s = stats[String(t.id)];
      return s && s.total ? (s.done + s.valid) / s.total : 0;
    };
    return list.sort((a, b) => {
      if (sortKey === "NAME") return String(a.name).localeCompare(String(b.name));
      if (sortKey === "PROGRESS") return pct(b) - pct(a);
      const sa = stats[String(a.id)] || EMPTY_TEMPLATE_STATS;
      const sb = stats[String(b.id)] || EMPTY_TEMPLATE_STATS;
      return sb.progress + sb.todo - (sa.progress + sa.todo);
    });
  }, [templates, isArchived, query, sortKey, stats]);

  // ------------------------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------------------------
  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setIsArchiveOpen(false);
    setView("PILOTS");
  };

  const handleSelectPilot = (pilot: any) => {
    setSelectedPilot(pilot);
    setView("BOARD");
  };

  const goTo = (target: ViewState) => {
    if (target === "TEMPLATES") {
      setSelectedTemplate(null);
      setSelectedPilot(null);
    }
    if (target === "PILOTS") setSelectedPilot(null);
    setView(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => goTo(view === "BOARD" ? "PILOTS" : "TEMPLATES");

  const title =
    view === "TEMPLATES"
      ? "Live Monitor"
      : view === "PILOTS"
      ? `Équipe : ${selectedTemplate?.name}`
      : `Live : ${selectedPilot?.pilotName}`;

  const subtitle =
    view === "TEMPLATES"
      ? "Choisissez une mission pour voir les pilotes qui y travaillent."
      : view === "PILOTS"
      ? "Sélectionnez un pilote pour observer son board en temps réel."
      : `Mission ${selectedTemplate?.name} · mode spectateur`;

  const crumbs: { id: ViewState; label: string; icon: React.ReactNode; enabled: boolean }[] = [
    { id: "TEMPLATES", label: "Missions", icon: <FolderKanban size={11} />, enabled: true },
    { id: "PILOTS", label: selectedTemplate?.name || "Équipe", icon: <Users size={11} />, enabled: !!selectedTemplate },
    { id: "BOARD", label: selectedPilot?.pilotName || "Live", icon: <Radio size={11} />, enabled: !!selectedPilot },
  ];

  return (
    <div className={styles.container}>
      <LiveNetworkBackground calm={view === "BOARD"} />

      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.titleBox}>
          <div className={`${styles.iconWrap} ${view === "BOARD" ? styles.iconLive : ""}`}>
            {view === "TEMPLATES" && <FolderKanban size={24} />}
            {view === "PILOTS" && <Users size={24} />}
            {view === "BOARD" && <Radio size={24} />}
          </div>
          <div className={styles.titleText}>
            <div className={styles.crumbs}>
              {crumbs.map((c, i) => (
                <React.Fragment key={c.id}>
                  {i > 0 && <ChevronRight size={12} className={styles.crumbSep} />}
                  <button
                    type="button"
                    className={`${styles.crumb} ${view === c.id ? styles.crumbActive : ""}`}
                    disabled={!c.enabled || view === c.id}
                    onClick={() => goTo(c.id)}
                  >
                    {c.icon} {c.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          {view === "TEMPLATES" && (
            <>
              <button type="button" className={styles.ghostBtn} onClick={() => loadStats(templates)} title="Actualiser les statistiques">
                <RefreshCw size={15} />
              </button>
              <button type="button" className={styles.primaryBtn} onClick={() => setIsArchiveOpen(true)}>
                <Archive size={16} />
                Archives
                <span className={styles.countPill}>{archivedTemplates.length}</span>
              </button>
            </>
          )}
          {view !== "TEMPLATES" && (
            <button type="button" onClick={goBack} className={styles.backBtn}>
              <ChevronLeft size={16} />
              Retour
            </button>
          )}
        </div>
      </div>

      {/* CONTENT (re-mounted per view → enter transition) */}
      <div key={`${view}-${selectedTemplate?.id || ""}-${selectedPilot?.pilotId || ""}`} className={styles.viewEnter}>
        {view === "TEMPLATES" &&
          (templatesLoading ? (
            <div className={styles.grid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : (
            <>
              <div className={styles.listToolbar}>
                <div className={styles.searchWrap}>
                  <Search size={16} />
                  <input className={styles.searchInput} placeholder="Chercher une mission..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {statsLoading && <Loader2 size={16} className={styles.spin} color="#2563eb" />}
                  <div className={styles.segmented}>
                    {(
                      [
                        { id: "ACTIVITY", label: "Reste à faire" },
                        { id: "PROGRESS", label: "Progression" },
                        { id: "NAME", label: "Nom" },
                      ] as { id: SortKey; label: string }[]
                    ).map((s) => (
                      <button key={s.id} type="button" className={`${styles.segment} ${sortKey === s.id ? styles.segmentActive : ""}`} onClick={() => setSortKey(s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <span className={styles.badge}>
                    {activeTemplates.length} active(s) · {archivedTemplates.length} archivée(s)
                  </span>
                </div>
              </div>
              <TemplateList
                templates={activeTemplates}
                stats={stats}
                statsLoading={statsLoading}
                onSelect={handleSelectTemplate}
                onArchive={archiveTemplate}
                emptyLabel={query ? "Aucune mission trouvée" : undefined}
              />
            </>
          ))}

        {view === "PILOTS" && selectedTemplate && <PilotList templateId={selectedTemplate.id} onSelect={handleSelectPilot} />}

        {view === "BOARD" && selectedTemplate && selectedPilot && (
          <LiveBoardView
            pilotId={String(selectedPilot.pilotId)}
            pilotName={selectedPilot.pilotName}
            templateId={String(selectedTemplate.id)}
            templateName={selectedTemplate.name}
          />
        )}
      </div>

      <ArchiveModal
        open={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        templates={archivedTemplates}
        stats={stats}
        reasonOf={archiveReason}
        onRestore={restoreTemplate}
        onOpen={handleSelectTemplate}
      />
    </div>
  );
}