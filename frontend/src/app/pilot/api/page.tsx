"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  RefreshCw, Search, X, Calendar, Folder, CheckCircle, AlertTriangle, Layers, Send, ListChecks, Eye, GitCommit,
  DownloadCloud, Users, Globe, Crosshair, ShieldAlert, Zap, History, Database, Gavel, Radio, Trash2, StopCircle,
  CloudDownload, Filter, ThumbsUp, ThumbsDown, Copy,
} from "lucide-react";
import CyberSelect from "../recorde/CyberSelect";
import InteractiveDarkCanvas from "../recorde/components/InteractiveDarkCanvas";
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

const API_BASE = "";

type Onglet = "LISTE" | "VERSIONS" | "DECISIONS";
type ModeEtat = "COURANTE" | "PREMIERE" | "TOUTE";

const BadgeEtat = ({ etat, contour }: { etat?: string | null; contour?: boolean }) => {
  const c = couleurEtat(etat);
  return (
    <span className="nx-badge" style={{ color: c, background: `${c}1a`, borderColor: contour ? "#f59e0b" : `${c}55` }}>
      <span className="nx-dot" style={{ background: c, width: 6, height: 6 }} />{etat || "-"}
    </span>
  );
};

const COULEURS_VERSION = ["#64748b", "#38bdf8", "#a855f7", "#f59e0b", "#ef4444", "#ec4899"];
const BadgeVersions = ({ n, onClick }: { n: number; onClick?: () => void }) => {
  const c = COULEURS_VERSION[Math.min(n, COULEURS_VERSION.length - 1)];
  return (
    <span onClick={onClick} className="nx-badge" title="Voir la chronologie"
      style={{ color: c, background: `${c}1a`, borderColor: `${c}55`, cursor: onClick ? "pointer" : "default", fontFamily: "'JetBrains Mono', monospace" }}>
      <GitCommit size={11} /> V{n}
    </span>
  );
};

