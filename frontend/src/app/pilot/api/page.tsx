"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  RefreshCw, Search, X, Calendar, Folder, CheckCircle, AlertTriangle, Layers, Send, ListChecks, Eye, GitCommit,
  DownloadCloud, Users, Globe, Crosshair, ShieldAlert, Zap, History, Database, Gavel, Radio, Trash2, StopCircle,
  CloudDownload, Filter, ThumbsUp, ThumbsDown, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import NexusSelect from "./components/NexusSelect";
import NexusStyles from "./components/NexusStyles";
import NexusModal from "./components/NexusModal";
import AlertBanners from "./components/AlertBanners";
import TimelineModal from "./components/TimelineModal";
import DataGrid from "./components/DataGrid";
import {
  ETAT_ACTIONNABLE, couleurEtat, TYPES_RACCORDEMENT, TYPES_PAR_QUALIF, ELEMENTS_PAR_QUALIF, ELEMENTS_TOUS, SECTEURS,
  libelleSecteur, VERSIONS_OPTIONS, elementsDe, totalElements, fmtMontant, fmtDate, parserListe, telechargerBlob,
  telechargerUrl, auteurCourant,
} from "./lib/apiUtils";

const RoyalBackground = dynamic(() => import("../board/ux/RoyalBackground"), { ssr: false });

const API_BASE = "";

type Onglet = "LISTE" | "VERSIONS" | "DECISIONS";
type ModeEtat = "COURANTE" | "PREMIERE" | "TOUTE";
type SortDir = "asc" | "desc";

const BadgeEtat = ({ etat, contour }: { etat?: string | null; contour?: boolean }) => {
  const c = couleurEtat(etat);
  return (
    <span
      className="nx-badge"
      style={{
        color: c,
        background: `${c}14`,
        borderColor: contour ? "#d97706" : `${c}44`,
        boxShadow: contour ? "0 0 0 1px #f59e0b" : undefined,
      }}
    >
      <span className="nx-dot" style={{ background: c, width: 6, height: 6 }} />
      {etat || "-"}
    </span>
  );
};

const COULEURS_VERSION = ["#475569", "#2563eb", "#1d4ed8", "#d97706", "#dc2626", "#be185d"];
const BadgeVersions = ({ n, onClick }: { n: number; onClick?: () => void }) => {
  const c = COULEURS_VERSION[Math.min(n, COULEURS_VERSION.length - 1)];
  return (
    <span
      onClick={onClick}
      className="nx-badge"
      title="Voir la chronologie"
      style={{
        color: c,
        background: `${c}12`,
        borderColor: `${c}40`,
        cursor: onClick ? "pointer" : "default",
        fontFamily: "var(--k-font-mono)",
      }}
    >
      <GitCommit size={11} /> V{n}
    </span>
  );
};

/** Bilan d'une recherche multiple : combien d'EPS presents, lesquels introuvables. */
const BandeauIntrouvables = ({
  demandes,
  manquants,
  flash,
}: {
  demandes: number;
  manquants: string[];
  flash: (m: string) => void;
}) => {
  const [voir, setVoir] = useState(false);
  const nb = manquants?.length || 0;
  const c = nb ? "#d97706" : "#059669";
  const bg = nb ? "#fffbeb" : "#ecfdf5";
  const brd = nb ? "#fde68a" : "#a7f3d0";
  return (
    <div
      className="nx-panel"
      style={{
        padding: "0.78rem 1.15rem",
        borderRadius: 14,
        fontSize: "0.8rem",
        color: "#0f2557",
        background: bg,
        border: `1px solid ${brd}`,
        borderLeft: `4px solid ${c}`,
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <ListChecks size={16} color={c} />
        <span>
          <strong style={{ color: "#0f2557" }}>RECHERCHE MULTIPLE</strong> · {demandes} EPS demandés ·{" "}
          <span style={{ color: "#059669", fontWeight: 800 }}>{demandes - nb} présents</span>
          {nb > 0 && (
            <>
              {" "}
              · <span style={{ color: "#d97706", fontWeight: 800 }}>{nb} introuvables sur la période</span>
            </>
          )}
        </span>
        {nb > 0 && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button className="nx-btn xs nx-warn" onClick={() => setVoir(!voir)}>
              {voir ? "Masquer" : "Voir les introuvables"}
            </button>
            <button
              className="nx-btn xs nx-warn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(manquants.join("\n"));
                  flash(`${nb} EPS introuvables copiés.`);
                } catch {
                  flash("Copie impossible.");
                }
              }}
            >
              <Copy size={11} /> Copier
            </button>
          </div>
        )}
      </div>
      {voir && nb > 0 && (
        <div
          className="nx-scroll"
          style={{
            marginTop: 10,
            maxHeight: 130,
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {manquants.map((e) => (
            <span
              key={e}
              style={{
                padding: "3px 9px",
                borderRadius: 7,
                background: "#ffffff",
                border: "1px solid #fde68a",
                color: "#b45309",
                fontSize: "0.73rem",
                fontFamily: "var(--k-font-mono)",
                fontWeight: 800,
              }}
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default function BytelApiPage() {
  const [onglet, setOnglet] = useState<Onglet>("LISTE");

  // ---------------- Filtres globaux ----------------
  const [year, setYear] = useState<number | "TOUS">(new Date().getFullYear());
  const [month, setMonth] = useState<number | "TOUS">(new Date().getMonth() + 1);
  const [secteur, setSecteur] = useState("");

  // ---------------- Onglet INTERVENTIONS ----------------
  const [etat, setEtat] = useState(ETAT_ACTIONNABLE);
  const [type, setType] = useState("");
  const [traitement, setTraitement] = useState("");
  const [versionsFiltre, setVersionsFiltre] = useState("");
  const [epsInput, setEpsInput] = useState("");
  const [epsFiltre, setEpsFiltre] = useState("");
  const [epsListe, setEpsListe] = useState<string[]>([]);
  const [introuvables, setIntrouvables] = useState<string[]>([]);

  const [rows, setRows] = useState<any[]>([]);
  const [nbVersionsParEps, setNbVersionsParEps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [etatsDispo, setEtatsDispo] = useState<string[]>([]);
  const [typesDispo, setTypesDispo] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  // ---------------- 2026 Enterprise Table Controls ----------------
  const [density, setDensity] = useState<"comfort" | "compact">("comfort");
  const [quickFilter, setQuickFilter] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [copiedEps, setCopiedEps] = useState<string | null>(null);

  // ---------------- Synchronisation / lecture ----------------
  const [syncing, setSyncing] = useState(false);
  const [progres, setProgres] = useState<any>(null);
  const [mode, setMode] = useState<"DIRECT" | "BASE">("DIRECT");
  const [syncEtat, setSyncEtat] = useState<any>(null);
  const [dureeMs, setDureeMs] = useState<number | null>(null);
  const [patience, setPatience] = useState("");
  const [msg, setMsg] = useState("");
  const [erreur, setErreur] = useState("");
  const [refresh, setRefresh] = useState(0);

  // ---------------- Alertes ----------------
  const [alertes, setAlertes] = useState<{ attente: string[]; commentaires: string[] }>({
    attente: [],
    commentaires: [],
  });
  const [scanAlertes, setScanAlertes] = useState(false);

  // ---------------- Export (un seul a la fois) ----------------
  const [exportEtat, setExportEtat] = useState<any>(null);

  // ---------------- Action unitaire ----------------
  const [cible, setCible] = useState<any>(null);
  const [actionType, setActionType] = useState<"VALIDATION" | "CONTESTATION">("CONTESTATION");
  const [commentaire, setCommentaire] = useState("");
  const [nouveauType, setNouveauType] = useState("");
  const [nouveauRacc, setNouveauRacc] = useState("");
  const [apercu, setApercu] = useState<any>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // ---------------- Chronologie ----------------
  const [timelineEps, setTimelineEps] = useState<string | null>(null);
  const [timelinePeriode, setTimelinePeriode] = useState("");
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // ---------------- Lot ----------------
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [lotOuvert, setLotOuvert] = useState(false);
  const [lotCommentaire, setLotCommentaire] = useState("");
  const [lotType, setLotType] = useState<"VALIDATION" | "CONTESTATION">("VALIDATION");
  const [lotEnCours, setLotEnCours] = useState(false);
  const [lotResultat, setLotResultat] = useState<any>(null);

  // ---------------- Onglet VERSIONS ----------------
  const [vers, setVers] = useState<any[]>([]);
  const [versGroupes, setVersGroupes] = useState<any[]>([]);
  const [versLoading, setVersLoading] = useState(false);
  const [versEps, setVersEps] = useState("");
  const [versEpsListe, setVersEpsListe] = useState<string[]>([]);
  const [versIntrouvables, setVersIntrouvables] = useState<string[]>([]);
  const [versEtat, setVersEtat] = useState("");
  const [versDebut, setVersDebut] = useState("");
  const [versFin, setVersFin] = useState("");
  const [versDetail, setVersDetail] = useState(false);
  const [versParEps, setVersParEps] = useState(true);
  const [versModeEtat, setVersModeEtat] = useState<ModeEtat>("COURANTE");
  const [versPage, setVersPage] = useState(0);
  const [versTotalPages, setVersTotalPages] = useState(0);
  const [versTotal, setVersTotal] = useState(0);

  // ---------------- Onglet DECISIONS ----------------
  const [histo, setHisto] = useState<any[]>([]);
  const [histoLoading, setHistoLoading] = useState(false);
  const [histoType, setHistoType] = useState("");
  const [histoEps, setHistoEps] = useState("");
  const [histoPage, setHistoPage] = useState(0);
  const [histoTotalPages, setHistoTotalPages] = useState(0);
  const [histoTotal, setHistoTotal] = useState(0);

  // ---------------- Modales protocoles ----------------
  const [listeModal, setListeModal] = useState<null | "LISTE" | "VERSIONS">(null);
  const [listeTexte, setListeTexte] = useState("");

  const [equipeOuvert, setEquipeOuvert] = useState(false);
  const [equipeTexte, setEquipeTexte] = useState("");
  const [equipeAnnee, setEquipeAnnee] = useState<number | "TOUS">("TOUS");
  const [equipeMois, setEquipeMois] = useState<number | "TOUS">("TOUS");
  const [equipeDecisionsSeules, setEquipeDecisionsSeules] = useState(false);

  const [trackOuvert, setTrackOuvert] = useState(false);
  const [trackTexte, setTrackTexte] = useState("");
  const [trackAnnee, setTrackAnnee] = useState<number | "TOUS">("TOUS");
  const [trackMois, setTrackMois] = useState<number | "TOUS">("TOUS");
  const [trackEtat, setTrackEtat] = useState("");
  const [trackMode, setTrackMode] = useState<ModeEtat>("COURANTE");
  const [trackEtats, setTrackEtats] = useState<string[]>([]);

  const [omniOuvert, setOmniOuvert] = useState(false);
  const [omniTexte, setOmniTexte] = useState("");
  const [omniEnCours, setOmniEnCours] = useState(false);
  const [omniRes, setOmniRes] = useState<any>(null);
  const [omniExport, setOmniExport] = useState(false);

  const [purgeOuvert, setPurgeOuvert] = useState(false);
  const [purgeSaisie, setPurgeSaisie] = useState("");
  const [purgeEnCours, setPurgeEnCours] = useState(false);
  const [purgeRes, setPurgeRes] = useState<any>(null);

  // ---------------- Periode ----------------
  const periodeExacte = year !== "TOUS" && month !== "TOUS";
  const periode = useMemo(() => {
    if (year !== "TOUS" && month !== "TOUS") return `${year}_M${String(month).padStart(2, "0")}`;
    if (year === "TOUS" && month === "TOUS") return "TOUTES PÉRIODES";
    if (year === "TOUS") return `TOUTES ANNÉES · M${String(month).padStart(2, "0")}`;
    return `${year} · TOUS MOIS`;
  }, [year, month]);
  const qPer = useMemo(() => `year=${year}&month=${month}`, [year, month]);
  const auteur = useMemo(() => auteurCourant(), []);

  const flash = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 7000);
  }, []);
  const flashErr = useCallback((m: string) => {
    setErreur(m);
    setTimeout(() => setErreur(""), 10000);
  }, []);

  const copyEpsCode = useCallback(async (epsCode: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(epsCode);
      setCopiedEps(epsCode);
      setTimeout(() => setCopiedEps((prev) => (prev === epsCode ? null : prev)), 1600);
    } catch {
      /* ignore */
    }
  }, []);

  const filtresListe = () => ({
    year: String(year),
    month: String(month),
    etat,
    type,
    qualif: secteur,
    eps: epsFiltre,
    epsList: epsListe,
    traitement,
    versions: versionsFiltre,
    page,
    size,
  });
  const filtresVersions = () => ({
    year: String(year),
    month: String(month),
    etat: versEtat,
    qualif: secteur,
    eps: versEps,
    epsList: versEpsListe,
    dateDebut: versDebut,
    dateFin: versFin,
    page: versPage,
    size: versParEps ? 20 : 50,
    modeEtat: versModeEtat,
  });

  // ---------------- Chargements de reference ----------------
  useEffect(() => {
    fetch(`${API_BASE}/api/bytel/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      setEpsFiltre(epsInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [epsInput]);

  useEffect(() => {
    (async () => {
      try {
        const [e, t, s] = await Promise.all([
          fetch(`${API_BASE}/api/bytel/etats?${qPer}`),
          fetch(`${API_BASE}/api/bytel/types?${qPer}`),
          fetch(`${API_BASE}/api/bytel/stats?${qPer}`),
        ]);
        if (e.ok) setEtatsDispo(await e.json());
        if (t.ok) setTypesDispo(await t.json());
        if (s.ok) setStats(await s.json());
      } catch {
        /* silencieux */
      }
    })();
  }, [qPer, refresh]);

  // ---------------- Alertes de la periode ----------------
  useEffect(() => {
    let annule = false;
    (async () => {
      setScanAlertes(true);
      try {
        const r = await fetch(`${API_BASE}/api/bytel/alertes?${qPer}&qualif=${encodeURIComponent(secteur)}`);
        if (r.ok && !annule) {
          const d = await r.json();
          setAlertes({ attente: d.attente || [], commentaires: d.commentaires || [] });
        }
      } catch {
        if (!annule) setAlertes({ attente: [], commentaires: [] });
      } finally {
        if (!annule) setScanAlertes(false);
      }
    })();
    return () => {
      annule = true;
    };
  }, [qPer, secteur, refresh]);

  // ---------------- Lecture INTERVENTIONS ----------------
  const filtreActif = useMemo(
    () =>
      Boolean(
        !periodeExacte ||
          etat ||
          type ||
          secteur ||
          epsFiltre ||
          traitement ||
          versionsFiltre ||
          epsListe.length > 0
      ),
    [periodeExacte, etat, type, secteur, epsFiltre, traitement, versionsFiltre, epsListe]
  );

  useEffect(() => {
    if (onglet !== "LISTE") return;
    let annule = false;
    (async () => {
      setLoading(true);
      try {
        if (!filtreActif) {
          // ---------- Lecture DIRECTE dans l'API ----------
          const p = new URLSearchParams({ period: periode, page: String(page), size: String(size) });
          let d: any = null,
            derniere = "";
          for (let essai = 1; essai <= 4 && !annule; essai++) {
            if (essai > 1) setPatience(`L'API prépare la période, tentative ${essai}/4...`);
            try {
              const r = await fetch(`${API_BASE}/api/bytel/live?${p}`);
              if (r.ok) {
                const j = await r.json();
                if (!j.erreur) {
                  d = j;
                  break;
                }
                derniere = j.erreur;
              } else derniere = `HTTP ${r.status}`;
            } catch (e: any) {
              derniere = e?.message || String(e);
            }
            if (essai < 4) await new Promise((res) => setTimeout(res, 1500 * essai));
          }
          if (annule) return;
          setPatience("");
          setMode("DIRECT");
          setIntrouvables([]);
          if (!d) {
            setRows([]);
            setNbVersionsParEps({});
            setTotalPages(0);
            setTotalItems(0);
            setDureeMs(null);
            flashErr(`Lecture directe impossible après 4 tentatives : ${derniere}`);
          } else {
            setRows(d.content || []);
            setNbVersionsParEps({});
            setTotalPages(d.totalPages || 0);
            setTotalItems(d.totalItems || 0);
            setDureeMs(d.dureeMs ?? null);
          }
        } else {
          // ---------- Lecture en BASE (copie synchronisee de l'API) ----------
          const r = await fetch(`${API_BASE}/api/bytel/qualifications/recherche`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filtresListe()),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const d = await r.json();
          if (annule) return;
          setMode("BASE");
          setRows(d.content || []);
          setNbVersionsParEps(d.nbVersionsParEps || {});
          setTotalPages(d.totalPages || 0);
          setTotalItems(d.totalItems || 0);
          setIntrouvables(d.epsIntrouvables || []);
          setDureeMs(null);
          if (d.note) flashErr(d.note);
        }
      } catch (e: any) {
        if (!annule) flashErr(`Lecture impossible : ${e?.message || e}`);
      } finally {
        if (!annule) {
          setLoading(false);
          setPatience("");
        }
      }
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    periode,
    qPer,
    page,
    size,
    etat,
    type,
    secteur,
    epsFiltre,
    epsListe,
    traitement,
    versionsFiltre,
    refresh,
    onglet,
    filtreActif,
  ]);

  // ---------------- Lecture VERSIONS ----------------
  const chargerVersions = useCallback(async () => {
    setVersLoading(true);
    try {
      const url = versParEps ? "/api/bytel/versions/par-eps" : "/api/bytel/versions/recherche";
      const r = await fetch(`${API_BASE}${url}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtresVersions()),
      });
      if (r.ok) {
        const d = await r.json();
        if (versParEps) {
          setVersGroupes(d.content || []);
          setVers([]);
        } else {
          setVers(d.content || []);
          setVersGroupes([]);
        }
        setVersTotalPages(d.totalPages || 0);
        setVersTotal(d.totalItems || 0);
        setVersIntrouvables(d.epsIntrouvables || []);
        if (d.note) flashErr(d.note);
      }
    } catch {
      flashErr("Versions indisponibles.");
    } finally {
      setVersLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    qPer,
    secteur,
    versEps,
    versEpsListe,
    versEtat,
    versDebut,
    versFin,
    versPage,
    versParEps,
    versModeEtat,
    refresh,
  ]);
  useEffect(() => {
    if (onglet === "VERSIONS") chargerVersions();
  }, [onglet, chargerVersions]);

  // ---------------- Lecture DECISIONS ----------------
  const chargerDecisions = useCallback(async () => {
    setHistoLoading(true);
    try {
      const p = new URLSearchParams({
        year: String(year),
        month: String(month),
        page: String(histoPage),
        size: "50",
      });
      if (histoType) p.append("actionType", histoType);
      if (histoEps) p.append("eps", histoEps);
      const r = await fetch(`${API_BASE}/api/bytel/historique?${p}`);
      if (r.ok) {
        const d = await r.json();
        setHisto(d.content || []);
        setHistoTotalPages(d.totalPages || 0);
        setHistoTotal(d.totalItems || 0);
      }
    } catch {
      flashErr("Historique indisponible.");
    } finally {
      setHistoLoading(false);
    }
  }, [year, month, histoType, histoEps, histoPage, flashErr]);
  useEffect(() => {
    if (onglet === "DECISIONS") chargerDecisions();
  }, [onglet, chargerDecisions, refresh]);

  // ---------------- Synchronisation ----------------
  const lireSyncEtat = useCallback(async (p: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/bytel/sync/status?period=${p}`);
      if (r.ok) setSyncEtat(await r.json());
    } catch {
      /* silencieux */
    }
  }, []);
  useEffect(() => {
    if (periodeExacte) lireSyncEtat(periode);
    else setSyncEtat(null);
  }, [periode, periodeExacte, refresh, lireSyncEtat]);

  const synchroniser = useCallback(
    async (p: string, forcer: boolean) => {
      setSyncing(true);
      try {
        const r = await fetch(`${API_BASE}/api/bytel/sync?period=${p}&forcer=${forcer}`, {
          method: "POST",
        });
        const d = await r.json().catch(() => null);
        if (d?.statut === "TERMINE" && !forcer) {
          flash(`${p} est déjà synchronisée. Utilisez "Forcer" pour relancer.`);
          setSyncEtat(d);
          return;
        }
        let fini = false,
          tours = 0;
        while (!fini && tours < 3000) {
          await new Promise((res) => setTimeout(res, 2000));
          tours++;
          try {
            const rs = await fetch(`${API_BASE}/api/bytel/sync/status?period=${p}`);
            if (!rs.ok) continue;
            const st = await rs.json();
            setSyncEtat(st);
            setProgres(st);
            if (
              st.statut !== "EN_COURS" &&
              st.statut !== "EN_ATTENTE" &&
              st.statut !== "ANNULATION_DEMANDEE"
            ) {
              fini = true;
              if (Array.isArray(st.erreurs) && st.erreurs.length > 0)
                flashErr(
                  `${st.erreurs[0]}${st.erreurs.length > 1 ? ` (+${st.erreurs.length - 1} autres)` : ""}`
                );
              else flash(`Synchronisation de ${p} terminée. ${st.messageFinal || ""}`);
              setRefresh((x) => x + 1);
            }
          } catch {
            /* on retente */
          }
        }
      } catch (e: any) {
        flashErr(`Synchronisation impossible : ${e?.message || e}`);
      } finally {
        setSyncing(false);
        setProgres(null);
      }
    },
    [flash, flashErr]
  );

  const annulerSync = async () => {
    try {
      await fetch(`${API_BASE}/api/bytel/sync/annuler?period=${periode}`, { method: "POST" });
    } catch {
      /* ignore */
    }
  };

  // ---------------- Export Excel ----------------
  const suivreExport = async (id: string, cle: string, nomDefaut: string, videMsg: string) => {
    let tours = 0;
    while (tours++ < 2400) {
      await new Promise((res) => setTimeout(res, 1500));
      try {
        const rs = await fetch(`${API_BASE}/api/bytel/export/${id}/status`);
        if (!rs.ok) continue;
        const st = await rs.json();
        setExportEtat((x: any) => ({ ...(x || {}), ...st, cle }));
        if (st.statut === "TERMINE") {
          if (!st.ecrites && cle !== "EQUIPE") {
            flashErr(videMsg);
            return false;
          }
          telechargerUrl(`${API_BASE}/api/bytel/export/${id}/fichier`, st.nomFichier || nomDefaut);
          flash(
            `Extraction terminée : ${st.ecrites ?? 0} lignes en ${st.dureeSecondes ?? "?"}s${
              st.tronque ? " · limite Excel atteinte, fichier tronqué" : ""
            }.`
          );
          return true;
        }
        if (st.statut === "ERREUR" || st.statut === "INCONNU") {
          flashErr(`Export en échec : ${st.erreur || st.statut}`);
          return false;
        }
      } catch {
        /* on retente */
      }
    }
    return false;
  };

  const lancerExport = async (
    ongletExport: "INTERVENTIONS" | "VERSIONS" | "VERSIONS_EPS",
    filtres: any,
    cle: string,
    libelle: string
  ) => {
    if (exportEtat) return false;
    setExportEtat({ statut: "EN_COURS", cle, libelle, ecrites: 0, total: 0, pourcentage: 0 });
    try {
      const r = await fetch(`${API_BASE}/api/bytel/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onglet: ongletExport, filtres }),
      });
      const d = await r.json().catch(() => null);
      if (!d?.id) {
        flashErr(`Export impossible : ${d?.erreur || "réponse inattendue"}`);
        return false;
      }
      return await suivreExport(
        d.id,
        cle,
        "export_bytel.xlsx",
        "Aucune ligne à exporter : l'export lit la copie synchronisée de l'API, synchronisez le mois d'abord."
      );
    } catch (e: any) {
      flashErr(`Export impossible : ${e?.message || e}`);
      return false;
    } finally {
      setExportEtat(null);
    }
  };

  const extraireExcel = () =>
    onglet === "LISTE"
      ? lancerExport("INTERVENTIONS", filtresListe(), "INTERVENTIONS", "Extraction de la grille")
      : lancerExport(
          versParEps ? "VERSIONS_EPS" : "VERSIONS",
          filtresVersions(),
          "VERSIONS",
          "Extraction des versions"
        );

  const exporterAlertesAttente = () =>
    lancerExport(
      "INTERVENTIONS",
      {
        year: String(year),
        month: String(month),
        qualif: secteur,
        epsList: alertes.attente,
        page: 0,
        size: 50,
      },
      "ALERTE_ATTENTE",
      "Export des EPS en attente"
    );
  const exporterAlertesCommentaires = () =>
    lancerExport(
      "VERSIONS_EPS",
      {
        year: String(year),
        month: String(month),
        qualif: secteur,
        epsList: alertes.commentaires,
        modeEtat: "COURANTE",
        page: 0,
        size: 20,
      },
      "ALERTE_COMMENTAIRES",
      "Export des commentaires figés"
    );

  const lancerGlobalTrack = async () => {
    const liste = parserListe(trackTexte);
    if (!liste.length && !trackEtat) {
      flashErr("Fournissez des EPS ou un état.");
      return;
    }
    const ok = await lancerExport(
      "VERSIONS_EPS",
      {
        year: String(trackAnnee),
        month: String(trackMois),
        etat: trackEtat,
        qualif: secteur,
        epsList: liste,
        modeEtat: trackMode,
        page: 0,
        size: 20,
      },
      "TRACK",
      "Global Track"
    );
    if (ok) {
      setTrackOuvert(false);
      setTrackTexte("");
      setTrackEtat("");
    }
  };

  const lancerExportEquipe = async () => {
    const liste = parserListe(equipeTexte);
    if (!liste.length) {
      flashErr("Collez au moins un EPS.");
      return;
    }
    if (exportEtat) return;
    setExportEtat({
      statut: "EN_COURS",
      cle: "EQUIPE",
      libelle: "Team Export",
      ecrites: 0,
      total: liste.length,
      pourcentage: 0,
    });
    try {
      const r = await fetch(`${API_BASE}/api/bytel/export/equipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epsList: liste,
          year: String(equipeAnnee),
          month: String(equipeMois),
          seulementDecisions: equipeDecisionsSeules,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!d?.id) {
        flashErr(`Export équipe impossible : ${d?.erreur || "réponse inattendue"}`);
        return;
      }
      if (await suivreExport(d.id, "EQUIPE", "export_equipe.xlsx", "")) setEquipeOuvert(false);
    } catch (e: any) {
      flashErr(`Export équipe impossible : ${e?.message || e}`);
    } finally {
      setExportEtat(null);
    }
  };

  useEffect(() => {
    if (!trackOuvert) return;
    fetch(`${API_BASE}/api/bytel/etats?year=${trackAnnee}&month=${trackMois}`)
      .then((r) => r.json())
      .then((d) => setTrackEtats(d || []))
      .catch(() => setTrackEtats([]));
  }, [trackOuvert, trackAnnee, trackMois]);

  // ---------------- Omni Search ----------------
  const lancerOmni = async () => {
    const liste = parserListe(omniTexte);
    if (!liste.length) return;
    setOmniEnCours(true);
    setOmniRes(null);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/omni`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epsList: liste }),
      });
      const d = await r.json();
      if (d.erreur) flashErr(d.erreur);
      else setOmniRes(d);
    } catch (e: any) {
      flashErr(`Omni Search impossible : ${e?.message || e}`);
    } finally {
      setOmniEnCours(false);
    }
  };
  const exporterOmni = async () => {
    const liste = parserListe(omniTexte);
    if (!liste.length) return;
    setOmniExport(true);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/omni/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epsList: liste }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      telechargerBlob(await r.blob(), `Omni_Search_API_${liste.length}_EPS.xlsx`);
      flash(`OMNI SEARCH EXTRAIT : ${liste.length} EPS lus en direct dans l'API.`);
    } catch (e: any) {
      flashErr(`Export Omni impossible : ${e?.message || e}`);
    } finally {
      setOmniExport(false);
    }
  };

  // ---------------- Purge ----------------
  const purger = async () => {
    if (!periodeExacte || purgeSaisie.trim() !== periode) return;
    setPurgeEnCours(true);
    setPurgeRes(null);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/purge?period=${periode}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setPurgeRes(d);
        flash(
          `SYSTÈME : copie locale de ${periode} purgée (${d.epsSupprimes} EPS, ${d.versionsSupprimees} versions). Décisions Kyntus conservées.`
        );
        setSelection(new Set());
        setRefresh((x) => x + 1);
      } else flashErr(d.erreur || `Purge refusée (HTTP ${r.status}).`);
    } catch (e: any) {
      flashErr(`Purge impossible : ${e?.message || e}`);
    } finally {
      setPurgeEnCours(false);
    }
  };

  // ---------------- Actions ----------------
  const ouvrirAction = (row: any, t: "VALIDATION" | "CONTESTATION") => {
    setCible(row);
    setActionType(t);
    setCommentaire(t === "VALIDATION" ? "RAS" : "");
    setNouveauType(row.typeIntervention || "");
    setNouveauRacc(row.typeRaccordement || "");
    setApercu(null);
  };

  const chargerApercu = async () => {
    if (!cible) return;
    try {
      const p = new URLSearchParams({
        qualificationId: cible.qualificationId,
        period: cible.periode || periode,
      });
      if (nouveauType) p.append("typeInterventionApres", nouveauType);
      if (nouveauRacc) p.append("typeRaccordementApres", nouveauRacc);
      const r = await fetch(`${API_BASE}/api/bytel/actions/apercu?${p}`);
      if (r.ok) setApercu(await r.json());
    } catch {
      flashErr("Aperçu indisponible.");
    }
  };

  const envoyerAction = async () => {
    if (!cible) return;
    if (actionType === "CONTESTATION" && !commentaire.trim()) {
      flashErr("Commentaire obligatoire.");
      return;
    }
    setEnvoiEnCours(true);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualificationId: cible.qualificationId,
          period: cible.periode || periode,
          actionType,
          commentaire: commentaire.trim(),
          typeInterventionApres: nouveauType || null,
          typeRaccordementApres: nouveauRacc || null,
          auteur,
          snapshot: cible?.versions?.[0]?.brut ?? null,
          eps: cible.idIntervention,
        }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        flash(
          d.envoye
            ? `${actionType} envoyée (HTTP ${d.httpStatus})`
            : `${actionType} enregistrée. Envoi Bytel désactivé.`
        );
        setCible(null);
        setRefresh((x) => x + 1);
      } else flashErr(d.message || d.erreur || "Action refusée.");
    } catch {
      flashErr("Erreur réseau.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const executerLot = async () => {
    if (selection.size === 0) return;
    if (lotType === "CONTESTATION" && !lotCommentaire.trim()) {
      flashErr("Commentaire obligatoire.");
      return;
    }
    setLotEnCours(true);
    setLotResultat(null);
    try {
      const parPeriode: Record<string, string[]> = {};
      for (const cle of Array.from(selection)) {
        const [qid, per] = cle.split("|");
        (parPeriode[per || periode] ||= []).push(qid);
      }
      const cumul = { traites: 0, succes: 0, echecs: 0, details: [] as any[] };
      for (const [pp, ids] of Object.entries(parPeriode)) {
        const r = await fetch(`${API_BASE}/api/bytel/actions/lot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qualificationIds: ids,
            period: pp,
            actionType: lotType,
            commentaire: lotCommentaire.trim(),
            auteur,
          }),
        });
        const d = await r.json();
        cumul.traites += d.traites || 0;
        cumul.succes += d.succes || 0;
        cumul.echecs += d.echecs || 0;
        cumul.details.push(...(d.details || []));
      }
      setLotResultat(cumul);
      flash(`Lot : ${cumul.succes} succès, ${cumul.echecs} échecs.`);
      setSelection(new Set());
      setRefresh((x) => x + 1);
    } catch {
      flashErr("Erreur réseau.");
    } finally {
      setLotEnCours(false);
    }
  };

  // ---------------- Chronologie ----------------
  const voirTimeline = async (eps: string, ligne?: any) => {
    const per = ligne?.periode || (periodeExacte ? periode : "");
    if (!per) {
      setEpsInput(eps);
      setOnglet("LISTE");
      flash(`Choisissez une période précise pour la chronologie de ${eps} : filtre appliqué.`);
      return;
    }
    setTimelinePeriode(per);
    setTimelineEps(eps);
    setLoadingTimeline(true);
    setTimeline([]);
    try {
      if (ligne?.versions?.length) {
        const versions: any[] = [...ligne.versions]
          .sort((a: any, b: any) =>
            String(a.dateQualification || "").localeCompare(String(b.dateQualification || ""))
          )
          .map((v: any) => ({
            source: "BYTEL",
            version: v.version,
            courante: v.courante,
            date: v.dateQualification,
            qualificationId: v.qualificationId,
            etat: v.etat,
            typeQualification: v.typeQualification,
            typeIntervention: v.typeIntervention,
            typeRaccordement: v.typeRaccordement,
            montant: v.montant,
            etape: v.etapeType,
            avis: v.etapeAvis,
            acteur: v.etapeActeur,
            commentaire: v.etapeCommentaire,
            elements: v.elements,
          }));
        try {
          const r = await fetch(`${API_BASE}/api/bytel/history/eps/${eps}?period=${per}`);
          if (r.ok) {
            for (const a of await r.json()) {
              if (a.actionType === "SYNC_ETAT" || a.actionType === "ETAT_INITIAL") continue;
              versions.push({
                source: "KYNTUS",
                version: a.versionNo,
                courante: false,
                date: a.actionAt,
                qualificationId: a.qualificationId,
                actionType: a.actionType,
                etat: a.etatApres,
                typeIntervention: a.typeInterventionApres,
                typeRaccordement: a.typeRaccordementApres,
                montant: a.montant,
                commentaire: a.commentaire,
                acteur: a.auteur,
                statutEnvoi: a.statutEnvoi,
                httpStatus: a.httpStatus,
              });
            }
            versions.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
          }
        } catch {
          /* les versions Bytel suffisent */
        }
        setTimeline(versions);
        return;
      }
      const r = await fetch(`${API_BASE}/api/bytel/timeline/${eps}?period=${per}`);
      if (r.ok) setTimeline(await r.json());
    } catch {
      /* silencieux */
    } finally {
      setLoadingTimeline(false);
    }
  };

  // ---------------- Tri & Filtre instantane de la table ----------------
  const toggleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === "asc") setSortDir("desc");
      else setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const renderSortIcon = (col: string) => {
    if (sortCol !== col) return <ArrowUpDown size={11} style={{ opacity: 0.45, marginLeft: 4 }} />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} color="#2563eb" style={{ marginLeft: 4 }} />
    ) : (
      <ArrowDown size={12} color="#2563eb" style={{ marginLeft: 4 }} />
    );
  };

  const displayedRows = useMemo(() => {
    let list = rows;
    if (quickFilter.trim()) {
      const q = quickFilter.trim().toLowerCase();
      list = list.filter(
        (r) =>
          String(r.idIntervention || "").toLowerCase().includes(q) ||
          String(r.etat || "").toLowerCase().includes(q) ||
          String(r.typeIntervention || "").toLowerCase().includes(q) ||
          String(r.typeRaccordement || "").toLowerCase().includes(q) ||
          String(r.etapeCommentaire || "").toLowerCase().includes(q) ||
          String(r.etapeActeur || "").toLowerCase().includes(q)
      );
    }
    if (!sortCol) return list;
    const copy = [...list];
    copy.sort((a, b) => {
      if (sortCol === "montant") {
        const na = Number(a.montant ?? 0);
        const nb = Number(b.montant ?? 0);
        return sortDir === "asc" ? na - nb : nb - na;
      }
      if (sortCol === "nbVersions") {
        const va = a.nbVersions ?? nbVersionsParEps[`${a.idIntervention}|${a.periode}`] ?? 1;
        const vb = b.nbVersions ?? nbVersionsParEps[`${b.idIntervention}|${b.periode}`] ?? 1;
        return sortDir === "asc" ? va - vb : vb - va;
      }
      const sa = String(a[sortCol] ?? "");
      const sb = String(b[sortCol] ?? "");
      const cmp = sa.localeCompare(sb, "fr", { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, quickFilter, sortCol, sortDir, nbVersionsParEps]);

  // ---------------- Selection & multi-EPS ----------------
  const cleSel = (r: any) => `${r.qualificationId}|${r.periode || periode}`;
  const toggleSel = (cle: string) =>
    setSelection((prev) => {
      const n = new Set(prev);
      n.has(cle) ? n.delete(cle) : n.add(cle);
      return n;
    });
  const actionnables = displayedRows.filter((r) => r.etat === ETAT_ACTIONNABLE);
  const toutSelectionner = () => {
    const a = actionnables.map(cleSel);
    setSelection((prev) => (prev.size === a.length ? new Set() : new Set(a)));
  };

  const ouvrirListe = (c: "LISTE" | "VERSIONS") => {
    setListeTexte((c === "LISTE" ? epsListe : versEpsListe).join("\n"));
    setListeModal(c);
  };
  const appliquerListe = () => {
    const l = parserListe(listeTexte);
    if (listeModal === "LISTE") {
      setEpsListe(l);
      setEpsInput("");
      setEpsFiltre("");
      setPage(0);
    } else {
      setVersEpsListe(l);
      setVersEps("");
      setVersPage(0);
    }
    setListeModal(null);
  };
  const collerEps = (e: React.ClipboardEvent<HTMLInputElement>, c: "LISTE" | "VERSIONS") => {
    const l = parserListe(e.clipboardData.getData("text"));
    if (l.length < 2) return;
    e.preventDefault();
    if (c === "LISTE") {
      setEpsListe(l);
      setEpsInput("");
      setEpsFiltre("");
      setPage(0);
    } else {
      setVersEpsListe(l);
      setVersEps("");
      setVersPage(0);
    }
    flash(`${l.length} EPS chargés pour la recherche multiple.`);
  };

  const resetFiltres = () => {
    setEtat("");
    setType("");
    setEpsInput("");
    setEpsListe([]);
    setTraitement("");
    setVersionsFiltre("");
    setQuickFilter("");
    setPage(0);
  };
  const filtresPoses = Boolean(
    etat || type || epsInput || traitement || versionsFiltre || epsListe.length > 0
  );

  // ---------------- Options ----------------
  const yearOptions = useMemo(
    () => [
      { value: "TOUS", label: "Toutes" },
      ...[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => ({ value: y, label: `${y}` })),
    ],
    []
  );
  const monthOptions = useMemo(
    () => [
      { value: "TOUS", label: "Tous" },
      ...Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: `M-${String(i + 1).padStart(2, "0")}`,
      })),
    ],
    []
  );
  const etatOptions = useMemo(
    () => [
      { value: "", label: "Tous les états" },
      ...etatsDispo.map((e) => ({ value: e, label: e, dotColor: couleurEtat(e) })),
    ],
    [etatsDispo]
  );
  const typeOptions = useMemo(
    () => [{ value: "", label: "Tous les types" }, ...typesDispo.map((t) => ({ value: t, label: t }))],
    [typesDispo]
  );
  const trackEtatOptions = useMemo(
    () => [
      { value: "", label: "Tous les états" },
      ...trackEtats.map((e) => ({ value: e, label: e, dotColor: couleurEtat(e) })),
    ],
    [trackEtats]
  );
  const typesPourCible = useMemo(
    () => (TYPES_PAR_QUALIF[cible?.typeQualification] || []).map((v) => ({ value: v, label: v })),
    [cible]
  );
  const colonnesDetail = useMemo(() => {
    if (secteur && ELEMENTS_PAR_QUALIF[secteur]) return ELEMENTS_PAR_QUALIF[secteur];
    const presentes = new Set<string>();
    for (const v of [...vers, ...versGroupes.flatMap((g: any) => g.versions || [])])
      Object.keys(elementsDe(v)).forEach((k) => presentes.add(k));
    const ordre = ELEMENTS_TOUS.filter((c) => presentes.has(c));
    return ordre.length ? ordre : ELEMENTS_TOUS;
  }, [secteur, vers, versGroupes]);

  const exportCle = exportEtat?.cle as string | undefined;
  const baseAlimentee = Number(stats?.totalEps || 0) > 0;

  // =====================================================================
  return (
    <main className="nx-viewport">
      <RoyalBackground />
      <NexusStyles />

      <div className="nx-stage">
        {/* ======================== 1. HERO HEADER ======================== */}
        <header
          className="nx-card"
          style={{
            padding: "1.15rem 1.45rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            overflow: "hidden",
          }}
        >
          <div className="nx-hero-stripe" />

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 15,
                background: "linear-gradient(140deg, #3b82f6 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow:
                  "0 12px 24px -6px rgba(37, 99, 235, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.35)",
              }}
            >
              <Radio size={23} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1
                  style={{
                    color: "#0f2557",
                    margin: 0,
                    fontSize: "1.7rem",
                    fontWeight: 650,
                    letterSpacing: "-0.04em",
                  }}
                >
                  API <em className="kx-serif" style={{ color: "var(--k-blue-600)" }}>Bytel</em>
                </h1>
                <span
                  className="nx-pill"
                  style={{
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    borderColor: "#a7f3d0",
                  }}
                >
                  <span className="nx-live-dot" /> LIVE API
                </span>
                {config && !config.envoiActive && (
                  <span
                    className="nx-pill"
                    style={{
                      backgroundColor: "#fffbeb",
                      color: "#b45309",
                      borderColor: "#fde68a",
                    }}
                  >
                    ENVOI BYTEL DÉSACTIVÉ
                  </span>
                )}
              </div>

              <div
                style={{
                  color: "#647a9e",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: "#2563eb",
                    display: "inline-block",
                    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.16)",
                  }}
                />
                Données lues directement dans l&apos;API Gringotts · 1 ligne = 1 EPS · période{" "}
                <strong
                  style={{
                    color: "#1d4ed8",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    padding: "1px 8px",
                    borderRadius: 10,
                    fontWeight: 800,
                  }}
                >
                  {periode}
                </strong>
              </div>
            </div>
          </div>

          {/* PROTOCOL BUTTONS */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="nx-btn nx-danger"
              disabled={!periodeExacte}
              onClick={() => {
                setPurgeSaisie("");
                setPurgeRes(null);
                setPurgeOuvert(true);
              }}
              title={
                periodeExacte
                  ? "Purger la copie locale de la période"
                  : "Choisissez une année et un mois précis"
              }
            >
              <ShieldAlert size={15} /> Purge DB
            </button>

            <button
              className="nx-btn nx-soft"
              onClick={extraireExcel}
              disabled={!!exportEtat || onglet === "DECISIONS"}
              title="Exporte toutes les lignes correspondant aux filtres de l'onglet"
            >
              <DownloadCloud size={15} />{" "}
              {exportCle === "INTERVENTIONS" || exportCle === "VERSIONS"
                ? "Extraction..."
                : "Extract Excel"}
            </button>

            <button className="nx-btn nx-soft" onClick={() => setTrackOuvert(true)}>
              <Crosshair size={15} /> Global Track
            </button>

            <button className="nx-btn nx-soft" onClick={() => setEquipeOuvert(true)}>
              <Users size={15} /> Team Export
            </button>

            <button className="nx-btn nx-sky" onClick={() => setOmniOuvert(true)}>
              <Globe size={15} /> Omni Search
            </button>

            {selection.size > 0 && (
              <button
                className="nx-btn nx-violet"
                onClick={() => {
                  setLotOuvert(true);
                  setLotResultat(null);
                }}
              >
                <ListChecks size={15} /> Traiter {selection.size}
              </button>
            )}

            <div style={{ display: "inline-flex" }}>
              <button
                className="nx-btn nx-primary"
                onClick={() => periodeExacte && synchroniser(periode, false)}
                disabled={syncing || !periodeExacte}
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                title={
                  periodeExacte
                    ? "Copie le mois depuis l'API pour les filtres, alertes et exports"
                    : "Choisissez une année et un mois précis"
                }
              >
                <CloudDownload size={15} className={syncing ? "nx-pulse" : undefined} />{" "}
                {syncing ? "Synchronisation..." : "Sync API"}
              </button>
              <button
                className="nx-btn nx-primary icon"
                onClick={() => periodeExacte && synchroniser(periode, true)}
                disabled={syncing || !periodeExacte}
                style={{
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  borderLeft: "1px solid rgba(255, 255, 255, 0.28)",
                  height: 38,
                  width: 38,
                }}
                title="Forcer : relance même si le mois est déjà à jour"
              >
                <Zap size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* ======================== 2. COMMAND & FILTER BAR ======================== */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          {/* GLOBAL CYCLE & SECTOR */}
          <div
            className="nx-card"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "0.65rem 1.05rem",
              flexWrap: "wrap",
              borderRadius: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#1d4ed8",
                fontWeight: 800,
                fontSize: "0.74rem",
              }}
            >
              <Folder size={16} />
              <span>SECTEUR</span>
            </div>
            <NexusSelect
              width="175px"
              value={secteur}
              options={SECTEURS}
              onChange={(v: string) => {
                setSecteur(v);
                setPage(0);
                setVersPage(0);
              }}
              variant="royal"
              searchable={false}
            />

            <div className="nx-divider" />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#2563eb",
                fontWeight: 800,
                fontSize: "0.74rem",
              }}
            >
              <Calendar size={16} />
              <span>CYCLE</span>
            </div>
            <NexusSelect
              width="105px"
              value={year}
              options={yearOptions}
              onChange={(v: any) => {
                setYear(v);
                setPage(0);
                setVersPage(0);
                setHistoPage(0);
              }}
              searchable={false}
            />
            <NexusSelect
              width="105px"
              value={month}
              options={monthOptions}
              onChange={(v: any) => {
                setMonth(v);
                setPage(0);
                setVersPage(0);
                setHistoPage(0);
              }}
              searchable={false}
            />
          </div>

          {/* ONGLET INTERVENTIONS FILTERS */}
          {onglet === "LISTE" && (
            <div
              className="nx-card"
              style={{
                display: "flex",
                gap: 8,
                padding: "0.65rem 1.05rem",
                alignItems: "center",
                flex: 1,
                minWidth: 340,
                flexWrap: "wrap",
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  position: "relative",
                  flex: 1,
                  minWidth: 210,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Search
                  size={16}
                  color="#2563eb"
                  style={{ position: "absolute", left: 12, pointerEvents: "none" }}
                />
                {epsListe.length === 0 ? (
                  <input
                    type="text"
                    placeholder="Rechercher un EPS... (collez-en plusieurs)"
                    value={epsInput}
                    onChange={(e) => setEpsInput(e.target.value)}
                    onPaste={(e) => collerEps(e, "LISTE")}
                    className="nx-input"
                    style={{ width: "100%", paddingLeft: "2.3rem" }}
                  />
                ) : (
                  <div
                    className="nx-input"
                    style={{
                      width: "100%",
                      paddingLeft: "2.3rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#eff6ff",
                      borderColor: "#93c5fd",
                    }}
                  >
                    <span
                      onClick={() => ouvrirListe("LISTE")}
                      style={{ cursor: "pointer", color: "#1d4ed8", fontWeight: 800 }}
                    >
                      LISTE · {epsListe.length} EPS
                    </span>
                    <X
                      size={14}
                      style={{ cursor: "pointer", color: "#dc2626", marginLeft: "auto" }}
                      onClick={() => {
                        setEpsListe([]);
                        setPage(0);
                      }}
                    />
                  </div>
                )}
              </div>

              <button className="nx-btn sm nx-soft" onClick={() => ouvrirListe("LISTE")}>
                <ListChecks size={14} /> Multi-EPS
              </button>

              <NexusSelect
                width="245px"
                value={etat}
                options={etatOptions}
                onChange={(v: string) => {
                  setEtat(v);
                  setPage(0);
                }}
                variant="sky"
              />

              <NexusSelect
                width="165px"
                value={type}
                options={typeOptions}
                onChange={(v: string) => {
                  setType(v);
                  setPage(0);
                }}
              />

              <NexusSelect
                width="150px"
                value={traitement}
                searchable={false}
                options={[
                  { value: "", label: "Traitées + non" },
                  { value: "NON_TRAITEE", label: "Non traitées" },
                  { value: "TRAITEE", label: "Traitées" },
                ]}
                onChange={(v: string) => {
                  setTraitement(v);
                  setPage(0);
                }}
              />

              <NexusSelect
                width="155px"
                value={versionsFiltre}
                options={VERSIONS_OPTIONS}
                searchable={false}
                onChange={(v: string) => {
                  setVersionsFiltre(v);
                  setPage(0);
                }}
              />

              {filtresPoses && (
                <button className="nx-btn sm nx-danger" onClick={resetFiltres}>
                  <X size={14} /> Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* ======================== 3. TELEMETRY & SYNC STATUS BAR ======================== */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            fontSize: "0.75rem",
            fontWeight: 700,
          }}
        >
          {onglet === "LISTE" && (
            <span
              className="nx-pill"
              style={{
                padding: "5px 12px",
                background: mode === "DIRECT" ? "#ecfdf5" : "#eff6ff",
                borderColor: mode === "DIRECT" ? "#a7f3d0" : "#bfdbfe",
                color: mode === "DIRECT" ? "#059669" : "#1d4ed8",
              }}
            >
              {mode === "DIRECT" ? <Radio size={12} /> : <Database size={12} />}
              {mode === "DIRECT" ? "LECTURE DIRECTE API" : "LECTURE COPIE SYNCHRONISÉE"}
              {dureeMs != null && mode === "DIRECT" ? ` · ${dureeMs} ms` : ""}
            </span>
          )}

          {!syncing && syncEtat && (
            <span
              className="nx-pill"
              style={{
                padding: "5px 12px",
                background: "#ffffff",
                borderColor: "#cbdcf2",
                color: syncEtat.statut === "TERMINE" ? "#059669" : "#334e7b",
              }}
            >
              <History size={12} color="#2563eb" />
              {syncEtat.statut === "AUCUNE" || syncEtat.statut === "JAMAIS"
                ? baseAlimentee
                  ? `Copie locale : ${stats?.totalEps} EPS · ${stats?.totalVersions} versions`
                  : "Copie locale vide : lancez Sync API pour filtres, alertes et exports"
                : `Sync ${syncEtat.statut?.toLowerCase()}${
                    syncEtat.finAt ? ` · ${new Date(syncEtat.finAt).toLocaleString("fr-FR")}` : ""
                  } · ${stats?.totalEps ?? 0} EPS`}
            </span>
          )}

          {syncing && progres && (
            <div
              className="nx-card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0.55rem 0.95rem",
                flex: 1,
                minWidth: 320,
                borderRadius: 13,
              }}
            >
              <RefreshCw size={14} color="#2563eb" className="nx-spin" />
              <span style={{ color: "#1d4ed8", whiteSpace: "nowrap" }}>
                Sync {periode} · page {progres.pagesLues ?? 0}/{progres.pagesTotal || "?"}
              </span>
              <div
                className={`nx-progress ${!progres.pourcentage ? "indet" : ""}`}
                style={{ flex: 1 }}
              >
                <div style={{ width: `${progres.pourcentage ?? 0}%` }} />
              </div>
              <span
                style={{
                  color: "#0f2557",
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {progres.pourcentage ?? 0}%
              </span>
              <button className="nx-btn xs nx-danger" onClick={annulerSync}>
                <StopCircle size={12} /> Arrêter
              </button>
            </div>
          )}

          {exportEtat && (
            <div
              className="nx-card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0.55rem 0.95rem",
                flex: 1,
                minWidth: 320,
                borderRadius: 13,
              }}
            >
              <DownloadCloud size={14} color="#2563eb" className="nx-pulse" />
              <span style={{ color: "#1d4ed8", whiteSpace: "nowrap" }}>
                {exportEtat.libelle || "Export"}
              </span>
              <div
                className={`nx-progress ${!exportEtat.pourcentage ? "indet" : ""}`}
                style={{ flex: 1 }}
              >
                <div style={{ width: `${exportEtat.pourcentage ?? 0}%` }} />
              </div>
              <span
                style={{
                  color: "#0f2557",
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {exportEtat.ecrites ?? 0} / {exportEtat.total || "?"}
              </span>
            </div>
          )}
        </div>

        {/* ======================== 4. FLASH MESSAGES ======================== */}
        {msg && (
          <div
            className="nx-panel"
            style={{
              color: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0.85rem 1.2rem",
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderLeft: "4px solid #2563eb",
              borderRadius: 14,
              boxShadow: "0 8px 20px -10px rgba(37, 99, 235, 0.25)",
            }}
          >
            <CheckCircle size={19} color="#2563eb" />
            <span style={{ fontSize: "0.84rem", fontWeight: 800 }}>{msg}</span>
          </div>
        )}
        {erreur && (
          <div
            className="nx-panel"
            style={{
              color: "#991b1b",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "0.85rem 1.2rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderLeft: "4px solid #dc2626",
              borderRadius: 14,
              wordBreak: "break-word",
            }}
          >
            <AlertTriangle size={19} color="#dc2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.83rem", fontWeight: 700 }}>{erreur}</span>
            <X
              size={16}
              style={{ marginLeft: "auto", cursor: "pointer", flexShrink: 0 }}
              onClick={() => setErreur("")}
            />
          </div>
        )}

        {/* ======================== 5. ALERTES ======================== */}
        <AlertBanners
          scan={scanAlertes}
          attente={alertes.attente}
          commentaires={alertes.commentaires}
          base={baseAlimentee}
          aDesDonnees={baseAlimentee}
          exportEnCours={exportCle || null}
          onExportAttente={exporterAlertesAttente}
          onExportCommentaires={exporterAlertesCommentaires}
          onEps={(e) => voirTimeline(e)}
          flash={flash}
        />

        {/* ======================== 6. KPI CHIPS PAR ETAT ======================== */}
        {stats && baseAlimentee && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div
              className="nx-chip"
              style={{
                cursor: "default",
                color: "#1e3a8a",
                borderColor: "#bfdbfe",
                background: "#eff6ff",
              }}
            >
              <Layers size={14} color="#2563eb" /> <strong>{stats.totalEps}</strong> EPS ·{" "}
              <strong>{stats.totalVersions}</strong> versions ·{" "}
              <strong style={{ color: "#059669" }}>{stats.traitees}</strong> traités
            </div>

            {Object.entries(stats.parEtat || {}).map(([k, v]: any) => {
              const c = couleurEtat(k);
              const isActive = etat === k;
              return (
                <div
                  key={k}
                  className={`nx-chip ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setEtat(isActive ? "" : k);
                    setPage(0);
                    setOnglet("LISTE");
                  }}
                  style={{
                    color: isActive ? "#1e3a8a" : "#334e7b",
                    borderColor: isActive ? "#2563eb" : "#cbdcf2",
                  }}
                >
                  <span className="nx-dot" style={{ background: c }} />
                  <span>{k}</span> · <strong style={{ color: "#0f2557" }}>{v.nb}</strong> ·{" "}
                  <span style={{ color: "#2563eb", fontFamily: "var(--k-font-mono)" }}>
                    {fmtMontant(v.montant)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ======================== 7. ONGLETS ======================== */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div className="nx-tabs">
            <div
              className={`nx-tab ${onglet === "LISTE" ? "on" : ""}`}
              onClick={() => setOnglet("LISTE")}
            >
              <Database size={15} /> Interventions <span className="count">{totalItems}</span>
            </div>
            <div
              className={`nx-tab ${onglet === "VERSIONS" ? "on" : ""}`}
              onClick={() => setOnglet("VERSIONS")}
            >
              <GitCommit size={15} /> Historique / Versions
            </div>
            <div
              className={`nx-tab ${onglet === "DECISIONS" ? "on" : ""}`}
              onClick={() => setOnglet("DECISIONS")}
            >
              <Gavel size={15} /> Décisions Kyntus
            </div>
          </div>

          {onglet === "LISTE" && epsListe.length > 0 && (
            <span className="nx-pill">Recherche multiple active ({epsListe.length} EPS)</span>
          )}
        </div>

        {onglet === "LISTE" && epsListe.length > 0 && mode === "BASE" && (
          <BandeauIntrouvables demandes={epsListe.length} manquants={introuvables} flash={flash} />
        )}

        {/* ======================== 8. ONGLET INTERVENTIONS ======================== */}
        {onglet === "LISTE" && (
          <DataGrid
            titre="API DATAGRID · INTERVENTIONS"
            total={totalItems}
            unite="EPS"
            chargement={loading}
            density={density}
            setDensity={setDensity}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
            messageChargement={
              <>
                SYNCHRONISATION DE LA DATAMATRIX...
                {patience && (
                  <div style={{ color: "#d97706", marginTop: 8, fontSize: "0.78rem" }}>
                    {patience}
                  </div>
                )}
              </>
            }
            vide={displayedRows.length === 0}
            messageVide={
              quickFilter
                ? `Aucun EPS ne correspond à "${quickFilter}" sur cette page`
                : `Aucun EPS pour ${periode}`
            }
            sousMessageVide={
              mode === "BASE"
                ? "Ajustez les filtres, ou lancez Sync API pour alimenter la copie locale."
                : "L'API ne renvoie rien pour cette période."
            }
            badgeLive={
              <div
                className="nx-pill"
                style={{
                  padding: "5px 11px",
                  background: mode === "DIRECT" ? "#ecfdf5" : "#eff6ff",
                  borderColor: mode === "DIRECT" ? "#a7f3d0" : "#bfdbfe",
                  color: mode === "DIRECT" ? "#059669" : "#1d4ed8",
                }}
              >
                <span
                  className="nx-dot"
                  style={{
                    background: mode === "DIRECT" ? "#059669" : "#2563eb",
                    animation: "nxBlink 2s infinite",
                  }}
                />{" "}
                {mode === "DIRECT" ? "LIVE API" : "SYNC COPY"}
              </div>
            }
            page={page}
            totalPages={totalPages}
            setPage={setPage}
            taille={size}
            setTaille={setSize}
          >
            <table className="nx-table">
              <thead>
                <tr>
                  <th className="sticky-left" style={{ width: 38, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      className="nx-check"
                      onChange={toutSelectionner}
                      disabled={actionnables.length === 0}
                      checked={selection.size > 0 && selection.size === actionnables.length}
                    />
                  </th>
                  <th
                    className={`sortable ${sortCol === "idIntervention" ? "sorted" : ""}`}
                    onClick={() => toggleSort("idIntervention")}
                  >
                    Target EPS {renderSortIcon("idIntervention")}
                  </th>
                  <th
                    className={`sortable ${sortCol === "nbVersions" ? "sorted" : ""}`}
                    onClick={() => toggleSort("nbVersions")}
                  >
                    Ver {renderSortIcon("nbVersions")}
                  </th>
                  <th
                    className={`sortable ${sortCol === "etat" ? "sorted" : ""}`}
                    onClick={() => toggleSort("etat")}
                  >
                    Core Status {renderSortIcon("etat")}
                  </th>
                  <th
                    className={`sortable ${sortCol === "typeQualification" ? "sorted" : ""}`}
                    onClick={() => toggleSort("typeQualification")}
                  >
                    Secteur {renderSortIcon("typeQualification")}
                  </th>
                  <th
                    className={`sortable ${sortCol === "typeIntervention" ? "sorted" : ""}`}
                    onClick={() => toggleSort("typeIntervention")}
                  >
                    Type {renderSortIcon("typeIntervention")}
                  </th>
                  <th
                    className={`sortable ${sortCol === "typeRaccordement" ? "sorted" : ""}`}
                    onClick={() => toggleSort("typeRaccordement")}
                  >
                    Racc {renderSortIcon("typeRaccordement")}
                  </th>
                  <th
                    className={`sortable ${sortCol === "montant" ? "sorted" : ""}`}
                    onClick={() => toggleSort("montant")}
                    style={{ textAlign: "right" }}
                  >
                    Montant {renderSortIcon("montant")}
                  </th>
                  <th>Pilot Log (Commentaire)</th>
                  <th
                    className={`sortable ${sortCol === "etapeActeur" ? "sorted" : ""}`}
                    onClick={() => toggleSort("etapeActeur")}
                  >
                    Acteur {renderSortIcon("etapeActeur")}
                  </th>
                  <th
                    className={`sortable ${sortCol === "dateQualification" ? "sorted" : ""}`}
                    onClick={() => toggleSort("dateQualification")}
                  >
                    Timestamp {renderSortIcon("dateQualification")}
                  </th>
                  <th className="sticky-right" style={{ width: 215 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((r, idx) => {
                  const act = r.etat === ETAT_ACTIONNABLE;
                  const nbv = r.nbVersions ?? nbVersionsParEps[`${r.idIntervention}|${r.periode}`] ?? 1;
                  const sel = selection.has(cleSel(r));
                  const isCopied = copiedEps === r.idIntervention;
                  return (
                    <tr
                      key={`${r.id ?? r.idIntervention}-${r.periode}-${idx}`}
                      className={sel ? "sel" : ""}
                      style={{ animationDelay: `${Math.min(idx * 10, 200)}ms` }}
                    >
                      <td className="sticky-left" style={{ textAlign: "center" }}>
                        {act && (
                          <input
                            type="checkbox"
                            className="nx-check"
                            checked={sel}
                            onChange={() => toggleSel(cleSel(r))}
                          />
                        )}
                      </td>
                      <td>
                        <div className="nx-eps-group">
                          <span
                            className="nx-eps"
                            onClick={() => voirTimeline(r.idIntervention, r)}
                            title="Voir la chronologie complète"
                          >
                            <Crosshair size={12} color="#2563eb" />
                            {r.idIntervention}
                          </span>
                          <button
                            type="button"
                            className="nx-copy-mini"
                            onClick={(e) => copyEpsCode(r.idIntervention, e)}
                            title="Copier l'EPS"
                            style={
                              isCopied
                                ? {
                                    opacity: 1,
                                    background: "#059669",
                                    borderColor: "#059669",
                                    color: "#fff",
                                  }
                                : undefined
                            }
                          >
                            {isCopied ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <BadgeVersions n={nbv} onClick={() => voirTimeline(r.idIntervention, r)} />
                      </td>
                      <td>
                        <BadgeEtat etat={r.etat} />
                      </td>
                      <td style={{ color: "#334e7b", fontSize: "0.74rem", fontWeight: 800 }}>
                        {libelleSecteur(r.typeQualification)}
                      </td>
                      <td style={{ color: "#1e40af", fontWeight: 700 }}>
                        {r.typeIntervention || "-"}
                      </td>
                      <td style={{ color: "#0369a1", fontWeight: 600 }}>
                        {r.typeRaccordement || "-"}
                      </td>
                      <td className="num" style={{ color: "#0f2557", fontWeight: 800 }}>
                        {fmtMontant(r.montant)}
                      </td>
                      <td style={{ maxWidth: 270 }}>
                        <div
                          title={r.etapeCommentaire || ""}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: r.etapeCommentaire ? "#0f2557" : "#94a3b8",
                            fontSize: "0.76rem",
                            fontWeight: r.etapeCommentaire ? 500 : 400,
                          }}
                        >
                          {r.etapeCommentaire || "—"}
                        </div>
                      </td>
                      <td style={{ color: "#334e7b", fontSize: "0.74rem", fontWeight: 600 }}>
                        {r.etapeActeur || "-"}
                      </td>
                      <td
                        style={{
                          color: "#647a9e",
                          fontSize: "0.72rem",
                          whiteSpace: "nowrap",
                          fontFamily: "var(--k-font-mono)",
                          fontWeight: 600,
                        }}
                      >
                        {fmtDate(r.dateQualification)}
                      </td>
                      <td className="sticky-right">
                        <div style={{ display: "flex", gap: 5 }}>
                          {act && (
                            <>
                              <button
                                className="nx-btn xs nx-ok"
                                onClick={() => ouvrirAction(r, "VALIDATION")}
                              >
                                <ThumbsUp size={11} /> Valider
                              </button>
                              <button
                                className="nx-btn xs nx-warn"
                                onClick={() => ouvrirAction(r, "CONTESTATION")}
                              >
                                <ThumbsDown size={11} /> Contester
                              </button>
                            </>
                          )}
                          <button
                            className="nx-btn xs nx-soft"
                            onClick={() => voirTimeline(r.idIntervention, r)}
                            title="Chronologie complète"
                          >
                            <History size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataGrid>
        )}

        {/* ======================== 9. ONGLET VERSIONS ======================== */}
        {onglet === "VERSIONS" && (
          <>
            <div
              className="nx-card"
              style={{
                display: "flex",
                gap: 9,
                padding: "0.75rem 1.15rem",
                alignItems: "center",
                flexWrap: "wrap",
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  minWidth: 200,
                }}
              >
                <Search
                  size={16}
                  color="#2563eb"
                  style={{ position: "absolute", left: 11, pointerEvents: "none" }}
                />
                {versEpsListe.length === 0 ? (
                  <input
                    className="nx-input"
                    placeholder="EPS..."
                    value={versEps}
                    style={{ paddingLeft: "2.2rem", width: 200 }}
                    onChange={(e) => {
                      setVersEps(e.target.value);
                      setVersPage(0);
                    }}
                    onPaste={(e) => collerEps(e, "VERSIONS")}
                  />
                ) : (
                  <div
                    className="nx-input"
                    style={{
                      paddingLeft: "2.2rem",
                      width: 200,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      background: "#eff6ff",
                      borderColor: "#93c5fd",
                    }}
                  >
                    <span
                      onClick={() => ouvrirListe("VERSIONS")}
                      style={{ cursor: "pointer", color: "#1d4ed8", fontWeight: 800 }}
                    >
                      LISTE · {versEpsListe.length}
                    </span>
                    <X
                      size={14}
                      style={{ cursor: "pointer", color: "#dc2626", marginLeft: "auto" }}
                      onClick={() => {
                        setVersEpsListe([]);
                        setVersPage(0);
                      }}
                    />
                  </div>
                )}
              </div>

              <button className="nx-btn sm nx-soft" onClick={() => ouvrirListe("VERSIONS")}>
                <ListChecks size={14} /> Multi-EPS
              </button>

              <NexusSelect
                width="245px"
                value={versEtat}
                options={etatOptions}
                onChange={(v: string) => {
                  setVersEtat(v);
                  setVersPage(0);
                }}
                variant="sky"
              />

              {versParEps && (
                <NexusSelect
                  width="225px"
                  value={versModeEtat}
                  searchable={false}
                  options={[
                    { value: "COURANTE", label: "État : version courante" },
                    { value: "PREMIERE", label: "État : première version" },
                    { value: "TOUTE", label: "État : une version quelconque" },
                  ]}
                  onChange={(v: any) => {
                    setVersModeEtat(v);
                    setVersPage(0);
                  }}
                />
              )}

              <span className="nx-eyebrow">Du</span>
              <input
                type="date"
                className="nx-input"
                value={versDebut}
                onChange={(e) => {
                  setVersDebut(e.target.value);
                  setVersPage(0);
                }}
              />
              <span className="nx-eyebrow">au</span>
              <input
                type="date"
                className="nx-input"
                value={versFin}
                onChange={(e) => {
                  setVersFin(e.target.value);
                  setVersPage(0);
                }}
              />

              <div style={{ marginLeft: "auto", display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button
                  className={`nx-btn sm ${versDetail ? "nx-primary" : "nx-soft"}`}
                  onClick={() => setVersDetail((v) => !v)}
                >
                  <Layers size={14} />{" "}
                  {versDetail ? "Masquer facturation" : "Détail facturation"}
                </button>
                <button
                  className={`nx-btn sm ${versParEps ? "nx-primary" : "nx-soft"}`}
                  onClick={() => {
                    setVersParEps((v) => !v);
                    setVersPage(0);
                  }}
                >
                  <GitCommit size={14} /> {versParEps ? "Vue par EPS" : "Vue par version"}
                </button>
                <button className="nx-btn sm nx-sky" onClick={chargerVersions}>
                  <Filter size={14} /> Filtrer
                </button>
              </div>
            </div>

            {versEpsListe.length > 0 && (
              <BandeauIntrouvables
                demandes={versEpsListe.length}
                manquants={versIntrouvables}
                flash={flash}
              />
            )}

            <DataGrid
              titre={versParEps ? "HISTORIQUE PAR EPS" : "FLUX DES VERSIONS"}
              accent="#1d4ed8"
              icone={<GitCommit size={17} color="#fff" />}
              total={versTotal}
              unite={versParEps ? "EPS" : "VERSIONS"}
              chargement={versLoading}
              density={density}
              setDensity={setDensity}
              vide={versParEps ? versGroupes.length === 0 : vers.length === 0}
              messageVide="Aucune version pour ces critères"
              sousMessageVide="L'historique lit la copie synchronisée de l'API : lancez Sync API sur la période."
              page={versPage}
              totalPages={versTotalPages}
              setPage={setVersPage}
            >
              <table className="nx-table">
                <thead>
                  <tr>
                    {versParEps ? (
                      <th style={{ width: 70 }}>Ver</th>
                    ) : (
                      <>
                        <th>EPS</th>
                        <th>Rang</th>
                      </>
                    )}
                    <th>Date</th>
                    <th>État</th>
                    <th>Secteur</th>
                    <th>Type</th>
                    {!versDetail && <th>Racc</th>}
                    {!versParEps && <th>Période</th>}
                    {versDetail &&
                      colonnesDetail.map((c) => (
                        <th key={c} style={{ textAlign: "right" }}>
                          {c}
                        </th>
                      ))}
                    {versDetail && <th style={{ textAlign: "right" }}>Total</th>}
                    {!versDetail && <th style={{ textAlign: "right" }}>Montant</th>}
                    <th>Étape</th>
                    <th>Avis</th>
                    <th>Acteur</th>
                    {!versDetail && <th>Commentaire</th>}
                  </tr>
                </thead>
                <tbody>
                  {versParEps
                    ? versGroupes.map((g: any) => {
                        const vs: any[] = g.versions || [];
                        const n = vs.length;
                        return (
                          <React.Fragment key={`${g.idIntervention}|${g.periode}`}>
                            <tr className="group">
                              <td colSpan={99}>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 12,
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    className="nx-eps"
                                    onClick={() =>
                                      voirTimeline(g.idIntervention, { periode: g.periode })
                                    }
                                  >
                                    <Crosshair size={12} color="#2563eb" />
                                    {g.idIntervention}
                                  </span>
                                  <span
                                    style={{
                                      color: "#1e40af",
                                      fontSize: "0.72rem",
                                      fontWeight: 800,
                                      background: "#dbeafe",
                                      padding: "2px 8px",
                                      borderRadius: 10,
                                    }}
                                  >
                                    {g.periode}
                                  </span>
                                  <BadgeVersions n={n} />
                                  <span style={{ color: "#647a9e", fontSize: "0.72rem", fontWeight: 700 }}>
                                    Actuel :
                                  </span>
                                  <BadgeEtat etat={g.etatCourant} />
                                  <span
                                    style={{
                                      color: "#334e7b",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      marginLeft: "auto",
                                      fontFamily: "var(--k-font-mono)",
                                    }}
                                  >
                                    {fmtDate(g.premiereDate)} → {fmtDate(g.derniereDate)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {vs.map((v: any, i: number) => {
                              const prec = i > 0 ? vs[i - 1] : null;
                              const ch = (a: any, b: any) => prec !== null && a !== b;
                              const el = elementsDe(v);
                              const courante = i === n - 1;
                              return (
                                <tr
                                  key={v.id}
                                  style={{
                                    background: courante ? "#f0fdf4" : undefined,
                                  }}
                                >
                                  <td
                                    style={{
                                      fontWeight: 900,
                                      fontSize: "0.72rem",
                                      color: courante ? "#059669" : "#647a9e",
                                      fontFamily: "var(--k-font-mono)",
                                    }}
                                  >
                                    {i + 1}/{n}
                                  </td>
                                  <td
                                    style={{
                                      color: "#334e7b",
                                      whiteSpace: "nowrap",
                                      fontSize: "0.74rem",
                                      fontFamily: "var(--k-font-mono)",
                                    }}
                                  >
                                    {fmtDate(v.dateQualification)}
                                  </td>
                                  <td>
                                    <BadgeEtat etat={v.etat} contour={ch(prec?.etat, v.etat)} />
                                  </td>
                                  <td style={{ color: "#334e7b", fontSize: "0.72rem", fontWeight: 700 }}>
                                    {libelleSecteur(v.typeQualification)}
                                  </td>
                                  <td
                                    style={{
                                      color: ch(prec?.typeIntervention, v.typeIntervention)
                                        ? "#d97706"
                                        : "#1e40af",
                                      fontWeight: ch(prec?.typeIntervention, v.typeIntervention)
                                        ? 900
                                        : 700,
                                    }}
                                  >
                                    {v.typeIntervention || "-"}
                                  </td>
                                  {!versDetail && (
                                    <td
                                      style={{
                                        color: ch(prec?.typeRaccordement, v.typeRaccordement)
                                          ? "#d97706"
                                          : "#0369a1",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {v.typeRaccordement || "-"}
                                    </td>
                                  )}
                                  {versDetail &&
                                    colonnesDetail.map((c) => (
                                      <td
                                        key={c}
                                        className="num"
                                        style={{
                                          color: el[c] ? "#0f2557" : "#94a3b8",
                                          fontWeight: el[c] ? 700 : 400,
                                        }}
                                      >
                                        {el[c] !== undefined ? fmtMontant(el[c]) : "-"}
                                      </td>
                                    ))}
                                  {versDetail && (
                                    <td className="num" style={{ color: "#2563eb", fontWeight: 900 }}>
                                      {fmtMontant(totalElements(el))}
                                    </td>
                                  )}
                                  {!versDetail && (
                                    <td
                                      className="num"
                                      style={{
                                        color: ch(prec?.montant, v.montant) ? "#d97706" : "#0f2557",
                                        fontWeight: 800,
                                        textDecoration: ch(prec?.montant, v.montant)
                                          ? "underline"
                                          : "none",
                                      }}
                                    >
                                      {fmtMontant(v.montant)}
                                    </td>
                                  )}
                                  <td style={{ color: "#647a9e", fontSize: "0.71rem", fontWeight: 600 }}>
                                    {(v.etapeType || "").replace("Etape", "")}
                                  </td>
                                  <td
                                    style={{
                                      color:
                                        v.etapeAvis === "CONTESTATION"
                                          ? "#d97706"
                                          : v.etapeAvis === "ACCEPTATION"
                                          ? "#059669"
                                          : "#647a9e",
                                      fontSize: "0.72rem",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {v.etapeAvis || "-"}
                                  </td>
                                  <td style={{ color: "#334e7b", fontSize: "0.72rem", fontWeight: 600 }}>
                                    {v.etapeActeur || "-"}
                                  </td>
                                  {!versDetail && (
                                    <td
                                      style={{
                                        maxWidth: 280,
                                        fontSize: "0.75rem",
                                        color:
                                          prec &&
                                          v.etapeCommentaire &&
                                          prec.etapeCommentaire === v.etapeCommentaire
                                            ? "#d97706"
                                            : "#0f2557",
                                        fontWeight:
                                          prec &&
                                          v.etapeCommentaire &&
                                          prec.etapeCommentaire === v.etapeCommentaire
                                            ? 700
                                            : 500,
                                      }}
                                    >
                                      {v.etapeCommentaire || "-"}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })
                    : vers.map((v: any) => {
                        const el = elementsDe(v);
                        return (
                          <tr key={v.id}>
                            <td>
                              <span
                                className="nx-eps"
                                onClick={() =>
                                  voirTimeline(v.idIntervention, { periode: v.periode })
                                }
                              >
                                {v.idIntervention}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  color: v.ordreApi === 0 ? "#059669" : "#647a9e",
                                  fontWeight: 800,
                                  fontSize: "0.72rem",
                                }}
                              >
                                {v.ordreApi === 0 ? "COURANTE" : `-${v.ordreApi}`}
                              </span>
                            </td>
                            <td
                              style={{
                                color: "#334e7b",
                                whiteSpace: "nowrap",
                                fontSize: "0.74rem",
                                fontFamily: "var(--k-font-mono)",
                              }}
                            >
                              {fmtDate(v.dateQualification)}
                            </td>
                            <td>
                              <BadgeEtat etat={v.etat} />
                            </td>
                            <td style={{ color: "#334e7b", fontSize: "0.72rem", fontWeight: 700 }}>
                              {libelleSecteur(v.typeQualification)}
                            </td>
                            <td style={{ color: "#1e40af", fontWeight: 700 }}>
                              {v.typeIntervention || "-"}
                            </td>
                            {!versDetail && (
                              <td style={{ color: "#0369a1", fontWeight: 600 }}>
                                {v.typeRaccordement || "-"}
                              </td>
                            )}
                            <td style={{ color: "#647a9e", fontSize: "0.72rem", fontWeight: 700 }}>
                              {v.periode}
                            </td>
                            {versDetail &&
                              colonnesDetail.map((c) => (
                                <td
                                  key={c}
                                  className="num"
                                  style={{ color: el[c] ? "#0f2557" : "#94a3b8" }}
                                >
                                  {el[c] !== undefined ? fmtMontant(el[c]) : "-"}
                                </td>
                              ))}
                            {versDetail && (
                              <td className="num" style={{ color: "#2563eb", fontWeight: 900 }}>
                                {fmtMontant(totalElements(el))}
                              </td>
                            )}
                            {!versDetail && (
                              <td className="num" style={{ color: "#0f2557", fontWeight: 800 }}>
                                {fmtMontant(v.montant)}
                              </td>
                            )}
                            <td style={{ color: "#647a9e", fontSize: "0.71rem" }}>
                              {(v.etapeType || "").replace("Etape", "")}
                            </td>
                            <td
                              style={{
                                color:
                                  v.etapeAvis === "CONTESTATION"
                                    ? "#d97706"
                                    : v.etapeAvis === "ACCEPTATION"
                                    ? "#059669"
                                    : "#647a9e",
                                fontSize: "0.72rem",
                                fontWeight: 800,
                              }}
                            >
                              {v.etapeAvis || "-"}
                            </td>
                            <td style={{ color: "#334e7b", fontSize: "0.72rem" }}>
                              {v.etapeActeur || "-"}
                            </td>
                            {!versDetail && (
                              <td style={{ maxWidth: 280, fontSize: "0.74rem", color: "#0f2557" }}>
                                {v.etapeCommentaire || "-"}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </DataGrid>
          </>
        )}

        {/* ======================== 10. ONGLET DECISIONS ======================== */}
        {onglet === "DECISIONS" && (
          <>
            <div
              className="nx-card"
              style={{
                display: "flex",
                gap: 10,
                padding: "0.75rem 1.15rem",
                alignItems: "center",
                flexWrap: "wrap",
                borderRadius: 16,
              }}
            >
              <Gavel size={17} color="#2563eb" />
              <NexusSelect
                width="195px"
                value={histoType}
                searchable={false}
                options={[
                  { value: "", label: "Toutes décisions" },
                  { value: "VALIDATION", label: "Validations", dotColor: "#059669" },
                  { value: "CONTESTATION", label: "Contestations", dotColor: "#d97706" },
                ]}
                onChange={(v: string) => {
                  setHistoType(v);
                  setHistoPage(0);
                }}
              />
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Search
                  size={16}
                  color="#2563eb"
                  style={{ position: "absolute", left: 11, pointerEvents: "none" }}
                />
                <input
                  className="nx-input"
                  placeholder="Rechercher EPS..."
                  value={histoEps}
                  onChange={(e) => {
                    setHistoEps(e.target.value);
                    setHistoPage(0);
                  }}
                  style={{ paddingLeft: "2.2rem", width: 225 }}
                />
              </div>
              <button className="nx-btn sm nx-primary" onClick={chargerDecisions}>
                <Filter size={14} /> Filtrer
              </button>
            </div>

            <DataGrid
              titre="JOURNAL DES DÉCISIONS KYNTUS"
              accent="#2563eb"
              icone={<Gavel size={17} color="#fff" />}
              total={histoTotal}
              unite="DÉCISIONS"
              chargement={histoLoading}
              density={density}
              setDensity={setDensity}
              vide={histo.length === 0}
              messageVide="Aucune décision enregistrée"
              sousMessageVide="Validez ou contestez une intervention pour alimenter ce journal."
              page={histoPage}
              totalPages={histoTotalPages}
              setPage={setHistoPage}
            >
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>EPS</th>
                    <th>UUID</th>
                    <th>Ver</th>
                    <th>Décision</th>
                    <th>État avant</th>
                    <th>État après</th>
                    <th>Paramétrage</th>
                    <th style={{ textAlign: "right" }}>Montant</th>
                    <th>Commentaire</th>
                    <th>Auteur</th>
                    <th>Envoi</th>
                  </tr>
                </thead>
                <tbody>
                  {histo.map((a) => (
                    <tr key={a.id}>
                      <td
                        style={{
                          color: "#334e7b",
                          whiteSpace: "nowrap",
                          fontSize: "0.74rem",
                          fontFamily: "var(--k-font-mono)",
                        }}
                      >
                        {fmtDate(a.actionAt)}
                      </td>
                      <td>
                        <span
                          className="nx-eps"
                          onClick={() => voirTimeline(a.idIntervention, { periode: a.periode })}
                        >
                          {a.idIntervention}
                        </span>
                      </td>
                      <td
                        style={{
                          color: "#647a9e",
                          fontSize: "0.68rem",
                          fontFamily: "var(--k-font-mono)",
                        }}
                        title={a.qualificationId}
                      >
                        {String(a.qualificationId || "").slice(0, 8)}
                      </td>
                      <td style={{ color: "#2563eb", fontWeight: 800 }}>v{a.versionNo}</td>
                      <td>
                        <span
                          className="nx-badge"
                          style={{
                            color: a.actionType === "CONTESTATION" ? "#b45309" : "#059669",
                            background: a.actionType === "CONTESTATION" ? "#fffbeb" : "#ecfdf5",
                            borderColor: a.actionType === "CONTESTATION" ? "#fde68a" : "#a7f3d0",
                          }}
                        >
                          {a.actionType}
                        </span>
                      </td>
                      <td style={{ color: "#647a9e", fontSize: "0.72rem" }}>
                        {a.etatAvant || "-"}
                      </td>
                      <td>
                        <BadgeEtat etat={a.etatApres} />
                      </td>
                      <td style={{ fontSize: "0.73rem" }}>
                        {a.typeInterventionAvant !== a.typeInterventionApres ? (
                          <span style={{ color: "#d97706", fontWeight: 700 }}>
                            {a.typeInterventionAvant} → <strong>{a.typeInterventionApres}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#334e7b", fontWeight: 600 }}>
                            {a.typeInterventionApres || "-"}
                          </span>
                        )}
                      </td>
                      <td className="num" style={{ color: "#0f2557", fontWeight: 800 }}>
                        {fmtMontant(a.montant)}
                      </td>
                      <td style={{ maxWidth: 260, fontSize: "0.75rem", color: "#0f2557" }}>
                        {a.commentaire || "-"}
                      </td>
                      <td style={{ color: "#1e40af", fontSize: "0.74rem", fontWeight: 700 }}>
                        {a.auteur}
                      </td>
                      <td>
                        <span
                          className="nx-badge"
                          style={{
                            borderColor:
                              a.statutEnvoi === "ENVOYE"
                                ? "#a7f3d0"
                                : a.statutEnvoi === "ERREUR"
                                ? "#fecaca"
                                : "#cbdcf2",
                            background:
                              a.statutEnvoi === "ENVOYE"
                                ? "#ecfdf5"
                                : a.statutEnvoi === "ERREUR"
                                ? "#fef2f2"
                                : "#f1f5f9",
                            color:
                              a.statutEnvoi === "ENVOYE"
                                ? "#059669"
                                : a.statutEnvoi === "ERREUR"
                                ? "#dc2626"
                                : "#475569",
                          }}
                        >
                          {a.statutEnvoi}
                          {a.httpStatus ? ` ${a.httpStatus}` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataGrid>
          </>
        )}
      </div>

      {/* ======================== FLOATING SELECTION DOCK ======================== */}
      {selection.size > 0 && (
        <div className="nx-floating-dock">
          <span
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: "0.75rem",
              padding: "5px 12px",
              borderRadius: 10,
            }}
          >
            {selection.size} EPS sélectionné{selection.size > 1 ? "s" : ""}
          </span>
          <button
            className="nx-btn sm nx-ok"
            onClick={() => {
              setLotType("VALIDATION");
              setLotCommentaire("RAS");
              setLotResultat(null);
              setLotOuvert(true);
            }}
          >
            <ThumbsUp size={13} /> Valider le lot
          </button>
          <button
            className="nx-btn sm nx-warn"
            onClick={() => {
              setLotType("CONTESTATION");
              setLotCommentaire("");
              setLotResultat(null);
              setLotOuvert(true);
            }}
          >
            <ThumbsDown size={13} /> Contester le lot
          </button>
          <button
            className="nx-btn sm nx-danger"
            onClick={() => setSelection(new Set())}
            title="Effacer la sélection"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* =============================== MODALES =============================== */}

      <TimelineModal
        eps={timelineEps}
        periode={timelinePeriode || periode}
        entrees={timeline}
        chargement={loadingTimeline}
        onClose={() => {
          setTimelineEps(null);
          setTimeline([]);
        }}
      />

      {/* ---------- Action unitaire ---------- */}
      <NexusModal
        ouvert={!!cible}
        onClose={() => setCible(null)}
        verrouille={envoiEnCours}
        largeur={740}
        accent="#2563eb"
        icone={actionType === "VALIDATION" ? <ThumbsUp size={19} /> : <ThumbsDown size={19} />}
        titre={
          <>
            {actionType} ·{" "}
            <span style={{ fontFamily: "var(--k-font-mono)" }}>
              {cible?.idIntervention}
            </span>
          </>
        }
        sousTitre={`Auteur : ${auteur} · période ${cible?.periode || periode}${
          config && !config.envoiActive ? " · enregistrement local seulement" : ""
        }`}
        pied={
          <button
            className={`nx-btn ${actionType === "VALIDATION" ? "nx-ok" : "nx-warn"}`}
            style={{
              width: "100%",
              justifyContent: "center",
              height: 44,
              fontSize: "0.9rem",
              fontWeight: 800,
            }}
            disabled={envoiEnCours || (actionType === "CONTESTATION" && !commentaire.trim())}
            onClick={envoyerAction}
          >
            <Send size={16} />{" "}
            {envoiEnCours ? "Traitement..." : `Confirmer la ${actionType.toLowerCase()}`}
          </button>
        }
      >
        {cible && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                ["Version", `${String(cible.qualificationId).slice(0, 13)}…`, "#0f2557"],
                ["Date", fmtDate(cible.dateQualification), "#334e7b"],
                ["État", cible.etat, couleurEtat(cible.etat)],
                ["Montant", fmtMontant(cible.montant), "#2563eb"],
              ].map(([k, v, c]) => (
                <div
                  key={k}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #dbeafe",
                    borderRadius: 12,
                    padding: "0.7rem 0.9rem",
                  }}
                >
                  <div className="nx-eyebrow">{k}</div>
                  <div style={{ color: c, fontWeight: 800, fontSize: "0.84rem", marginTop: 3 }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>

            {actionType === "CONTESTATION" && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "0.95rem 1.1rem",
                  background: "#ffffff",
                  border: "1px solid #dbeafe",
                  borderRadius: 14,
                }}
              >
                <div className="nx-label" style={{ color: "#1d4ed8", marginBottom: 10 }}>
                  Paramétrage proposé — inchangé si vous ne touchez à rien
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <div className="nx-eyebrow" style={{ marginBottom: 6 }}>
                      Type intervention (actuel : {cible.typeIntervention})
                    </div>
                    <NexusSelect
                      width="240px"
                      value={nouveauType}
                      options={typesPourCible}
                      onChange={setNouveauType}
                      variant="royal"
                    />
                  </div>
                  {cible.typeQualification === "QualificationRaccordement" && (
                    <div>
                      <div className="nx-eyebrow" style={{ marginBottom: 6 }}>
                        Type raccordement (actuel : {cible.typeRaccordement || "-"})
                      </div>
                      <NexusSelect
                        width="210px"
                        value={nouveauRacc}
                        options={TYPES_RACCORDEMENT.map((v) => ({ value: v, label: v }))}
                        onChange={setNouveauRacc}
                        variant="royal"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="nx-label" style={{ marginBottom: 7 }}>
              Commentaire{" "}
              {actionType === "CONTESTATION" && (
                <span style={{ color: "#dc2626" }}>* obligatoire</span>
              )}
            </div>
            <textarea
              className="nx-textarea"
              rows={4}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder={
                actionType === "VALIDATION" ? "RAS" : "Motif précis de la contestation..."
              }
              style={{ marginBottom: 12, background: "#ffffff" }}
            />

            <button className="nx-btn sm nx-soft" onClick={chargerApercu}>
              <Eye size={14} /> {apercu ? "Rafraîchir l'aperçu" : "Voir le corps envoyé"}
            </button>
            {apercu && (
              <div
                className="nx-scroll"
                style={{
                  marginTop: 12,
                  background: "#0f2557",
                  padding: "0.95rem",
                  borderRadius: 12,
                  border: "1px solid #1e3a8a",
                  maxHeight: 230,
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    color: "#93c5fd",
                    fontFamily: "var(--k-font-mono)",
                    fontSize: "0.7rem",
                    marginBottom: 7,
                    wordBreak: "break-all",
                  }}
                >
                  {actionType === "VALIDATION" ? apercu.urlValidation : apercu.urlContestation}
                </div>
                <pre
                  style={{
                    margin: 0,
                    color: "#e0f2fe",
                    fontSize: "0.72rem",
                    fontFamily: "var(--k-font-mono)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {JSON.stringify(apercu.payload, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </NexusModal>

      {/* ---------- Lot ---------- */}
      <NexusModal
        ouvert={lotOuvert}
        onClose={() => setLotOuvert(false)}
        verrouille={lotEnCours}
        accent="#2563eb"
        icone={<Layers size={19} />}
        titre={`Traitement par lot · ${selection.size} EPS`}
        sousTitre="Le même commentaire est appliqué à toutes les lignes, paramétrage inchangé."
        pied={
          <button
            className="nx-btn nx-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              height: 44,
              fontSize: "0.9rem",
              fontWeight: 800,
            }}
            disabled={
              lotEnCours ||
              selection.size === 0 ||
              (lotType === "CONTESTATION" && !lotCommentaire.trim())
            }
            onClick={executerLot}
          >
            <ListChecks size={16} />{" "}
            {lotEnCours ? "Traitement..." : `Exécuter sur ${selection.size} EPS`}
          </button>
        }
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["VALIDATION", "CONTESTATION"] as const).map((t) => (
            <button
              key={t}
              className={`nx-btn ${
                lotType === t ? (t === "VALIDATION" ? "nx-ok" : "nx-warn") : ""
              }`}
              onClick={() => setLotType(t)}
              style={{ flex: 1, justifyContent: "center", height: 42 }}
            >
              {t === "VALIDATION" ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />}{" "}
              {t === "VALIDATION" ? "Valider tout" : "Contester tout"}
            </button>
          ))}
        </div>
        <div
          style={{
            padding: "0.8rem 1rem",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 12,
            marginBottom: 14,
            color: "#1e3a8a",
            fontSize: "0.78rem",
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          Pour modifier un paramétrage (type, raccordement), traitez l&apos;EPS individuellement.
        </div>
        <textarea
          className="nx-textarea"
          rows={3}
          value={lotCommentaire}
          onChange={(e) => setLotCommentaire(e.target.value)}
          placeholder={lotType === "VALIDATION" ? "RAS" : "Motif commun..."}
          style={{ background: "#ffffff" }}
        />
        {lotResultat && (
          <div
            style={{
              marginTop: 14,
              padding: "0.9rem",
              background: "#ffffff",
              border: "1px solid #dbeafe",
              borderRadius: 12,
              fontSize: "0.78rem",
            }}
          >
            <div style={{ color: "#059669", marginBottom: 7, fontWeight: 800 }}>
              Succès : {lotResultat.succes} ·{" "}
              <span style={{ color: "#dc2626" }}>Échecs : {lotResultat.echecs}</span>
            </div>
            <div className="nx-scroll" style={{ maxHeight: 150, overflowY: "auto" }}>
              {(lotResultat.details || [])
                .filter((d: any) => !d.ok)
                .map((d: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      color: "#dc2626",
                      fontSize: "0.72rem",
                      marginBottom: 3,
                      fontFamily: "var(--k-font-mono)",
                    }}
                  >
                    {String(d.qualificationId).slice(0, 8)} : {d.message || d.erreur}
                  </div>
                ))}
            </div>
          </div>
        )}
      </NexusModal>

      {/* ---------- Multi-EPS ---------- */}
      {(() => {
        const detectes = parserListe(listeTexte);
        return (
          <NexusModal
            ouvert={!!listeModal}
            onClose={() => setListeModal(null)}
            accent="#2563eb"
            icone={<ListChecks size={19} />}
            largeur={640}
            titre={`Recherche Multi-EPS · ${
              listeModal === "LISTE" ? "Interventions" : "Versions"
            }`}
            sousTitre="Un EPS par ligne, ou séparés par virgules / espaces. Une colonne Excel fonctionne directement."
            pied={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    color: detectes.length > 10000 ? "#d97706" : "#1d4ed8",
                  }}
                >
                  {detectes.length} EPS distincts détectés
                  {detectes.length > 10000 && " · seuls les 10 000 premiers seront recherchés"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="nx-btn nx-danger" onClick={() => setListeTexte("")}>
                    Vider
                  </button>
                  <button className="nx-btn nx-primary" onClick={appliquerListe}>
                    <Search size={14} />{" "}
                    {detectes.length ? `Rechercher ${detectes.length} EPS` : "Retirer la liste"}
                  </button>
                </div>
              </div>
            }
          >
            <textarea
              className="nx-textarea nx-scroll"
              rows={12}
              value={listeTexte}
              onChange={(e) => setListeTexte(e.target.value)}
              placeholder={"EPS-0016243542\nEPS-0016677821\nEPS-M002973905"}
              style={{ background: "#ffffff" }}
              autoFocus
            />
          </NexusModal>
        );
      })()}

      {/* ---------- Global Track ---------- */}
      {(() => {
        const detectes = parserListe(trackTexte);
        const enCours = exportCle === "TRACK";
        return (
          <NexusModal
            ouvert={trackOuvert}
            onClose={() => setTrackOuvert(false)}
            verrouille={enCours}
            accent="#2563eb"
            icone={<Layers size={19} />}
            titre="Global Tracking Protocol"
            sousTitre="Chronologie complète (toutes versions) des EPS demandés ou de tous les EPS d'un état, en Excel."
            pied={
              <button
                onClick={lancerGlobalTrack}
                disabled={enCours || !!exportEtat || (detectes.length === 0 && !trackEtat)}
                className="nx-btn nx-primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  height: 44,
                  fontSize: "0.9rem",
                  fontWeight: 800,
                }}
              >
                {enCours
                  ? "Extraction de la timeline globale..."
                  : "Générer la timeline globale Excel"}
              </button>
            }
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 14,
                alignItems: "center",
                background: "#ffffff",
                padding: "0.85rem 1rem",
                borderRadius: 14,
                border: "1px solid #dbeafe",
                flexWrap: "wrap",
              }}
            >
              <span className="nx-pill">SECTEUR : {libelleSecteur(secteur)}</span>
              <NexusSelect
                width="120px"
                value={trackAnnee}
                options={yearOptions}
                onChange={setTrackAnnee}
                searchable={false}
              />
              <NexusSelect
                width="110px"
                value={trackMois}
                options={monthOptions}
                onChange={setTrackMois}
                searchable={false}
              />
              <NexusSelect
                width="250px"
                value={trackEtat}
                options={trackEtatOptions}
                onChange={setTrackEtat}
                variant="royal"
              />
              {trackEtat && (
                <NexusSelect
                  width="225px"
                  value={trackMode}
                  searchable={false}
                  options={[
                    { value: "COURANTE", label: "État de la version courante" },
                    { value: "PREMIERE", label: "État de la première version" },
                    { value: "TOUTE", label: "Passé par cet état" },
                  ]}
                  onChange={setTrackMode}
                />
              )}
            </div>
            <div className="nx-label" style={{ marginBottom: 8 }}>
              Liste d&apos;EPS (un par ligne ou séparés par des virgules)
            </div>
            <textarea
              className="nx-textarea nx-scroll"
              rows={7}
              value={trackTexte}
              onChange={(e) => setTrackTexte(e.target.value)}
              disabled={enCours}
              style={{ background: "#ffffff" }}
              placeholder={
                trackEtat
                  ? "✅ Filtre d'état actif : laissez vide pour extraire tous les EPS de cet état, ou collez des EPS précis."
                  : "EPS-0016243542\nEPS-0016677821\nEPS-M002973905"
              }
            />
            <div style={{ marginTop: 8, fontSize: "0.76rem", color: "#1d4ed8", fontWeight: 800 }}>
              {detectes.length} EPS détectés
            </div>
          </NexusModal>
        );
      })()}

      {/* ---------- Team Export ---------- */}
      {(() => {
        const detectes = parserListe(equipeTexte);
        const enCours = exportCle === "EQUIPE";
        return (
          <NexusModal
            ouvert={equipeOuvert}
            onClose={() => setEquipeOuvert(false)}
            verrouille={enCours}
            accent="#2563eb"
            icone={<Users size={19} />}
            titre="Team Export Protocol"
            sousTitre="Une ligne par EPS : ses commentaires d'équipe dans l'ordre chronologique et le sens de la dernière décision."
            pied={
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="nx-btn nx-danger"
                  disabled={enCours}
                  onClick={() => setEquipeTexte("")}
                >
                  Vider
                </button>
                <button
                  className="nx-btn nx-primary"
                  onClick={lancerExportEquipe}
                  disabled={enCours || !!exportEtat || detectes.length === 0}
                  style={{ flex: 1, justifyContent: "center", height: 42, fontWeight: 800 }}
                >
                  <DownloadCloud size={15} />{" "}
                  {enCours
                    ? "Extraction des timelines d'équipe..."
                    : `Générer le Team Export Excel (${detectes.length} EPS)`}
                </button>
              </div>
            }
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 14,
                alignItems: "center",
                background: "#ffffff",
                padding: "0.85rem 1rem",
                borderRadius: 14,
                border: "1px solid #dbeafe",
                flexWrap: "wrap",
              }}
            >
              <span className="nx-eyebrow">Période</span>
              <NexusSelect
                width="130px"
                value={equipeAnnee}
                options={yearOptions}
                onChange={setEquipeAnnee}
                searchable={false}
              />
              <NexusSelect
                width="120px"
                value={equipeMois}
                options={monthOptions}
                onChange={setEquipeMois}
                searchable={false}
              />
              <span style={{ color: "#647a9e", fontSize: "0.73rem", fontWeight: 600 }}>
                Toutes / Tous = toutes les périodes synchronisées
              </span>
            </div>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                marginBottom: 14,
                cursor: "pointer",
                color: "#0f2557",
                fontSize: "0.8rem",
                fontWeight: 600,
                lineHeight: 1.5,
                background: "#ffffff",
                padding: "0.75rem 1rem",
                borderRadius: 12,
                border: "1px solid #dbeafe",
              }}
            >
              <input
                type="checkbox"
                className="nx-check"
                checked={equipeDecisionsSeules}
                onChange={(e) => setEquipeDecisionsSeules(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                Seulement les commentaires commençant par « validé » ou « contest »
                <span style={{ display: "block", color: "#647a9e", fontSize: "0.73rem", fontWeight: 500 }}>
                  Décoché : tous les commentaires, y compris « RAS » et les explications détaillées.
                </span>
              </span>
            </label>

            <div className="nx-label" style={{ marginBottom: 8 }}>
              Team EPS Payload
            </div>
            <textarea
              className="nx-textarea nx-scroll"
              rows={8}
              value={equipeTexte}
              onChange={(e) => setEquipeTexte(e.target.value)}
              disabled={enCours}
              style={{ background: "#ffffff" }}
              placeholder={"EPS-0016243542\nEPS-0016677821\nEPS-M002973905"}
            />
          </NexusModal>
        );
      })()}

      {/* ---------- Omni Search (direct API) ---------- */}
      {(() => {
        const detectes = parserListe(omniTexte);
        return (
          <NexusModal
            ouvert={omniOuvert}
            onClose={() => setOmniOuvert(false)}
            verrouille={omniEnCours || omniExport}
            accent="#2563eb"
            icone={<Globe size={19} />}
            largeur={940}
            titre="Omni Search Protocol"
            sousTitre="Lecture directe dans l'API Gringotts, toutes périodes confondues, sans synchronisation."
            pied={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="nx-btn nx-danger"
                  disabled={omniEnCours}
                  onClick={() => {
                    setOmniTexte("");
                    setOmniRes(null);
                  }}
                >
                  Vider
                </button>
                <button
                  className="nx-btn nx-soft"
                  onClick={exporterOmni}
                  disabled={omniExport || omniEnCours || detectes.length === 0}
                >
                  <DownloadCloud size={15} /> {omniExport ? "Extraction..." : "Extraire en Excel"}
                </button>
                <button
                  className="nx-btn nx-primary"
                  onClick={lancerOmni}
                  disabled={omniEnCours || omniExport || detectes.length === 0}
                  style={{ flex: 1, justifyContent: "center", fontWeight: 800 }}
                >
                  <Globe size={15} />{" "}
                  {omniEnCours
                    ? `Scan de l'API (${detectes.length} EPS)...`
                    : `Exécuter l'Omni Search (${detectes.length} EPS)`}
                </button>
              </div>
            }
          >
            <div
              style={{
                marginBottom: 14,
                background: "#eff6ff",
                padding: "0.9rem 1.1rem",
                borderRadius: 13,
                border: "1px solid #bfdbfe",
              }}
            >
              <p
                style={{
                  color: "#1e3a8a",
                  margin: 0,
                  fontSize: "0.82rem",
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                <strong style={{ color: "#2563eb" }}>RECHERCHE TRANSVERSALE LIVE :</strong> ce
                protocole ignore Secteur, Année et Mois, interroge{" "}
                <span style={{ textDecoration: "underline", fontWeight: 800 }}>
                  directement l&apos;API
                </span>{" "}
                et renvoie chaque période où l&apos;EPS existe, avec toutes ses versions. Limite :
                500 EPS par recherche.
              </p>
            </div>

            <textarea
              className="nx-textarea nx-scroll"
              rows={omniRes ? 4 : 8}
              value={omniTexte}
              onChange={(e) => setOmniTexte(e.target.value)}
              disabled={omniEnCours}
              style={{ background: "#ffffff" }}
              placeholder={"EPS-0016243542\nEPS-0016677821\nEPS-M002973905"}
            />

            {omniEnCours && (
              <div style={{ marginTop: 16 }}>
                <div className="nx-progress indet">
                  <div />
                </div>
                <div
                  style={{
                    color: "#1d4ed8",
                    fontSize: "0.8rem",
                    marginTop: 8,
                    fontWeight: 700,
                  }}
                >
                  Interrogation de l&apos;API EPS par EPS... (~2 s par lot de 6)
                </div>
              </div>
            )}

            {omniRes && !omniEnCours && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <span
                    className="nx-chip"
                    style={{
                      cursor: "default",
                      color: "#1d4ed8",
                      borderColor: "#bfdbfe",
                      background: "#eff6ff",
                    }}
                  >
                    {omniRes.traites} EPS scannés · {omniRes.dureeMs} ms
                  </span>
                  <span
                    className="nx-chip"
                    style={{
                      cursor: "default",
                      color: "#059669",
                      borderColor: "#a7f3d0",
                      background: "#ecfdf5",
                    }}
                  >
                    {(omniRes.content || []).length} résultats (EPS × période)
                  </span>
                  {(omniRes.introuvables || []).length > 0 && (
                    <span
                      className="nx-chip"
                      title={(omniRes.introuvables || []).join(", ")}
                      style={{
                        color: "#b45309",
                        borderColor: "#fde68a",
                        background: "#fffbeb",
                      }}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(omniRes.introuvables.join("\n"));
                          flash("EPS introuvables copiés.");
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      <Copy size={12} /> {omniRes.introuvables.length} introuvables dans l&apos;API
                    </span>
                  )}
                  {Object.keys(omniRes.erreurs || {}).length > 0 && (
                    <span
                      className="nx-chip"
                      style={{
                        cursor: "default",
                        color: "#dc2626",
                        borderColor: "#fecaca",
                        background: "#fef2f2",
                      }}
                    >
                      {Object.keys(omniRes.erreurs).length} en erreur
                    </span>
                  )}
                  {omniRes.tronque && (
                    <span
                      className="nx-chip"
                      style={{
                        cursor: "default",
                        color: "#b45309",
                        borderColor: "#fde68a",
                      }}
                    >
                      Limite de 500 EPS atteinte
                    </span>
                  )}
                </div>

                {(omniRes.content || []).length > 0 && (
                  <div
                    className="nx-scroll"
                    style={{
                      maxHeight: "40vh",
                      overflow: "auto",
                      border: "1px solid #dbeafe",
                      borderRadius: 14,
                      background: "#ffffff",
                    }}
                  >
                    <table className="nx-table">
                      <thead>
                        <tr>
                          <th>EPS</th>
                          <th>Période</th>
                          <th>Ver</th>
                          <th>État courant</th>
                          <th>Secteur</th>
                          <th>Type</th>
                          <th style={{ textAlign: "right" }}>Montant</th>
                          <th>Acteur</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {omniRes.content.map((r: any, i: number) => (
                          <tr key={`${r.idIntervention}-${r.periode}-${i}`}>
                            <td>
                              <span
                                className="nx-eps"
                                onClick={() => voirTimeline(r.idIntervention, r)}
                              >
                                <Crosshair size={12} color="#2563eb" />
                                {r.idIntervention}
                              </span>
                            </td>
                            <td style={{ color: "#1d4ed8", fontWeight: 800, fontSize: "0.74rem" }}>
                              {r.periode}
                            </td>
                            <td>
                              <BadgeVersions
                                n={r.nbVersions || 0}
                                onClick={() => voirTimeline(r.idIntervention, r)}
                              />
                            </td>
                            <td>
                              <BadgeEtat etat={r.etat} />
                            </td>
                            <td style={{ color: "#334e7b", fontSize: "0.72rem", fontWeight: 700 }}>
                              {libelleSecteur(r.typeQualification)}
                            </td>
                            <td style={{ color: "#1e40af", fontWeight: 700 }}>
                              {r.typeIntervention || "-"}
                            </td>
                            <td className="num" style={{ color: "#0f2557", fontWeight: 800 }}>
                              {fmtMontant(r.montant)}
                            </td>
                            <td style={{ color: "#334e7b", fontSize: "0.72rem" }}>
                              {r.etapeActeur || "-"}
                            </td>
                            <td
                              style={{
                                color: "#647a9e",
                                fontSize: "0.72rem",
                                whiteSpace: "nowrap",
                                fontFamily: "var(--k-font-mono)",
                              }}
                            >
                              {fmtDate(r.dateQualification)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </NexusModal>
        );
      })()}

      {/* ---------- Purge ---------- */}
      <NexusModal
        ouvert={purgeOuvert}
        onClose={() => setPurgeOuvert(false)}
        verrouille={purgeEnCours}
        accent="#dc2626"
        icone={<Trash2 size={19} />}
        largeur={600}
        titre="Critical Override · Purge DB"
        sousTitre={`Copie locale de la période ${periode}`}
        pied={
          purgeRes ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="nx-btn"
                onClick={() => setPurgeOuvert(false)}
                style={{ flex: 1, justifyContent: "center" }}
              >
                Fermer
              </button>
              <button
                className="nx-btn nx-primary"
                onClick={() => {
                  setPurgeOuvert(false);
                  synchroniser(periode, true);
                }}
                style={{ flex: 1, justifyContent: "center" }}
              >
                <CloudDownload size={15} /> Resynchroniser depuis l&apos;API
              </button>
            </div>
          ) : (
            <button
              className="nx-btn nx-danger"
              onClick={purger}
              disabled={purgeEnCours || purgeSaisie.trim() !== periode}
              style={{ width: "100%", justifyContent: "center", height: 44, fontWeight: 800 }}
            >
              <ShieldAlert size={16} /> {purgeEnCours ? "Purge en cours..." : `Purger ${periode}`}
            </button>
          )
        }
      >
        {purgeRes ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#059669",
              fontWeight: 700,
              fontSize: "0.88rem",
            }}
          >
            <CheckCircle size={22} /> {purgeRes.epsSupprimes} EPS et {purgeRes.versionsSupprimees}{" "}
            versions supprimés de la copie locale. Les décisions Kyntus sont intactes.
          </div>
        ) : (
          <>
            <div
              style={{
                color: "#0f2557",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                marginBottom: 14,
              }}
            >
              Supprime la <strong>copie locale</strong> des EPS et versions de{" "}
              <strong style={{ color: "#dc2626" }}>{periode}</strong>. L&apos;API reste la source de
              vérité : une synchronisation recrée la période à l&apos;identique.
              <div
                style={{
                  marginTop: 10,
                  padding: "0.75rem 0.95rem",
                  borderRadius: 11,
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Les décisions Kyntus (validations, contestations) ne sont jamais supprimées.
              </div>
            </div>
            <div className="nx-label" style={{ marginBottom: 7 }}>
              Tapez{" "}
              <span style={{ color: "#dc2626", fontFamily: "var(--k-font-mono)" }}>{periode}</span> pour
              confirmer
            </div>
            <input
              className="nx-input"
              value={purgeSaisie}
              onChange={(e) => setPurgeSaisie(e.target.value)}
              placeholder={periode}
              style={{ width: "100%", fontFamily: "var(--k-font-mono)", background: "#ffffff" }}
              autoFocus
            />
          </>
        )}
      </NexusModal>
    </main>
  );
}