/** Bilan d'une recherche multiple : combien d'EPS presents, lesquels introuvables. */
const BandeauIntrouvables = ({ demandes, manquants, flash }: { demandes: number; manquants: string[]; flash: (m: string) => void }) => {
  const [voir, setVoir] = useState(false);
  const nb = manquants?.length || 0;
  const c = nb ? "#f59e0b" : "#10b981";
  return (
    <div className="nx-panel" style={{ marginBottom: "1rem", padding: ".75rem 1.1rem", borderRadius: 12, fontSize: ".8rem", color: "#cbd5e1",
      background: `${c}12`, border: `1px solid ${c}4d`, borderLeft: `4px solid ${c}` }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <ListChecks size={16} color={c} />
        <span><strong style={{ color: "#f8fafc" }}>RECHERCHE MULTIPLE</strong> · {demandes} EPS demandes · <span style={{ color: "#34d399", fontWeight: 700 }}>{demandes - nb} presents</span>
          {nb > 0 && <> · <span style={{ color: "#fbbf24", fontWeight: 700 }}>{nb} introuvables sur la periode</span></>}</span>
        {nb > 0 && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button className="nx-btn xs nx-warn" onClick={() => setVoir(!voir)}>{voir ? "Masquer" : "Voir les introuvables"}</button>
            <button className="nx-btn xs nx-warn" onClick={async () => {
              try { await navigator.clipboard.writeText(manquants.join("\n")); flash(`${nb} EPS introuvables copies.`); } catch { flash("Copie impossible."); }
            }}><Copy size={11} /> Copier</button>
          </div>
        )}
      </div>
      {voir && nb > 0 && (
        <div className="nx-scroll" style={{ marginTop: 10, maxHeight: 130, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {manquants.map(e => <span key={e} style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(245,158,11,.12)", color: "#fcd34d", fontSize: ".72rem", fontFamily: "monospace", fontWeight: 700 }}>{e}</span>)}
        </div>
      )}
    </div>
  );
};

export default function BytelApiPage() {
  const [onglet, setOnglet] = useState<Onglet>("LISTE");

  // ---------------- Filtres globaux (equivalent SECTOR / CYCLE de Terrain Records) ----------------
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
  const [alertes, setAlertes] = useState<{ attente: string[]; commentaires: string[] }>({ attente: [], commentaires: [] });
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

  const bgOverlayRef = useRef<HTMLDivElement>(null);
  const changeBg = useCallback((c: string) => { if (bgOverlayRef.current) bgOverlayRef.current.style.backgroundColor = c; }, []);
  const survol = (c: string) => ({ onMouseEnter: () => changeBg(c), onMouseLeave: () => changeBg("transparent") });

  // ---------------- Periode ----------------
  const periodeExacte = year !== "TOUS" && month !== "TOUS";
  const periode = useMemo(() => {
    if (year !== "TOUS" && month !== "TOUS") return `${year}_M${String(month).padStart(2, "0")}`;
    if (year === "TOUS" && month === "TOUS") return "TOUTES PERIODES";
    if (year === "TOUS") return `TOUTES ANNEES · M${String(month).padStart(2, "0")}`;
    return `${year} · TOUS MOIS`;
  }, [year, month]);
  const qPer = useMemo(() => `year=${year}&month=${month}`, [year, month]);
  const auteur = useMemo(() => auteurCourant(), []);

  const flash = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(""), 7000); }, []);
  const flashErr = useCallback((m: string) => { setErreur(m); setTimeout(() => setErreur(""), 10000); }, []);

  const filtresListe = () => ({
    year: String(year), month: String(month), etat, type, qualif: secteur,
    eps: epsFiltre, epsList: epsListe, traitement, versions: versionsFiltre, page, size,
  });
  const filtresVersions = () => ({
    year: String(year), month: String(month), etat: versEtat, qualif: secteur,
    eps: versEps, epsList: versEpsListe, dateDebut: versDebut, dateFin: versFin,
    page: versPage, size: versParEps ? 20 : 50, modeEtat: versModeEtat,
  });

  // ---------------- Chargements de reference ----------------
  useEffect(() => { fetch(`${API_BASE}/api/bytel/config`).then(r => r.json()).then(setConfig).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(() => { setEpsFiltre(epsInput); setPage(0); }, 400); return () => clearTimeout(t); }, [epsInput]);

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
      } catch { /* silencieux */ }
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
      } catch { if (!annule) setAlertes({ attente: [], commentaires: [] }); }
      finally { if (!annule) setScanAlertes(false); }
    })();
    return () => { annule = true; };
  }, [qPer, secteur, refresh]);

  // ---------------- Lecture INTERVENTIONS ----------------
  // Un filtre impose la base locale : l'API ne sait filtrer que par periode.
  const filtreActif = useMemo(
    () => Boolean(!periodeExacte || etat || type || secteur || epsFiltre || traitement || versionsFiltre || epsListe.length > 0),
    [periodeExacte, etat, type, secteur, epsFiltre, traitement, versionsFiltre, epsListe]);

  useEffect(() => {
    if (onglet !== "LISTE") return;
    let annule = false;
    (async () => {
      setLoading(true);
      try {
        if (!filtreActif) {
          // ---------- Lecture DIRECTE dans l'API ----------
          const p = new URLSearchParams({ period: periode, page: String(page), size: String(size) });
          let d: any = null, derniere = "";
          for (let essai = 1; essai <= 4 && !annule; essai++) {
            if (essai > 1) setPatience(`L'API prepare la periode, tentative ${essai}/4...`);
            try {
              const r = await fetch(`${API_BASE}/api/bytel/live?${p}`);
              if (r.ok) { const j = await r.json(); if (!j.erreur) { d = j; break; } derniere = j.erreur; }
              else derniere = `HTTP ${r.status}`;
            } catch (e: any) { derniere = e?.message || String(e); }
            if (essai < 4) await new Promise(res => setTimeout(res, 1500 * essai));
          }
          if (annule) return;
          setPatience(""); setMode("DIRECT"); setIntrouvables([]);
          if (!d) {
            setRows([]); setNbVersionsParEps({}); setTotalPages(0); setTotalItems(0); setDureeMs(null);
            flashErr(`Lecture directe impossible apres 4 tentatives : ${derniere}`);
          } else {
            setRows(d.content || []); setNbVersionsParEps({});
            setTotalPages(d.totalPages || 0); setTotalItems(d.totalItems || 0); setDureeMs(d.dureeMs ?? null);
          }
        } else {
          // ---------- Lecture en BASE (copie synchronisee de l'API) ----------
          const r = await fetch(`${API_BASE}/api/bytel/qualifications/recherche`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(filtresListe()),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const d = await r.json();
          if (annule) return;
          setMode("BASE");
          setRows(d.content || []); setNbVersionsParEps(d.nbVersionsParEps || {});
          setTotalPages(d.totalPages || 0); setTotalItems(d.totalItems || 0);
          setIntrouvables(d.epsIntrouvables || []); setDureeMs(null);
          if (d.note) flashErr(d.note);
        }
      } catch (e: any) {
        if (!annule) flashErr(`Lecture impossible : ${e?.message || e}`);
      } finally {
        if (!annule) { setLoading(false); setPatience(""); }
      }
    })();
    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode, qPer, page, size, etat, type, secteur, epsFiltre, epsListe, traitement, versionsFiltre, refresh, onglet, filtreActif]);

  // ---------------- Lecture VERSIONS ----------------
  const chargerVersions = useCallback(async () => {
    setVersLoading(true);
    try {
      const url = versParEps ? "/api/bytel/versions/par-eps" : "/api/bytel/versions/recherche";
      const r = await fetch(`${API_BASE}${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(filtresVersions()) });
      if (r.ok) {
        const d = await r.json();
        if (versParEps) { setVersGroupes(d.content || []); setVers([]); } else { setVers(d.content || []); setVersGroupes([]); }
        setVersTotalPages(d.totalPages || 0); setVersTotal(d.totalItems || 0);
        setVersIntrouvables(d.epsIntrouvables || []);
        if (d.note) flashErr(d.note);
      }
    } catch { flashErr("Versions indisponibles."); } finally { setVersLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qPer, secteur, versEps, versEpsListe, versEtat, versDebut, versFin, versPage, versParEps, versModeEtat, refresh]);
  useEffect(() => { if (onglet === "VERSIONS") chargerVersions(); }, [onglet, chargerVersions]);

  // ---------------- Lecture DECISIONS ----------------
  const chargerDecisions = useCallback(async () => {
    setHistoLoading(true);
    try {
      const p = new URLSearchParams({ year: String(year), month: String(month), page: String(histoPage), size: "50" });
      if (histoType) p.append("actionType", histoType);
      if (histoEps) p.append("eps", histoEps);
      const r = await fetch(`${API_BASE}/api/bytel/historique?${p}`);
      if (r.ok) { const d = await r.json(); setHisto(d.content || []); setHistoTotalPages(d.totalPages || 0); setHistoTotal(d.totalItems || 0); }
    } catch { flashErr("Historique indisponible."); } finally { setHistoLoading(false); }
  }, [year, month, histoType, histoEps, histoPage, flashErr]);
  useEffect(() => { if (onglet === "DECISIONS") chargerDecisions(); }, [onglet, chargerDecisions, refresh]);

  // ---------------- Synchronisation ----------------
  const lireSyncEtat = useCallback(async (p: string) => {
    try { const r = await fetch(`${API_BASE}/api/bytel/sync/status?period=${p}`); if (r.ok) setSyncEtat(await r.json()); } catch { /* silencieux */ }
  }, []);
  useEffect(() => { if (periodeExacte) lireSyncEtat(periode); else setSyncEtat(null); }, [periode, periodeExacte, refresh, lireSyncEtat]);

  const synchroniser = useCallback(async (p: string, forcer: boolean) => {
    setSyncing(true);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/sync?period=${p}&forcer=${forcer}`, { method: "POST" });
      const d = await r.json().catch(() => null);
      if (d?.statut === "TERMINE" && !forcer) {
        flash(`${p} est deja synchronisee. Utilisez "Forcer" pour relancer.`);
        setSyncEtat(d); return;
      }
      let fini = false, tours = 0;
      while (!fini && tours < 3000) {
        await new Promise(res => setTimeout(res, 2000));
        tours++;
        try {
          const rs = await fetch(`${API_BASE}/api/bytel/sync/status?period=${p}`);
          if (!rs.ok) continue;
          const st = await rs.json();
          setSyncEtat(st); setProgres(st);
          if (st.statut !== "EN_COURS" && st.statut !== "EN_ATTENTE" && st.statut !== "ANNULATION_DEMANDEE") {
            fini = true;
            if (Array.isArray(st.erreurs) && st.erreurs.length > 0) flashErr(`${st.erreurs[0]}${st.erreurs.length > 1 ? ` (+${st.erreurs.length - 1} autres)` : ""}`);
            else flash(`Synchronisation de ${p} terminee. ${st.messageFinal || ""}`);
            setRefresh(x => x + 1);
          }
        } catch { /* on retente */ }
      }
    } catch (e: any) { flashErr(`Synchronisation impossible : ${e?.message || e}`); }
    finally { setSyncing(false); setProgres(null); }
  }, [flash, flashErr]);

  const annulerSync = async () => { try { await fetch(`${API_BASE}/api/bytel/sync/annuler?period=${periode}`, { method: "POST" }); } catch { /* ignore */ } };

  // ---------------- Export Excel (generation serveur en arriere-plan) ----------------
  const suivreExport = async (id: string, cle: string, nomDefaut: string, videMsg: string) => {
    let tours = 0;
    while (tours++ < 2400) {
      await new Promise(res => setTimeout(res, 1500));
      try {
        const rs = await fetch(`${API_BASE}/api/bytel/export/${id}/status`);
        if (!rs.ok) continue;
        const st = await rs.json();
        setExportEtat((x: any) => ({ ...(x || {}), ...st, cle }));
        if (st.statut === "TERMINE") {
          if (!st.ecrites && cle !== "EQUIPE") { flashErr(videMsg); return false; }
          telechargerUrl(`${API_BASE}/api/bytel/export/${id}/fichier`, st.nomFichier || nomDefaut);
          flash(`Extraction terminee : ${st.ecrites ?? 0} lignes en ${st.dureeSecondes ?? "?"}s${st.tronque ? " · limite Excel atteinte, fichier tronque" : ""}.`);
          return true;
        }
        if (st.statut === "ERREUR" || st.statut === "INCONNU") { flashErr(`Export en echec : ${st.erreur || st.statut}`); return false; }
      } catch { /* on retente */ }
    }
    return false;
  };

  const lancerExport = async (ongletExport: "INTERVENTIONS" | "VERSIONS" | "VERSIONS_EPS", filtres: any, cle: string, libelle: string) => {
    if (exportEtat) return false;
    setExportEtat({ statut: "EN_COURS", cle, libelle, ecrites: 0, total: 0, pourcentage: 0 });
    try {
      const r = await fetch(`${API_BASE}/api/bytel/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onglet: ongletExport, filtres }) });
      const d = await r.json().catch(() => null);
      if (!d?.id) { flashErr(`Export impossible : ${d?.erreur || "reponse inattendue"}`); return false; }
      return await suivreExport(d.id, cle, "export_bytel.xlsx", "Aucune ligne a exporter : l'export lit la copie synchronisee de l'API, synchronisez le mois d'abord.");
    } catch (e: any) { flashErr(`Export impossible : ${e?.message || e}`); return false; }
    finally { setExportEtat(null); }
  };

  const extraireExcel = () => onglet === "LISTE"
    ? lancerExport("INTERVENTIONS", filtresListe(), "INTERVENTIONS", "Extraction de la grille")
    : lancerExport(versParEps ? "VERSIONS_EPS" : "VERSIONS", filtresVersions(), "VERSIONS", "Extraction des versions");

  const exporterAlertesAttente = () => lancerExport("INTERVENTIONS",
    { year: String(year), month: String(month), qualif: secteur, epsList: alertes.attente, page: 0, size: 50 }, "ALERTE_ATTENTE", "Export des EPS en attente");
  const exporterAlertesCommentaires = () => lancerExport("VERSIONS_EPS",
    { year: String(year), month: String(month), qualif: secteur, epsList: alertes.commentaires, modeEtat: "COURANTE", page: 0, size: 20 }, "ALERTE_COMMENTAIRES", "Export des commentaires figes");

  const lancerGlobalTrack = async () => {
    const liste = parserListe(trackTexte);
    if (!liste.length && !trackEtat) { flashErr("Fournissez des EPS ou un etat."); return; }
    const ok = await lancerExport("VERSIONS_EPS",
      { year: String(trackAnnee), month: String(trackMois), etat: trackEtat, qualif: secteur, epsList: liste, modeEtat: trackMode, page: 0, size: 20 },
      "TRACK", "Global Track");
    if (ok) { setTrackOuvert(false); setTrackTexte(""); setTrackEtat(""); }
  };

  const lancerExportEquipe = async () => {
    const liste = parserListe(equipeTexte);
    if (!liste.length) { flashErr("Collez au moins un EPS."); return; }
    if (exportEtat) return;
    setExportEtat({ statut: "EN_COURS", cle: "EQUIPE", libelle: "Team Export", ecrites: 0, total: liste.length, pourcentage: 0 });
    try {
      const r = await fetch(`${API_BASE}/api/bytel/export/equipe`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epsList: liste, year: String(equipeAnnee), month: String(equipeMois), seulementDecisions: equipeDecisionsSeules }),
      });
      const d = await r.json().catch(() => null);
      if (!d?.id) { flashErr(`Export equipe impossible : ${d?.erreur || "reponse inattendue"}`); return; }
      if (await suivreExport(d.id, "EQUIPE", "export_equipe.xlsx", "")) setEquipeOuvert(false);
    } catch (e: any) { flashErr(`Export equipe impossible : ${e?.message || e}`); }
    finally { setExportEtat(null); }
  };

  useEffect(() => {
    if (!trackOuvert) return;
    fetch(`${API_BASE}/api/bytel/etats?year=${trackAnnee}&month=${trackMois}`).then(r => r.json()).then(d => setTrackEtats(d || [])).catch(() => setTrackEtats([]));
  }, [trackOuvert, trackAnnee, trackMois]);

  // ---------------- Omni Search (direct API, toutes periodes) ----------------
  const lancerOmni = async () => {
    const liste = parserListe(omniTexte);
    if (!liste.length) return;
    setOmniEnCours(true); setOmniRes(null);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/omni`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ epsList: liste }) });
      const d = await r.json();
      if (d.erreur) flashErr(d.erreur); else setOmniRes(d);
    } catch (e: any) { flashErr(`Omni Search impossible : ${e?.message || e}`); }
    finally { setOmniEnCours(false); }
  };
  const exporterOmni = async () => {
    const liste = parserListe(omniTexte);
    if (!liste.length) return;
    setOmniExport(true);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/omni/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ epsList: liste }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      telechargerBlob(await r.blob(), `Omni_Search_API_${liste.length}_EPS.xlsx`);
      flash(`OMNI SEARCH EXTRAIT : ${liste.length} EPS lus en direct dans l'API.`);
    } catch (e: any) { flashErr(`Export Omni impossible : ${e?.message || e}`); }
    finally { setOmniExport(false); }
  };

  // ---------------- Purge de la copie locale ----------------
  const purger = async () => {
    if (!periodeExacte || purgeSaisie.trim() !== periode) return;
    setPurgeEnCours(true); setPurgeRes(null);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/purge?period=${periode}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setPurgeRes(d);
        flash(`SYSTEME : copie locale de ${periode} purgee (${d.epsSupprimes} EPS, ${d.versionsSupprimees} versions). Decisions Kyntus conservees.`);
        setSelection(new Set()); setRefresh(x => x + 1);
      } else flashErr(d.erreur || `Purge refusee (HTTP ${r.status}).`);
    } catch (e: any) { flashErr(`Purge impossible : ${e?.message || e}`); }
    finally { setPurgeEnCours(false); }
  };

  // ---------------- Actions ----------------
  const ouvrirAction = (row: any, t: "VALIDATION" | "CONTESTATION") => {
    setCible(row); setActionType(t);
    setCommentaire(t === "VALIDATION" ? "RAS" : "");
    setNouveauType(row.typeIntervention || ""); setNouveauRacc(row.typeRaccordement || "");
    setApercu(null);
  };

  const chargerApercu = async () => {
    if (!cible) return;
    try {
      const p = new URLSearchParams({ qualificationId: cible.qualificationId, period: cible.periode || periode });
      if (nouveauType) p.append("typeInterventionApres", nouveauType);
      if (nouveauRacc) p.append("typeRaccordementApres", nouveauRacc);
      const r = await fetch(`${API_BASE}/api/bytel/actions/apercu?${p}`);
      if (r.ok) setApercu(await r.json());
    } catch { flashErr("Apercu indisponible."); }
  };

  const envoyerAction = async () => {
    if (!cible) return;
    if (actionType === "CONTESTATION" && !commentaire.trim()) { flashErr("Commentaire obligatoire."); return; }
    setEnvoiEnCours(true);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/actions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualificationId: cible.qualificationId, period: cible.periode || periode, actionType, commentaire: commentaire.trim(),
          typeInterventionApres: nouveauType || null, typeRaccordementApres: nouveauRacc || null, auteur,
          // En lecture directe la ligne n'est pas en base : la qualification brute permet d'agir sans synchronisation.
          snapshot: cible?.versions?.[0]?.brut ?? null, eps: cible.idIntervention,
        }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        flash(d.envoye ? `${actionType} envoyee (HTTP ${d.httpStatus})` : `${actionType} enregistree. Envoi Bytel desactive.`);
        setCible(null); setRefresh(x => x + 1);
      } else flashErr(d.message || d.erreur || "Action refusee.");
    } catch { flashErr("Erreur reseau."); } finally { setEnvoiEnCours(false); }
  };

  const executerLot = async () => {
    if (selection.size === 0) return;
    if (lotType === "CONTESTATION" && !lotCommentaire.trim()) { flashErr("Commentaire obligatoire."); return; }
    setLotEnCours(true); setLotResultat(null);
    try {
      const parPeriode: Record<string, string[]> = {};
      for (const cle of Array.from(selection)) { const [qid, per] = cle.split("|"); (parPeriode[per || periode] ||= []).push(qid); }
      const cumul = { traites: 0, succes: 0, echecs: 0, details: [] as any[] };
      for (const [pp, ids] of Object.entries(parPeriode)) {
        const r = await fetch(`${API_BASE}/api/bytel/actions/lot`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qualificationIds: ids, period: pp, actionType: lotType, commentaire: lotCommentaire.trim(), auteur }),
        });
        const d = await r.json();
        cumul.traites += d.traites || 0; cumul.succes += d.succes || 0; cumul.echecs += d.echecs || 0; cumul.details.push(...(d.details || []));
      }
      setLotResultat(cumul);
      flash(`Lot : ${cumul.succes} succes, ${cumul.echecs} echecs.`);
      setSelection(new Set()); setRefresh(x => x + 1);
    } catch { flashErr("Erreur reseau."); } finally { setLotEnCours(false); }
  };

  // ---------------- Chronologie ----------------
  const voirTimeline = async (eps: string, ligne?: any) => {
    const per = ligne?.periode || (periodeExacte ? periode : "");
    if (!per) { setEpsInput(eps); setOnglet("LISTE"); flash(`Choisissez une periode precise pour la chronologie de ${eps} : filtre applique.`); return; }
    setTimelinePeriode(per); setTimelineEps(eps); setLoadingTimeline(true); setTimeline([]);
    try {
      if (ligne?.versions?.length) {
        // Ligne lue en direct dans l'API : toutes les versions sont deja la.
        const versions: any[] = [...ligne.versions]
          .sort((a: any, b: any) => String(a.dateQualification || "").localeCompare(String(b.dateQualification || "")))
          .map((v: any) => ({
            source: "BYTEL", version: v.version, courante: v.courante, date: v.dateQualification, qualificationId: v.qualificationId,
            etat: v.etat, typeQualification: v.typeQualification, typeIntervention: v.typeIntervention, typeRaccordement: v.typeRaccordement,
            montant: v.montant, etape: v.etapeType, avis: v.etapeAvis, acteur: v.etapeActeur, commentaire: v.etapeCommentaire, elements: v.elements,
          }));
        try {
          const r = await fetch(`${API_BASE}/api/bytel/history/eps/${eps}?period=${per}`);
          if (r.ok) {
            for (const a of await r.json()) {
              if (a.actionType === "SYNC_ETAT" || a.actionType === "ETAT_INITIAL") continue;
              versions.push({ source: "KYNTUS", version: a.versionNo, courante: false, date: a.actionAt, qualificationId: a.qualificationId,
                actionType: a.actionType, etat: a.etatApres, typeIntervention: a.typeInterventionApres, typeRaccordement: a.typeRaccordementApres,
                montant: a.montant, commentaire: a.commentaire, acteur: a.auteur, statutEnvoi: a.statutEnvoi, httpStatus: a.httpStatus });
            }
            versions.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
          }
        } catch { /* les versions Bytel suffisent */ }
        setTimeline(versions);
        return;
      }
      const r = await fetch(`${API_BASE}/api/bytel/timeline/${eps}?period=${per}`);
      if (r.ok) setTimeline(await r.json());
    } catch { /* silencieux */ } finally { setLoadingTimeline(false); }
  };

  // ---------------- Selection & multi-EPS ----------------
  const cleSel = (r: any) => `${r.qualificationId}|${r.periode || periode}`;
  const toggleSel = (cle: string) => setSelection(prev => { const n = new Set(prev); n.has(cle) ? n.delete(cle) : n.add(cle); return n; });
  const actionnables = rows.filter(r => r.etat === ETAT_ACTIONNABLE);
  const toutSelectionner = () => {
    const a = actionnables.map(cleSel);
    setSelection(prev => prev.size === a.length ? new Set() : new Set(a));
  };

  const ouvrirListe = (c: "LISTE" | "VERSIONS") => { setListeTexte((c === "LISTE" ? epsListe : versEpsListe).join("\n")); setListeModal(c); };
  const appliquerListe = () => {
    const l = parserListe(listeTexte);
    if (listeModal === "LISTE") { setEpsListe(l); setEpsInput(""); setEpsFiltre(""); setPage(0); }
    else { setVersEpsListe(l); setVersEps(""); setVersPage(0); }
    setListeModal(null);
  };
  const collerEps = (e: React.ClipboardEvent<HTMLInputElement>, c: "LISTE" | "VERSIONS") => {
    const l = parserListe(e.clipboardData.getData("text"));
    if (l.length < 2) return;
    e.preventDefault();
    if (c === "LISTE") { setEpsListe(l); setEpsInput(""); setEpsFiltre(""); setPage(0); } else { setVersEpsListe(l); setVersEps(""); setVersPage(0); }
    flash(`${l.length} EPS charges pour la recherche multiple.`);
  };

  const resetFiltres = () => { setEtat(""); setType(""); setEpsInput(""); setEpsListe([]); setTraitement(""); setVersionsFiltre(""); setPage(0); };
  const filtresPoses = Boolean(etat || type || epsInput || traitement || versionsFiltre || epsListe.length > 0);

  // ---------------- Options ----------------
  const yearOptions = useMemo(() => [{ value: "TOUS", label: "Toutes" }, ...[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => ({ value: y, label: `${y}` }))], []);
  const monthOptions = useMemo(() => [{ value: "TOUS", label: "Tous" }, ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `M-${String(i + 1).padStart(2, "0")}` }))], []);
  const etatOptions = useMemo(() => [{ value: "", label: "Tous les etats" }, ...etatsDispo.map(e => ({ value: e, label: e }))], [etatsDispo]);
  const typeOptions = useMemo(() => [{ value: "", label: "Tous les types" }, ...typesDispo.map(t => ({ value: t, label: t }))], [typesDispo]);
  const trackEtatOptions = useMemo(() => [{ value: "", label: "Tous les etats" }, ...trackEtats.map(e => ({ value: e, label: e }))], [trackEtats]);
  const typesPourCible = useMemo(() => (TYPES_PAR_QUALIF[cible?.typeQualification] || []).map(v => ({ value: v, label: v })), [cible]);
  const colonnesDetail = useMemo(() => {
    if (secteur && ELEMENTS_PAR_QUALIF[secteur]) return ELEMENTS_PAR_QUALIF[secteur];
    const presentes = new Set<string>();
    for (const v of [...vers, ...versGroupes.flatMap((g: any) => g.versions || [])]) Object.keys(elementsDe(v)).forEach(k => presentes.add(k));
    const ordre = ELEMENTS_TOUS.filter(c => presentes.has(c));
    return ordre.length ? ordre : ELEMENTS_TOUS;
  }, [secteur, vers, versGroupes]);

  const exportCle = exportEtat?.cle as string | undefined;
  const baseAlimentee = Number(stats?.totalEps || 0) > 0;

  // =====================================================================
  return (
    <main style={{ padding: "1.75rem 2rem", minHeight: "100%", position: "relative", color: "#f8fafc",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <InteractiveDarkCanvas overlayRef={bgOverlayRef} />
      <NexusStyles />

      <div className="nx-stage" style={{ position: "relative", zIndex: 10, maxWidth: 1560, margin: "0 auto" }}>

        {/* ======================== EN-TETE ======================== */}
        <header className="nx-card" style={{ padding: "1.15rem 1.5rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 20px -4px rgba(2,132,199,.5), inset 0 1px 1px rgba(255,255,255,.2)" }}>
              <Radio size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ color: "#f8fafc", margin: 0, fontSize: "1.38rem", fontWeight: 800, letterSpacing: "-.025em" }}>
                  KYNTUS <span style={{ color: "#38bdf8" }}>NEXUS</span> <span style={{ color: "#64748b", fontWeight: 600 }}>·</span> BYTEL API
                </h1>
                <span className="nx-pill" style={{ backgroundColor: "rgba(16,185,129,.15)", color: "#6ee7b7", borderColor: "rgba(16,185,129,.35)" }}>
                  <span className="nx-live-dot" /> LIVE API
                </span>
                {config && !config.envoiActive && (
                  <span className="nx-pill" style={{ backgroundColor: "rgba(245,158,11,.12)", color: "#fcd34d", borderColor: "rgba(245,158,11,.35)" }}>ENVOI BYTEL DESACTIVE</span>
                )}
              </div>
              <div style={{ color: "#94a3b8", fontSize: ".76rem", fontWeight: 500, marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#38bdf8", display: "inline-block", boxShadow: "0 0 0 3px rgba(56,189,248,.2)" }} />
                Donnees lues directement dans l&apos;API Gringotts · 1 ligne = 1 EPS · periode <strong style={{ color: "#e0f2fe" }}>{periode}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button className="nx-btn nx-danger" disabled={!periodeExacte} onClick={() => { setPurgeSaisie(""); setPurgeRes(null); setPurgeOuvert(true); }} {...survol("rgba(239,68,68,.05)")}
              title={periodeExacte ? "Purger la copie locale de la periode" : "Choisissez une annee et un mois precis"}>
              <ShieldAlert size={15} /> Purge DB
            </button>
            <button className="nx-btn nx-soft" onClick={extraireExcel} disabled={!!exportEtat || onglet === "DECISIONS"} {...survol("rgba(2,132,199,.05)")}
              title="Exporte toutes les lignes correspondant aux filtres de l'onglet">
              <DownloadCloud size={15} /> {exportCle === "INTERVENTIONS" || exportCle === "VERSIONS" ? "Extraction..." : "Extract Excel"}
            </button>
            <button className="nx-btn nx-soft" onClick={() => setTrackOuvert(true)} {...survol("rgba(2,132,199,.05)")}>
              <Crosshair size={15} /> Global Track
            </button>
            <button className="nx-btn nx-soft" onClick={() => setEquipeOuvert(true)} {...survol("rgba(2,132,199,.05)")}>
              <Users size={15} /> Team Export
            </button>
            <button className="nx-btn nx-sky" onClick={() => setOmniOuvert(true)} {...survol("rgba(56,189,248,.05)")}>
              <Globe size={15} /> Omni Search
            </button>
            {selection.size > 0 && (
              <button className="nx-btn nx-violet" onClick={() => { setLotOuvert(true); setLotResultat(null); }} {...survol("rgba(168,85,247,.06)")}>
                <ListChecks size={15} /> Traiter {selection.size}
              </button>
            )}
            <div style={{ display: "inline-flex" }}>
              <button className="nx-btn nx-primary" onClick={() => periodeExacte && synchroniser(periode, false)} disabled={syncing || !periodeExacte}
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }} {...survol("rgba(2,132,199,.08)")}
                title={periodeExacte ? "Copie le mois depuis l'API pour les filtres, alertes et exports" : "Choisissez une annee et un mois precis"}>
                <CloudDownload size={15} className={syncing ? "nx-pulse" : undefined} /> {syncing ? "Synchronisation..." : "Sync API"}
              </button>
              <button className="nx-btn nx-primary icon" onClick={() => periodeExacte && synchroniser(periode, true)} disabled={syncing || !periodeExacte}
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "1px solid rgba(255,255,255,.25)" }} title="Forcer : relance meme si le mois est deja a jour">
                <Zap size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* ======================== FILTRES : SECTEUR / CYCLE / RECHERCHE ======================== */}
        <div style={{ display: "flex", gap: 12, marginBottom: "1rem", alignItems: "stretch", flexWrap: "wrap" }}>
          <div className="nx-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: ".75rem 1.15rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#38bdf8", fontWeight: 700, fontSize: ".78rem" }}><Folder size={17} /><span>SECTOR</span></div>
            <CyberSelect width="165px" value={secteur} options={SECTEURS} onChange={(v: string) => { setSecteur(v); setPage(0); setVersPage(0); }} variant="sky" />
            <div className="nx-divider" />
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7dd3fc", fontWeight: 700, fontSize: ".78rem" }}><Calendar size={17} /><span>CYCLE</span></div>
            <CyberSelect width="100px" value={year} options={yearOptions} onChange={(v: any) => { setYear(v); setPage(0); setVersPage(0); setHistoPage(0); }} variant="matrix" />
            <CyberSelect width="100px" value={month} options={monthOptions} onChange={(v: any) => { setMonth(v); setPage(0); setVersPage(0); setHistoPage(0); }} variant="matrix" />
          </div>

          {onglet === "LISTE" && (
            <div className="nx-card" style={{ display: "flex", gap: 10, padding: ".75rem 1.15rem", alignItems: "center", flex: 1, minWidth: 320, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200, display: "flex", alignItems: "center" }}>
                <Search size={17} color="#38bdf8" style={{ position: "absolute", left: 12, pointerEvents: "none" }} />
                {epsListe.length === 0 ? (
                  <input type="text" placeholder="Rechercher un EPS... (collez-en plusieurs pour une recherche multiple)" value={epsInput}
                    onChange={e => setEpsInput(e.target.value)} onPaste={e => collerEps(e, "LISTE")} className="nx-input" style={{ width: "100%", paddingLeft: "2.35rem" }} />
                ) : (
                  <div className="nx-input" style={{ width: "100%", paddingLeft: "2.35rem", display: "flex", alignItems: "center", gap: 8 }}>
                    <span onClick={() => ouvrirListe("LISTE")} style={{ cursor: "pointer", color: "#7dd3fc", fontWeight: 700 }}>LISTE · {epsListe.length} EPS</span>
                    <X size={14} style={{ cursor: "pointer", color: "#f87171", marginLeft: "auto" }} onClick={() => { setEpsListe([]); setPage(0); }} />
                  </div>
                )}
              </div>
              <button className="nx-btn sm nx-sky" onClick={() => ouvrirListe("LISTE")}><ListChecks size={14} /> Multi-EPS</button>
              <CyberSelect width="250px" value={etat} options={etatOptions} onChange={(v: string) => { setEtat(v); setPage(0); }} variant="sky" />
              <CyberSelect width="160px" value={type} options={typeOptions} onChange={(v: string) => { setType(v); setPage(0); }} variant="purple" />
              <CyberSelect width="150px" value={traitement} variant="matrix"
                options={[{ value: "", label: "Traitees + non" }, { value: "NON_TRAITEE", label: "Non traitees" }, { value: "TRAITEE", label: "Traitees" }]}
                onChange={(v: string) => { setTraitement(v); setPage(0); }} />
              <CyberSelect width="160px" value={versionsFiltre} options={VERSIONS_OPTIONS} onChange={(v: string) => { setVersionsFiltre(v); setPage(0); }} variant="sky" />
              {filtresPoses && <button className="nx-btn sm nx-danger" onClick={resetFiltres}><X size={14} /> Reset</button>}
            </div>
          )}
        </div>

        {/* ======================== BANDEAU D'ETAT : LECTURE / SYNC / EXPORT ======================== */}
        <div style={{ display: "flex", gap: 10, marginBottom: "1rem", alignItems: "center", flexWrap: "wrap", fontSize: ".76rem", fontWeight: 600 }}>
          {onglet === "LISTE" && (
            <span className="nx-pill" style={{ padding: "5px 12px", background: mode === "DIRECT" ? "rgba(16,185,129,.12)" : "rgba(168,85,247,.12)",
              borderColor: mode === "DIRECT" ? "rgba(16,185,129,.4)" : "rgba(168,85,247,.4)", color: mode === "DIRECT" ? "#6ee7b7" : "#d8b4fe" }}>
              {mode === "DIRECT" ? <Radio size={12} /> : <Database size={12} />}
              {mode === "DIRECT" ? "LECTURE DIRECTE API" : "LECTURE COPIE SYNCHRONISEE"}
              {dureeMs != null && mode === "DIRECT" ? ` · ${dureeMs} ms` : ""}
            </span>
          )}
          {!syncing && syncEtat && (
            <span className="nx-pill" style={{ padding: "5px 12px", background: "rgba(15,23,42,.7)", borderColor: "rgba(148,163,184,.3)", color: syncEtat.statut === "TERMINE" ? "#86efac" : "#94a3b8" }}>
              <History size={12} />
              {syncEtat.statut === "AUCUNE" || syncEtat.statut === "JAMAIS"
                ? (baseAlimentee ? `Copie locale : ${stats?.totalEps} EPS · ${stats?.totalVersions} versions` : "Copie locale vide : lancez Sync API pour filtres, alertes et exports")
                : `Sync ${syncEtat.statut?.toLowerCase()}${syncEtat.finAt ? ` · ${new Date(syncEtat.finAt).toLocaleString("fr-FR")}` : ""} · ${stats?.totalEps ?? 0} EPS`}
            </span>
          )}
          {syncing && progres && (
            <div className="nx-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: ".55rem .9rem", flex: 1, minWidth: 320, borderRadius: 12 }}>
              <RefreshCw size={14} color="#38bdf8" className="nx-spin" />
              <span style={{ color: "#7dd3fc", whiteSpace: "nowrap" }}>Sync {periode} · page {progres.pagesLues ?? 0}/{progres.pagesTotal || "?"}</span>
              <div className={`nx-progress ${!progres.pourcentage ? "indet" : ""}`} style={{ flex: 1 }}><div style={{ width: `${progres.pourcentage ?? 0}%` }} /></div>
              <span style={{ color: "#e0f2fe", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{progres.pourcentage ?? 0}%</span>
              <button className="nx-btn xs nx-danger" onClick={annulerSync}><StopCircle size={12} /> Arreter</button>
            </div>
          )}
          {exportEtat && (
            <div className="nx-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: ".55rem .9rem", flex: 1, minWidth: 320, borderRadius: 12 }}>
              <DownloadCloud size={14} color="#38bdf8" className="nx-pulse" />
              <span style={{ color: "#7dd3fc", whiteSpace: "nowrap" }}>{exportEtat.libelle || "Export"}</span>
              <div className={`nx-progress ${!exportEtat.pourcentage ? "indet" : ""}`} style={{ flex: 1 }}><div style={{ width: `${exportEtat.pourcentage ?? 0}%` }} /></div>
              <span style={{ color: "#e0f2fe", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{exportEtat.ecrites ?? 0} / {exportEtat.total || "?"}</span>
            </div>
          )}
        </div>

        {/* ======================== MESSAGES ======================== */}
        {msg && (
          <div className="nx-panel" style={{ marginBottom: "1rem", color: "#7dd3fc", display: "flex", alignItems: "center", gap: 10, padding: ".95rem 1.25rem",
            backgroundColor: "rgba(2,132,199,.15)", border: "1px solid rgba(56,189,248,.3)", borderLeft: "4px solid #0284c7", borderRadius: 12 }}>
            <CheckCircle size={20} color="#38bdf8" /><span style={{ fontSize: ".86rem", fontWeight: 700 }}>{msg}</span>
          </div>
        )}
        {erreur && (
          <div className="nx-panel" style={{ marginBottom: "1rem", color: "#fca5a5", display: "flex", alignItems: "flex-start", gap: 10, padding: ".95rem 1.25rem",
            backgroundColor: "rgba(220,38,38,.1)", border: "1px solid rgba(239,68,68,.3)", borderLeft: "4px solid #ef4444", borderRadius: 12, wordBreak: "break-word" }}>
            <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0 }} /><span style={{ fontSize: ".84rem", fontWeight: 600 }}>{erreur}</span>
            <X size={16} style={{ marginLeft: "auto", cursor: "pointer", flexShrink: 0 }} onClick={() => setErreur("")} />
          </div>
        )}

        {/* ======================== ALERTES ======================== */}
        <AlertBanners scan={scanAlertes} attente={alertes.attente} commentaires={alertes.commentaires} base={baseAlimentee} aDesDonnees={baseAlimentee}
          exportEnCours={exportCle || null} onExportAttente={exporterAlertesAttente} onExportCommentaires={exporterAlertesCommentaires}
          onEps={e => voirTimeline(e)} flash={flash} />

        {/* ======================== STATS PAR ETAT ======================== */}
        {stats && baseAlimentee && (
          <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <div className="nx-chip" style={{ cursor: "default", color: "#7dd3fc", borderColor: "rgba(56,189,248,.3)", background: "rgba(2,132,199,.12)" }}>
              <Layers size={14} /> <strong>{stats.totalEps}</strong> EPS · <strong>{stats.totalVersions}</strong> versions · <strong>{stats.traitees}</strong> traites
            </div>
            {Object.entries(stats.parEtat || {}).map(([k, v]: any) => {
              const c = couleurEtat(k);
              return (
                <div key={k} className={`nx-chip ${etat === k ? "active" : ""}`} onClick={() => { setEtat(etat === k ? "" : k); setPage(0); setOnglet("LISTE"); }}
                  style={{ color: c, borderColor: `${c}55`, background: `${c}14` }}>
                  <span className="nx-dot" style={{ background: c }} />{k} · <strong>{v.nb}</strong> · {fmtMontant(v.montant)}
                </div>
              );
            })}
          </div>
        )}

        {/* ======================== ONGLETS ======================== */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
          <div className="nx-tabs">
            <div className={`nx-tab ${onglet === "LISTE" ? "on" : ""}`} onClick={() => setOnglet("LISTE")}><Database size={15} /> Interventions <span className="count">{totalItems}</span></div>
            <div className={`nx-tab ${onglet === "VERSIONS" ? "on" : ""}`} onClick={() => setOnglet("VERSIONS")}><GitCommit size={15} /> Historique / Versions</div>
            <div className={`nx-tab ${onglet === "DECISIONS" ? "on" : ""}`} onClick={() => setOnglet("DECISIONS")}><Gavel size={15} /> Decisions Kyntus</div>
          </div>
          {onglet === "LISTE" && epsListe.length > 0 && <span className="nx-eyebrow">Recherche multiple active</span>}
        </div>

        {onglet === "LISTE" && epsListe.length > 0 && mode === "BASE" && <BandeauIntrouvables demandes={epsListe.length} manquants={introuvables} flash={flash} />}

        {/* ======================== ONGLET INTERVENTIONS ======================== */}
        {onglet === "LISTE" && (
          <DataGrid titre="API DATAGRID" total={totalItems} unite="EPS" chargement={loading}
            messageChargement={<>SYNCHRONISATION DE LA DATAMATRIX...{patience && <div style={{ color: "#fbbf24", marginTop: 8, fontSize: ".78rem" }}>{patience}</div>}</>}
            vide={rows.length === 0} messageVide={`Aucun EPS pour ${periode}`}
            sousMessageVide={mode === "BASE" ? "Ajustez les filtres, ou lancez Sync API pour alimenter la copie locale." : "L'API ne renvoie rien pour cette periode."}
            badgeLive={<div className="nx-pill" style={{ padding: "5px 12px", background: "rgba(2,132,199,.2)", borderColor: "rgba(56,189,248,.3)", color: "#7dd3fc" }}>
              <span className="nx-dot" style={{ background: "#38bdf8", animation: "nxBlink 2s infinite" }} /> {mode === "DIRECT" ? "LIVE API" : "SYNC COPY"}</div>}
            page={page} totalPages={totalPages} setPage={setPage} taille={size} setTaille={setSize}>
            <table className="nx-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}>
                    <input type="checkbox" className="nx-check" onChange={toutSelectionner} disabled={actionnables.length === 0}
                      checked={selection.size > 0 && selection.size === actionnables.length} />
                  </th>
                  <th>Target EPS</th><th>Ver</th><th>Core status</th><th>Secteur</th><th>Type</th><th>Racc</th>
                  <th style={{ textAlign: "right" }}>Montant</th><th>Pilot log (commentaire)</th><th>Acteur</th><th>Timestamp</th><th style={{ width: 210 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const act = r.etat === ETAT_ACTIONNABLE;
                  const nbv = r.nbVersions ?? nbVersionsParEps[`${r.idIntervention}|${r.periode}`] ?? 1;
                  const sel = selection.has(cleSel(r));
                  return (
                    <tr key={`${r.id ?? r.idIntervention}-${r.periode}-${idx}`} className={sel ? "sel" : ""} style={{ animationDelay: `${Math.min(idx * 12, 240)}ms` }}>
                      <td>{act && <input type="checkbox" className="nx-check" checked={sel} onChange={() => toggleSel(cleSel(r))} />}</td>
                      <td><span className="nx-eps" onClick={() => voirTimeline(r.idIntervention, r)}><Crosshair size={12} color="#38bdf8" />{r.idIntervention}</span></td>
                      <td><BadgeVersions n={nbv} onClick={() => voirTimeline(r.idIntervention, r)} /></td>
                      <td><BadgeEtat etat={r.etat} /></td>
                      <td style={{ color: "#94a3b8", fontSize: ".74rem", fontWeight: 600 }}>{libelleSecteur(r.typeQualification)}</td>
                      <td style={{ color: "#c4b5fd", fontWeight: 600 }}>{r.typeIntervention || "-"}</td>
                      <td style={{ color: "#6ee7b7" }}>{r.typeRaccordement || "-"}</td>
                      <td className="num" style={{ color: "#fbbf24", fontWeight: 700 }}>{fmtMontant(r.montant)}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div title={r.etapeCommentaire || ""} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: r.etapeCommentaire ? "#e2e8f0" : "#475569", fontSize: ".76rem" }}>
                          {r.etapeCommentaire || "—"}
                        </div>
                      </td>
                      <td style={{ color: "#94a3b8", fontSize: ".74rem" }}>{r.etapeActeur || "-"}</td>
                      <td style={{ color: "#64748b", fontSize: ".72rem", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" }}>{fmtDate(r.dateQualification)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          {act && <>
                            <button className="nx-btn xs nx-ok" onClick={() => ouvrirAction(r, "VALIDATION")}><ThumbsUp size={11} /> Valider</button>
                            <button className="nx-btn xs nx-warn" onClick={() => ouvrirAction(r, "CONTESTATION")}><ThumbsDown size={11} /> Contester</button>
                          </>}
                          <button className="nx-btn xs nx-violet" onClick={() => voirTimeline(r.idIntervention, r)} title="Chronologie complete"><History size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataGrid>
        )}

        {/* ======================== ONGLET VERSIONS ======================== */}
        {onglet === "VERSIONS" && (
          <>
            <div className="nx-card" style={{ display: "flex", gap: 10, padding: ".8rem 1.15rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", minWidth: 200 }}>
                <Search size={16} color="#a855f7" style={{ position: "absolute", left: 11, pointerEvents: "none" }} />
                {versEpsListe.length === 0 ? (
                  <input className="nx-input" placeholder="EPS..." value={versEps} style={{ paddingLeft: "2.2rem", width: 200 }}
                    onChange={e => { setVersEps(e.target.value); setVersPage(0); }} onPaste={e => collerEps(e, "VERSIONS")} />
                ) : (
                  <div className="nx-input" style={{ paddingLeft: "2.2rem", width: 200, display: "flex", gap: 8, alignItems: "center" }}>
                    <span onClick={() => ouvrirListe("VERSIONS")} style={{ cursor: "pointer", color: "#d8b4fe", fontWeight: 700 }}>LISTE · {versEpsListe.length}</span>
                    <X size={14} style={{ cursor: "pointer", color: "#f87171", marginLeft: "auto" }} onClick={() => { setVersEpsListe([]); setVersPage(0); }} />
                  </div>
                )}
              </div>
              <button className="nx-btn sm nx-violet" onClick={() => ouvrirListe("VERSIONS")}><ListChecks size={14} /> Multi-EPS</button>
              <CyberSelect width="250px" value={versEtat} options={etatOptions} onChange={(v: string) => { setVersEtat(v); setVersPage(0); }} variant="purple" />
              {versParEps && (
                <CyberSelect width="225px" value={versModeEtat} variant="purple"
                  options={[{ value: "COURANTE", label: "Etat : version courante" }, { value: "PREMIERE", label: "Etat : premiere version" }, { value: "TOUTE", label: "Etat : une version quelconque" }]}
                  onChange={(v: any) => { setVersModeEtat(v); setVersPage(0); }} />
              )}
              <span className="nx-eyebrow">Du</span>
              <input type="date" className="nx-input" value={versDebut} onChange={e => { setVersDebut(e.target.value); setVersPage(0); }} />
              <span className="nx-eyebrow">au</span>
              <input type="date" className="nx-input" value={versFin} onChange={e => { setVersFin(e.target.value); setVersPage(0); }} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className={`nx-btn sm ${versDetail ? "nx-warn" : "nx-sky"}`} onClick={() => setVersDetail(v => !v)}><Layers size={14} /> {versDetail ? "Masquer facturation" : "Detail facturation"}</button>
                <button className={`nx-btn sm ${versParEps ? "nx-violet" : "nx-sky"}`} onClick={() => { setVersParEps(v => !v); setVersPage(0); }}>
                  <GitCommit size={14} /> {versParEps ? "Vue par EPS" : "Vue par version"}
                </button>
                <button className="nx-btn sm nx-soft" onClick={chargerVersions}><Filter size={14} /> Filtrer</button>
              </div>
            </div>

            {versEpsListe.length > 0 && <BandeauIntrouvables demandes={versEpsListe.length} manquants={versIntrouvables} flash={flash} />}

            <DataGrid titre={versParEps ? "HISTORIQUE PAR EPS" : "FLUX DES VERSIONS"} accent="#7c3aed" icone={<GitCommit size={17} color="#fff" />}
              total={versTotal} unite={versParEps ? "EPS" : "VERSIONS"} chargement={versLoading}
              vide={versParEps ? versGroupes.length === 0 : vers.length === 0} messageVide="Aucune version pour ces criteres"
              sousMessageVide="L'historique lit la copie synchronisee de l'API : lancez Sync API sur la periode."
              page={versPage} totalPages={versTotalPages} setPage={setVersPage}>
              <table className="nx-table">
                <thead>
                  <tr>
                    {versParEps ? <th style={{ width: 70 }}>Ver</th> : <><th>EPS</th><th>Rang</th></>}
                    <th>Date</th><th>Etat</th><th>Secteur</th><th>Type</th>
                    {!versDetail && <th>Racc</th>}
                    {!versParEps && <th>Periode</th>}
                    {versDetail && colonnesDetail.map(c => <th key={c} style={{ textAlign: "right" }}>{c}</th>)}
                    {versDetail && <th style={{ textAlign: "right" }}>Total</th>}
                    {!versDetail && <th style={{ textAlign: "right" }}>Montant</th>}
                    <th>Etape</th><th>Avis</th><th>Acteur</th>
                    {!versDetail && <th>Commentaire</th>}
                  </tr>
                </thead>
                <tbody>
                  {versParEps ? versGroupes.map((g: any) => {
                    const vs: any[] = g.versions || [];
                    const n = vs.length;
                    return (
                      <React.Fragment key={`${g.idIntervention}|${g.periode}`}>
                        <tr className="group">
                          <td colSpan={99}>
                            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                              <span className="nx-eps" onClick={() => voirTimeline(g.idIntervention, { periode: g.periode })}><Crosshair size={12} color="#c084fc" />{g.idIntervention}</span>
                              <span style={{ color: "#64748b", fontSize: ".72rem", fontWeight: 700 }}>{g.periode}</span>
                              <BadgeVersions n={n} />
                              <span style={{ color: "#94a3b8", fontSize: ".72rem" }}>Actuel :</span><BadgeEtat etat={g.etatCourant} />
                              <span style={{ color: "#64748b", fontSize: ".7rem", marginLeft: "auto" }}>{fmtDate(g.premiereDate)} → {fmtDate(g.derniereDate)}</span>
                            </div>
                          </td>
                        </tr>
                        {vs.map((v: any, i: number) => {
                          const prec = i > 0 ? vs[i - 1] : null;
                          const ch = (a: any, b: any) => prec !== null && a !== b;
                          const el = elementsDe(v);
                          const courante = i === n - 1;
                          return (
                            <tr key={v.id} style={{ background: courante ? "rgba(16,185,129,.05)" : undefined }}>
                              <td style={{ fontWeight: 800, fontSize: ".72rem", color: courante ? "#34d399" : "#64748b", fontFamily: "monospace" }}>{i + 1}/{n}</td>
                              <td style={{ color: "#94a3b8", whiteSpace: "nowrap", fontSize: ".74rem" }}>{fmtDate(v.dateQualification)}</td>
                              <td><BadgeEtat etat={v.etat} contour={ch(prec?.etat, v.etat)} /></td>
                              <td style={{ color: "#94a3b8", fontSize: ".72rem" }}>{libelleSecteur(v.typeQualification)}</td>
                              <td style={{ color: ch(prec?.typeIntervention, v.typeIntervention) ? "#fbbf24" : "#c4b5fd", fontWeight: ch(prec?.typeIntervention, v.typeIntervention) ? 800 : 600 }}>{v.typeIntervention || "-"}</td>
                              {!versDetail && <td style={{ color: ch(prec?.typeRaccordement, v.typeRaccordement) ? "#fbbf24" : "#6ee7b7" }}>{v.typeRaccordement || "-"}</td>}
                              {versDetail && colonnesDetail.map(c => <td key={c} className="num" style={{ color: el[c] ? "#fbbf24" : "#475569" }}>{el[c] !== undefined ? fmtMontant(el[c]) : "-"}</td>)}
                              {versDetail && <td className="num" style={{ color: "#38bdf8", fontWeight: 800 }}>{fmtMontant(totalElements(el))}</td>}
                              {!versDetail && <td className="num" style={{ color: "#fbbf24", fontWeight: ch(prec?.montant, v.montant) ? 800 : 600, textDecoration: ch(prec?.montant, v.montant) ? "underline" : "none" }}>{fmtMontant(v.montant)}</td>}
                              <td style={{ color: "#64748b", fontSize: ".7rem" }}>{(v.etapeType || "").replace("Etape", "")}</td>
                              <td style={{ color: v.etapeAvis === "CONTESTATION" ? "#fbbf24" : v.etapeAvis === "ACCEPTATION" ? "#34d399" : "#475569", fontSize: ".72rem", fontWeight: 700 }}>{v.etapeAvis || "-"}</td>
                              <td style={{ color: "#94a3b8", fontSize: ".72rem" }}>{v.etapeActeur || "-"}</td>
                              {!versDetail && <td style={{ maxWidth: 280, fontSize: ".74rem", color: prec && v.etapeCommentaire && prec.etapeCommentaire === v.etapeCommentaire ? "#fbbf24" : "#cbd5e1" }}>{v.etapeCommentaire || "-"}</td>}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  }) : vers.map((v: any) => {
                    const el = elementsDe(v);
                    return (
                      <tr key={v.id}>
                        <td><span className="nx-eps" onClick={() => voirTimeline(v.idIntervention, { periode: v.periode })}>{v.idIntervention}</span></td>
                        <td><span style={{ color: v.ordreApi === 0 ? "#34d399" : "#64748b", fontWeight: 800, fontSize: ".72rem" }}>{v.ordreApi === 0 ? "COURANTE" : `-${v.ordreApi}`}</span></td>
                        <td style={{ color: "#94a3b8", whiteSpace: "nowrap", fontSize: ".74rem" }}>{fmtDate(v.dateQualification)}</td>
                        <td><BadgeEtat etat={v.etat} /></td>
                        <td style={{ color: "#94a3b8", fontSize: ".72rem" }}>{libelleSecteur(v.typeQualification)}</td>
                        <td style={{ color: "#c4b5fd", fontWeight: 600 }}>{v.typeIntervention || "-"}</td>
                        {!versDetail && <td style={{ color: "#6ee7b7" }}>{v.typeRaccordement || "-"}</td>}
                        <td style={{ color: "#64748b", fontSize: ".72rem" }}>{v.periode}</td>
                        {versDetail && colonnesDetail.map(c => <td key={c} className="num" style={{ color: el[c] ? "#fbbf24" : "#475569" }}>{el[c] !== undefined ? fmtMontant(el[c]) : "-"}</td>)}
                        {versDetail && <td className="num" style={{ color: "#38bdf8", fontWeight: 800 }}>{fmtMontant(totalElements(el))}</td>}
                        {!versDetail && <td className="num" style={{ color: "#fbbf24", fontWeight: 600 }}>{fmtMontant(v.montant)}</td>}
                        <td style={{ color: "#64748b", fontSize: ".7rem" }}>{(v.etapeType || "").replace("Etape", "")}</td>
                        <td style={{ color: v.etapeAvis === "CONTESTATION" ? "#fbbf24" : v.etapeAvis === "ACCEPTATION" ? "#34d399" : "#475569", fontSize: ".72rem", fontWeight: 700 }}>{v.etapeAvis || "-"}</td>
                        <td style={{ color: "#94a3b8", fontSize: ".72rem" }}>{v.etapeActeur || "-"}</td>
                        {!versDetail && <td style={{ maxWidth: 280, fontSize: ".74rem" }}>{v.etapeCommentaire || "-"}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataGrid>
          </>
        )}

        {/* ======================== ONGLET DECISIONS ======================== */}
        {onglet === "DECISIONS" && (
          <>
            <div className="nx-card" style={{ display: "flex", gap: 10, padding: ".8rem 1.15rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
              <Gavel size={17} color="#34d399" />
              <CyberSelect width="190px" value={histoType} variant="matrix"
                options={[{ value: "", label: "Toutes decisions" }, { value: "VALIDATION", label: "Validations" }, { value: "CONTESTATION", label: "Contestations" }]}
                onChange={(v: string) => { setHistoType(v); setHistoPage(0); }} />
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Search size={16} color="#34d399" style={{ position: "absolute", left: 11, pointerEvents: "none" }} />
                <input className="nx-input" placeholder="EPS..." value={histoEps} onChange={e => { setHistoEps(e.target.value); setHistoPage(0); }} style={{ paddingLeft: "2.2rem", width: 220 }} />
              </div>
              <button className="nx-btn sm nx-ok" onClick={chargerDecisions}><Filter size={14} /> Filtrer</button>
            </div>
            <DataGrid titre="JOURNAL DES DECISIONS" accent="#059669" icone={<Gavel size={17} color="#fff" />} total={histoTotal} unite="DECISIONS"
              chargement={histoLoading} vide={histo.length === 0} messageVide="Aucune decision enregistree"
              sousMessageVide="Validez ou contestez une intervention pour alimenter ce journal."
              page={histoPage} totalPages={histoTotalPages} setPage={setHistoPage}>
              <table className="nx-table">
                <thead><tr><th>Date</th><th>EPS</th><th>UUID</th><th>Ver</th><th>Decision</th><th>Etat avant</th><th>Etat apres</th><th>Parametrage</th><th style={{ textAlign: "right" }}>Montant</th><th>Commentaire</th><th>Auteur</th><th>Envoi</th></tr></thead>
                <tbody>
                  {histo.map(a => (
                    <tr key={a.id}>
                      <td style={{ color: "#94a3b8", whiteSpace: "nowrap", fontSize: ".74rem" }}>{fmtDate(a.actionAt)}</td>
                      <td><span className="nx-eps" onClick={() => voirTimeline(a.idIntervention, { periode: a.periode })}>{a.idIntervention}</span></td>
                      <td style={{ color: "#64748b", fontSize: ".68rem", fontFamily: "monospace" }} title={a.qualificationId}>{String(a.qualificationId || "").slice(0, 8)}</td>
                      <td style={{ color: "#38bdf8", fontWeight: 700 }}>v{a.versionNo}</td>
                      <td><span className="nx-badge" style={{ color: a.actionType === "CONTESTATION" ? "#fbbf24" : "#34d399", background: a.actionType === "CONTESTATION" ? "rgba(245,158,11,.12)" : "rgba(16,185,129,.12)", borderColor: "transparent" }}>{a.actionType}</span></td>
                      <td style={{ color: "#64748b", fontSize: ".72rem" }}>{a.etatAvant || "-"}</td>
                      <td><BadgeEtat etat={a.etatApres} /></td>
                      <td style={{ fontSize: ".72rem" }}>
                        {a.typeInterventionAvant !== a.typeInterventionApres
                          ? <span style={{ color: "#fbbf24" }}>{a.typeInterventionAvant} → <strong>{a.typeInterventionApres}</strong></span>
                          : <span style={{ color: "#475569" }}>{a.typeInterventionApres || "-"}</span>}
                      </td>
                      <td className="num" style={{ color: "#fbbf24" }}>{fmtMontant(a.montant)}</td>
                      <td style={{ maxWidth: 260, fontSize: ".74rem" }}>{a.commentaire || "-"}</td>
                      <td style={{ color: "#94a3b8", fontSize: ".74rem" }}>{a.auteur}</td>
                      <td>
                        <span className="nx-badge" style={{ borderColor: "transparent",
                          background: a.statutEnvoi === "ENVOYE" ? "rgba(16,185,129,.15)" : a.statutEnvoi === "ERREUR" ? "rgba(239,68,68,.15)" : "rgba(100,116,139,.15)",
                          color: a.statutEnvoi === "ENVOYE" ? "#34d399" : a.statutEnvoi === "ERREUR" ? "#f87171" : "#94a3b8" }}>
                          {a.statutEnvoi}{a.httpStatus ? ` ${a.httpStatus}` : ""}
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

      {/* =============================== MODALES =============================== */}

      <TimelineModal eps={timelineEps} periode={timelinePeriode || periode} entrees={timeline} chargement={loadingTimeline}
        onClose={() => { setTimelineEps(null); setTimeline([]); }} />

      {/* ---------- Action unitaire ---------- */}
      <NexusModal ouvert={!!cible} onClose={() => setCible(null)} verrouille={envoiEnCours} largeur={740}
        accent={actionType === "VALIDATION" ? "#10b981" : "#f59e0b"}
        icone={actionType === "VALIDATION" ? <ThumbsUp size={19} /> : <ThumbsDown size={19} />}
        titre={<>{actionType} · <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{cible?.idIntervention}</span></>}
        sousTitre={`Auteur : ${auteur} · periode ${cible?.periode || periode}${config && !config.envoiActive ? " · enregistrement local seulement" : ""}`}
        pied={
          <button className={`nx-btn ${actionType === "VALIDATION" ? "nx-ok" : "nx-warn"}`} style={{ width: "100%", justifyContent: "center", padding: ".9rem", fontSize: ".92rem", fontWeight: 800 }}
            disabled={envoiEnCours || (actionType === "CONTESTATION" && !commentaire.trim())} onClick={envoyerAction}>
            <Send size={16} /> {envoiEnCours ? "Traitement..." : `Confirmer la ${actionType.toLowerCase()}`}
          </button>
        }>
        {cible && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[["Version", `${String(cible.qualificationId).slice(0, 13)}…`, "#e2e8f0"], ["Date", fmtDate(cible.dateQualification), "#e2e8f0"],
                ["Etat", cible.etat, couleurEtat(cible.etat)], ["Montant", fmtMontant(cible.montant), "#fbbf24"]].map(([k, v, c]) => (
                <div key={k} style={{ background: "rgba(15,23,42,.6)", border: "1px solid rgba(148,163,184,.15)", borderRadius: 10, padding: ".65rem .8rem" }}>
                  <div className="nx-eyebrow">{k}</div>
                  <div style={{ color: c, fontWeight: 700, fontSize: ".84rem", marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>

            {actionType === "CONTESTATION" && (
              <div style={{ marginBottom: 16 }}>
                <div className="nx-label" style={{ color: "#fbbf24", marginBottom: 8 }}>Parametrage propose — inchange si vous ne touchez a rien</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div className="nx-eyebrow" style={{ marginBottom: 5 }}>Type intervention (actuel : {cible.typeIntervention})</div>
                    <CyberSelect width="240px" value={nouveauType} options={typesPourCible} onChange={setNouveauType} variant="purple" />
                  </div>
                  {cible.typeQualification === "QualificationRaccordement" && (
                    <div>
                      <div className="nx-eyebrow" style={{ marginBottom: 5 }}>Type raccordement (actuel : {cible.typeRaccordement || "-"})</div>
                      <CyberSelect width="200px" value={nouveauRacc} options={TYPES_RACCORDEMENT.map(v => ({ value: v, label: v }))} onChange={setNouveauRacc} variant="purple" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="nx-label" style={{ marginBottom: 7 }}>Commentaire {actionType === "CONTESTATION" && <span style={{ color: "#f87171" }}>* obligatoire</span>}</div>
            <textarea className="nx-textarea" rows={4} value={commentaire} onChange={e => setCommentaire(e.target.value)}
              placeholder={actionType === "VALIDATION" ? "RAS" : "Motif precis de la contestation..."} style={{ marginBottom: 12 }} />

            <button className="nx-btn sm nx-sky" onClick={chargerApercu}><Eye size={14} /> {apercu ? "Rafraichir l'apercu" : "Voir le corps envoye"}</button>
            {apercu && (
              <div className="nx-scroll" style={{ marginTop: 12, background: "rgba(2,6,23,.8)", padding: ".9rem", borderRadius: 10, border: "1px solid rgba(56,189,248,.25)", maxHeight: 230, overflowY: "auto" }}>
                <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".68rem", marginBottom: 7, wordBreak: "break-all" }}>{actionType === "VALIDATION" ? apercu.urlValidation : apercu.urlContestation}</div>
                <pre style={{ margin: 0, color: "#86efac", fontSize: ".7rem", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{JSON.stringify(apercu.payload, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </NexusModal>

      {/* ---------- Lot ---------- */}
      <NexusModal ouvert={lotOuvert} onClose={() => setLotOuvert(false)} verrouille={lotEnCours} accent="#a855f7" icone={<Layers size={19} />}
        titre={`Traitement par lot · ${selection.size} EPS`} sousTitre="Le meme commentaire est applique a toutes les lignes, parametrage inchange."
        pied={
          <button className="nx-btn nx-violet" style={{ width: "100%", justifyContent: "center", padding: ".9rem", fontSize: ".92rem", fontWeight: 800 }}
            disabled={lotEnCours || selection.size === 0 || (lotType === "CONTESTATION" && !lotCommentaire.trim())} onClick={executerLot}>
            <ListChecks size={16} /> {lotEnCours ? "Traitement..." : `Executer sur ${selection.size} EPS`}
          </button>
        }>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {(["VALIDATION", "CONTESTATION"] as const).map(t => (
            <button key={t} className={`nx-btn ${lotType === t ? (t === "VALIDATION" ? "nx-ok" : "nx-warn") : ""}`} onClick={() => setLotType(t)} style={{ flex: 1, justifyContent: "center" }}>
              {t === "VALIDATION" ? <ThumbsUp size={14} /> : <ThumbsDown size={14} />} {t === "VALIDATION" ? "Valider tout" : "Contester tout"}
            </button>
          ))}
        </div>
        <div style={{ padding: ".8rem 1rem", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 10, marginBottom: 14, color: "#fcd34d", fontSize: ".78rem", lineHeight: 1.6 }}>
          Pour modifier un parametrage (type, raccordement), traitez l&apos;EPS individuellement.
        </div>
        <textarea className="nx-textarea" rows={3} value={lotCommentaire} onChange={e => setLotCommentaire(e.target.value)} placeholder={lotType === "VALIDATION" ? "RAS" : "Motif commun..."} />
        {lotResultat && (
          <div style={{ marginTop: 14, padding: ".9rem", background: "rgba(2,6,23,.7)", borderRadius: 10, fontSize: ".78rem" }}>
            <div style={{ color: "#34d399", marginBottom: 7, fontWeight: 700 }}>Succes : {lotResultat.succes} · <span style={{ color: "#f87171" }}>Echecs : {lotResultat.echecs}</span></div>
            <div className="nx-scroll" style={{ maxHeight: 150, overflowY: "auto" }}>
              {(lotResultat.details || []).filter((d: any) => !d.ok).map((d: any, i: number) => (
                <div key={i} style={{ color: "#fca5a5", fontSize: ".72rem", marginBottom: 3, fontFamily: "monospace" }}>{String(d.qualificationId).slice(0, 8)} : {d.message || d.erreur}</div>
              ))}
            </div>
          </div>
        )}
      </NexusModal>

      {/* ---------- Multi-EPS ---------- */}
      {(() => {
        const detectes = parserListe(listeTexte);
        return (
          <NexusModal ouvert={!!listeModal} onClose={() => setListeModal(null)} accent="#38bdf8" icone={<ListChecks size={19} />} largeur={640}
            titre={`Recherche Multi-EPS · ${listeModal === "LISTE" ? "Interventions" : "Versions"}`}
            sousTitre="Un EPS par ligne, ou separes par virgules / espaces. Une colonne Excel fonctionne directement."
            pied={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: ".8rem", fontWeight: 700, color: detectes.length > 10000 ? "#fbbf24" : "#7dd3fc" }}>
                  {detectes.length} EPS distincts detectes{detectes.length > 10000 && " · seuls les 10 000 premiers seront recherches"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="nx-btn nx-danger" onClick={() => setListeTexte("")}>Vider</button>
                  <button className="nx-btn nx-primary" onClick={appliquerListe}><Search size={14} /> {detectes.length ? `Rechercher ${detectes.length} EPS` : "Retirer la liste"}</button>
                </div>
              </div>
            }>
            <textarea className="nx-textarea nx-scroll" rows={12} value={listeTexte} onChange={e => setListeTexte(e.target.value)} placeholder={"EPS-0016243542\nEPS-0016677821\nEPS-M002973905"} autoFocus />
          </NexusModal>
        );
      })()}

      {/* ---------- Global Track ---------- */}
      {(() => {
        const detectes = parserListe(trackTexte);
        const enCours = exportCle === "TRACK";
        return (
          <NexusModal ouvert={trackOuvert} onClose={() => setTrackOuvert(false)} verrouille={enCours} accent="#38bdf8" icone={<Layers size={19} />}
            titre="Global Tracking Protocol" sousTitre="Chronologie complete (toutes versions) des EPS demandes ou de tous les EPS d'un etat, en Excel."
            pied={
              <button onClick={lancerGlobalTrack} disabled={enCours || !!exportEtat || (detectes.length === 0 && !trackEtat)} className="nx-btn nx-primary"
                style={{ width: "100%", justifyContent: "center", padding: ".95rem", fontSize: ".92rem", fontWeight: 700 }}>
                {enCours ? "Extraction de la timeline globale..." : "Generer la timeline globale Excel"}
              </button>
            }>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", background: "rgba(15,23,42,.4)", padding: ".85rem 1rem", borderRadius: 12, border: "1px solid rgba(148,163,184,.15)", flexWrap: "wrap" }}>
              <span className="nx-pill" style={{ color: "#7dd3fc", background: "rgba(2,132,199,.2)", borderColor: "rgba(56,189,248,.3)", padding: "5px 10px" }}>SECTOR : {libelleSecteur(secteur)}</span>
              <CyberSelect width="120px" value={trackAnnee} options={yearOptions} onChange={setTrackAnnee} variant="sky" />
              <CyberSelect width="110px" value={trackMois} options={monthOptions} onChange={setTrackMois} variant="sky" />
              <CyberSelect width="250px" value={trackEtat} options={trackEtatOptions} onChange={setTrackEtat} variant="sky" />
              {trackEtat && (
                <CyberSelect width="225px" value={trackMode} variant="purple"
                  options={[{ value: "COURANTE", label: "Etat de la version courante" }, { value: "PREMIERE", label: "Etat de la premiere version" }, { value: "TOUTE", label: "Passe par cet etat" }]}
                  onChange={setTrackMode} />
              )}
            </div>
            <div className="nx-label" style={{ marginBottom: 8 }}>Liste d&apos;EPS (un par ligne ou separes par des virgules)</div>
            <textarea className="nx-textarea nx-scroll" rows={7} value={trackTexte} onChange={e => setTrackTexte(e.target.value)} disabled={enCours}
              placeholder={trackEtat ? "✅ Filtre d'etat actif : laissez vide pour extraire tous les EPS de cet etat, ou collez des EPS precis." : "EPS-0016243542\nEPS-0016677821\nEPS-M002973905"} />
            <div style={{ marginTop: 8, fontSize: ".76rem", color: "#7dd3fc", fontWeight: 700 }}>{detectes.length} EPS detectes</div>
          </NexusModal>
        );
      })()}

      {/* ---------- Team Export ---------- */}
      {(() => {
        const detectes = parserListe(equipeTexte);
        const enCours = exportCle === "EQUIPE";
        return (
          <NexusModal ouvert={equipeOuvert} onClose={() => setEquipeOuvert(false)} verrouille={enCours} accent="#38bdf8" icone={<Users size={19} />}
            titre="Team Export Protocol" sousTitre="Une ligne par EPS : ses commentaires d'equipe dans l'ordre chronologique et le sens de la derniere decision."
            pied={
              <div style={{ display: "flex", gap: 8 }}>
                <button className="nx-btn nx-danger" disabled={enCours} onClick={() => setEquipeTexte("")}>Vider</button>
                <button className="nx-btn nx-primary" onClick={lancerExportEquipe} disabled={enCours || !!exportEtat || detectes.length === 0}
                  style={{ flex: 1, justifyContent: "center", padding: ".9rem", fontWeight: 700 }}>
                  <DownloadCloud size={15} /> {enCours ? "Extraction des timelines d'equipe..." : `Generer le Team Export Excel (${detectes.length} EPS)`}
                </button>
              </div>
            }>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", background: "rgba(15,23,42,.4)", padding: ".85rem 1rem", borderRadius: 12, border: "1px solid rgba(148,163,184,.15)", flexWrap: "wrap" }}>
              <span className="nx-eyebrow">Periode</span>
              <CyberSelect width="130px" value={equipeAnnee} options={yearOptions} onChange={setEquipeAnnee} variant="matrix" />
              <CyberSelect width="120px" value={equipeMois} options={monthOptions} onChange={setEquipeMois} variant="matrix" />
              <span style={{ color: "#64748b", fontSize: ".72rem" }}>Toutes / Tous = toutes les periodes synchronisees</span>
            </div>
            <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 14, cursor: "pointer", color: "#cbd5e1", fontSize: ".8rem", lineHeight: 1.5 }}>
              <input type="checkbox" className="nx-check" checked={equipeDecisionsSeules} onChange={e => setEquipeDecisionsSeules(e.target.checked)} style={{ marginTop: 3 }} />
              <span>Seulement les commentaires commencant par &laquo; valide &raquo; ou &laquo; contest &raquo;
                <span style={{ display: "block", color: "#64748b", fontSize: ".74rem" }}>Decoche : tous les commentaires, y compris &laquo; RAS &raquo; et les explications detaillees.</span></span>
            </label>
            <div className="nx-label" style={{ marginBottom: 8 }}>Team EPS Payload</div>
            <textarea className="nx-textarea nx-scroll" rows={8} value={equipeTexte} onChange={e => setEquipeTexte(e.target.value)} disabled={enCours}
              placeholder={"EPS-0016243542\nEPS-0016677821\nEPS-M002973905"} />
          </NexusModal>
        );
      })()}

      {/* ---------- Omni Search (direct API) ---------- */}
      {(() => {
        const detectes = parserListe(omniTexte);
        return (
          <NexusModal ouvert={omniOuvert} onClose={() => setOmniOuvert(false)} verrouille={omniEnCours || omniExport} accent="#38bdf8" icone={<Globe size={19} />} largeur={920}
            titre="Omni Search Protocol" sousTitre="Lecture directe dans l'API Gringotts, toutes periodes confondues, sans synchronisation."
            pied={
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="nx-btn nx-danger" disabled={omniEnCours} onClick={() => { setOmniTexte(""); setOmniRes(null); }}>Vider</button>
                <button className="nx-btn nx-sky" onClick={exporterOmni} disabled={omniExport || omniEnCours || detectes.length === 0}>
                  <DownloadCloud size={15} /> {omniExport ? "Extraction..." : "Extraire en Excel"}
                </button>
                <button className="nx-btn nx-primary" onClick={lancerOmni} disabled={omniEnCours || omniExport || detectes.length === 0} style={{ flex: 1, justifyContent: "center", fontWeight: 700 }}>
                  <Globe size={15} /> {omniEnCours ? `Scan de l'API (${detectes.length} EPS)...` : `Executer l'Omni Search (${detectes.length} EPS)`}
                </button>
              </div>
            }>
            <div style={{ marginBottom: 14, background: "rgba(2,132,199,.1)", padding: ".9rem 1.1rem", borderRadius: 12, border: "1px solid rgba(56,189,248,.2)" }}>
              <p style={{ color: "#7dd3fc", margin: 0, fontSize: ".84rem", lineHeight: 1.5, fontWeight: 500 }}>
                <strong style={{ color: "#38bdf8" }}>RECHERCHE TRANSVERSALE LIVE :</strong> ce protocole ignore Secteur, Annee et Mois, interroge <span style={{ textDecoration: "underline", fontWeight: 700 }}>directement l&apos;API</span> et
                renvoie chaque periode ou l&apos;EPS existe, avec toutes ses versions. Limite : 500 EPS par recherche.
              </p>
            </div>
            <textarea className="nx-textarea nx-scroll" rows={omniRes ? 4 : 8} value={omniTexte} onChange={e => setOmniTexte(e.target.value)} disabled={omniEnCours}
              placeholder={"EPS-0016243542\nEPS-0016677821\nEPS-M002973905"} />

            {omniEnCours && (
              <div style={{ marginTop: 16 }}>
                <div className="nx-progress indet"><div /></div>
                <div style={{ color: "#7dd3fc", fontSize: ".8rem", marginTop: 8, fontWeight: 600 }}>Interrogation de l&apos;API EPS par EPS... (~2 s par lot de 6)</div>
              </div>
            )}

            {omniRes && !omniEnCours && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <span className="nx-chip" style={{ cursor: "default", color: "#7dd3fc", borderColor: "rgba(56,189,248,.3)", background: "rgba(2,132,199,.12)" }}>
                    {omniRes.traites} EPS scannes · {omniRes.dureeMs} ms
                  </span>
                  <span className="nx-chip" style={{ cursor: "default", color: "#34d399", borderColor: "rgba(16,185,129,.3)", background: "rgba(16,185,129,.1)" }}>
                    {(omniRes.content || []).length} resultats (EPS × periode)
                  </span>
                  {(omniRes.introuvables || []).length > 0 && (
                    <span className="nx-chip" title={(omniRes.introuvables || []).join(", ")} style={{ color: "#fbbf24", borderColor: "rgba(245,158,11,.35)", background: "rgba(245,158,11,.1)" }}
                      onClick={async () => { try { await navigator.clipboard.writeText(omniRes.introuvables.join("\n")); flash("EPS introuvables copies."); } catch { /* ignore */ } }}>
                      <Copy size={12} /> {omniRes.introuvables.length} introuvables dans l&apos;API
                    </span>
                  )}
                  {Object.keys(omniRes.erreurs || {}).length > 0 && (
                    <span className="nx-chip" style={{ cursor: "default", color: "#f87171", borderColor: "rgba(239,68,68,.35)", background: "rgba(239,68,68,.1)" }}>
                      {Object.keys(omniRes.erreurs).length} en erreur
                    </span>
                  )}
                  {omniRes.tronque && <span className="nx-chip" style={{ cursor: "default", color: "#fbbf24", borderColor: "rgba(245,158,11,.35)" }}>Limite de 500 EPS atteinte</span>}
                </div>
                {(omniRes.content || []).length > 0 && (
                  <div className="nx-scroll" style={{ maxHeight: "40vh", overflow: "auto", border: "1px solid rgba(56,189,248,.15)", borderRadius: 12 }}>
                    <table className="nx-table">
                      <thead><tr><th>EPS</th><th>Periode</th><th>Ver</th><th>Etat courant</th><th>Secteur</th><th>Type</th><th style={{ textAlign: "right" }}>Montant</th><th>Acteur</th><th>Date</th></tr></thead>
                      <tbody>
                        {omniRes.content.map((r: any, i: number) => (
                          <tr key={`${r.idIntervention}-${r.periode}-${i}`}>
                            <td><span className="nx-eps" onClick={() => voirTimeline(r.idIntervention, r)}><Crosshair size={12} color="#38bdf8" />{r.idIntervention}</span></td>
                            <td style={{ color: "#e0f2fe", fontWeight: 700, fontSize: ".74rem" }}>{r.periode}</td>
                            <td><BadgeVersions n={r.nbVersions || 0} onClick={() => voirTimeline(r.idIntervention, r)} /></td>
                            <td><BadgeEtat etat={r.etat} /></td>
                            <td style={{ color: "#94a3b8", fontSize: ".72rem" }}>{libelleSecteur(r.typeQualification)}</td>
                            <td style={{ color: "#c4b5fd" }}>{r.typeIntervention || "-"}</td>
                            <td className="num" style={{ color: "#fbbf24" }}>{fmtMontant(r.montant)}</td>
                            <td style={{ color: "#94a3b8", fontSize: ".72rem" }}>{r.etapeActeur || "-"}</td>
                            <td style={{ color: "#64748b", fontSize: ".72rem", whiteSpace: "nowrap" }}>{fmtDate(r.dateQualification)}</td>
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
      <NexusModal ouvert={purgeOuvert} onClose={() => setPurgeOuvert(false)} verrouille={purgeEnCours} accent="#ef4444" icone={<Trash2 size={19} />} largeur={600}
        titre="Critical Override · Purge DB" sousTitre={`Copie locale de la periode ${periode}`}
        pied={purgeRes ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="nx-btn" onClick={() => setPurgeOuvert(false)} style={{ flex: 1, justifyContent: "center" }}>Fermer</button>
            <button className="nx-btn nx-primary" onClick={() => { setPurgeOuvert(false); synchroniser(periode, true); }} style={{ flex: 1, justifyContent: "center" }}>
              <CloudDownload size={15} /> Resynchroniser depuis l&apos;API
            </button>
          </div>
        ) : (
          <button className="nx-btn nx-danger" onClick={purger} disabled={purgeEnCours || purgeSaisie.trim() !== periode}
            style={{ width: "100%", justifyContent: "center", padding: ".9rem", fontWeight: 800 }}>
            <ShieldAlert size={16} /> {purgeEnCours ? "Purge en cours..." : `Purger ${periode}`}
          </button>
        )}>
        {purgeRes ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#6ee7b7", fontWeight: 600, fontSize: ".88rem" }}>
            <CheckCircle size={22} /> {purgeRes.epsSupprimes} EPS et {purgeRes.versionsSupprimees} versions supprimes de la copie locale. Les decisions Kyntus sont intactes.
          </div>
        ) : (
          <>
            <div style={{ color: "#cbd5e1", fontSize: ".86rem", lineHeight: 1.6, marginBottom: 14 }}>
              Supprime la <strong>copie locale</strong> des EPS et versions de <strong style={{ color: "#fca5a5" }}>{periode}</strong>.
              L&apos;API reste la source de verite : une synchronisation recree la periode a l&apos;identique.
              <div style={{ marginTop: 10, padding: ".7rem .9rem", borderRadius: 10, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)", color: "#6ee7b7", fontSize: ".8rem" }}>
                Les decisions Kyntus (validations, contestations) ne sont jamais supprimees.
              </div>
            </div>
            <div className="nx-label" style={{ marginBottom: 7 }}>Tapez <span style={{ color: "#fca5a5", fontFamily: "monospace" }}>{periode}</span> pour confirmer</div>
            <input className="nx-input" value={purgeSaisie} onChange={e => setPurgeSaisie(e.target.value)} placeholder={periode} style={{ width: "100%", fontFamily: "monospace" }} autoFocus />
          </>
        )}
      </NexusModal>
    </main>
  );
}
