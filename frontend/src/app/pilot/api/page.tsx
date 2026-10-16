"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  RefreshCw, Search, X, Calendar, Activity, Database, History,
  CheckCircle, AlertTriangle, Layers, Send, ListChecks, Clock, Eye, GitCommit, Download, Users
} from "lucide-react";

const API_BASE = "";

const CyberSelect = React.memo(({ value, options, onChange, disabled, width = "130px", variant = "default" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const label = useMemo(() => options.find((o: any) => o.value === value)?.label ?? value, [options, value]);
  const c = variant === "purple" ? "#d8b4fe" : variant === "green" ? "#86efac" : variant === "orange" ? "#fdba74" : "#00f0ff";
  const g = variant === "purple" ? "#ff00ff" : variant === "green" ? "#00ff41" : variant === "orange" ? "#f59e0b" : "#00f0ff";
  const bg = variant === "purple" ? "rgba(255,0,255,.15)" : variant === "green" ? "rgba(0,255,65,.15)" : variant === "orange" ? "rgba(245,158,11,.15)" : "rgba(0,240,255,.15)";
  return (
    <div ref={ref} style={{ position: "relative", width }}>
      <div onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ backgroundColor: "rgba(6,11,25,.8)", border: `1px solid ${isOpen ? g : "rgba(148,163,184,.3)"}`,
          padding: ".5rem .8rem", borderRadius: 4, color: disabled ? "#64748b" : (isOpen ? "#fff" : c),
          cursor: disabled ? "not-allowed" : "pointer", display: "flex", justifyContent: "space-between",
          alignItems: "center", fontFamily: "monospace", fontSize: ".82rem", transition: "all .3s",
          boxShadow: isOpen ? `0 0 15px ${bg}` : "inset 0 0 5px rgba(0,0,0,.8)", opacity: disabled ? .6 : 1 }}>
        <span style={{ fontWeight: "bold", letterSpacing: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label || "SELECT..."}</span>
        <span style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .4s", fontSize: ".7rem", marginLeft: 8 }}>▼</span>
      </div>
      {isOpen && !disabled && (
        <div className="cyber-scroll" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6,
          backgroundColor: "rgba(2,6,23,.98)", border: `1px solid ${g}`, borderRadius: 4, maxHeight: 240, overflowY: "auto", zIndex: 999999 }}>
          {options.map((opt: any) => (
            <div key={String(opt.value)} onClick={() => { onChange(opt.value); setIsOpen(false); }}
              style={{ padding: ".55rem .8rem", color: "#cbd5e1", fontFamily: "monospace", fontSize: ".8rem", cursor: "pointer", borderBottom: "1px solid rgba(148,163,184,.1)" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = bg; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#cbd5e1"; }}>
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
CyberSelect.displayName = "CyberSelect";

/** Bilan d'une recherche multiple : combien d'EPS presents, lesquels introuvables. */
const BandeauIntrouvables = ({ demandes, manquants, voir, setVoir, flash }: any) => {
  const nbManquants = manquants?.length || 0;
  const presents = Math.max(0, demandes - nbManquants);
  const copier = async () => {
    try { await navigator.clipboard.writeText((manquants || []).join("\n")); flash(`${nbManquants} EPS introuvables copies.`); }
    catch { flash("Copie impossible depuis ce navigateur."); }
  };
  return (
    <div style={{ marginTop: 12, padding: ".7rem 1rem", borderRadius: 6, fontFamily: "monospace", fontSize: ".75rem", color: "#cbd5e1",
      background: nbManquants ? "rgba(245,158,11,.08)" : "rgba(0,255,65,.08)",
      border: `1px solid ${nbManquants ? "rgba(245,158,11,.4)" : "rgba(0,255,65,.4)"}` }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span>
          RECHERCHE MULTIPLE · {demandes} EPS demandes · <span style={{ color: "#00ff41" }}>{presents} presents</span>
          {nbManquants > 0 && <> · <span style={{ color: "#f59e0b" }}>{nbManquants} introuvables sur la periode</span></>}
        </span>
        {nbManquants > 0 && (
          <>
            <span onClick={() => setVoir(!voir)} style={{ cursor: "pointer", color: "#00f0ff" }}>{voir ? "MASQUER" : "VOIR LES INTROUVABLES"}</span>
            <span onClick={copier} style={{ cursor: "pointer", color: "#00f0ff" }}>COPIER</span>
          </>
        )}
      </div>
      {voir && nbManquants > 0 && (
        <div className="cyber-scroll" style={{ marginTop: 8, maxHeight: 130, overflowY: "auto", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {manquants.map((e: string) => (
            <span key={e} style={{ padding: "2px 7px", borderRadius: 3, background: "rgba(245,158,11,.12)", color: "#fcd34d", fontSize: ".68rem" }}>{e}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const ETAT_COLORS: Record<string, string> = {
  EN_ATTENTE_VALIDATION_PARTENAIRE: "#f59e0b",
  EN_ATTENTE_VALIDATION_BYTEL: "#38bdf8",
  EN_ATTENTE_ANALYSE_PHOTOS: "#a855f7",
  EN_ATTENTE_VALIDATION_ANALYSE_PHOTOS: "#d8b4fe",
  VALIDEE: "#00ff41",
  INCONNU: "#64748b",
};

const TYPES_RACCORDEMENT = ["EXISTANTE", "BRASSAGE_PM", "INTERIEUR", "CHAMBRE", "AERIEN", "FACADE"];
const TYPES_PAR_QUALIF: Record<string, string[]> = {
  QualificationRaccordement: ["RACCORDEMENT", "BRASSAGE_PM", "PLP", "NOK"],
  QualificationSAV: ["SAV_STD", "SAV_MC", "SAV_SC", "SAV_REPRISE", "NOK"],
  QualificationReseau: ["AUDITS", "DESATURATION", "REMISE_EN_ETAT", "REPRISE_JARRETIERAGE", "EXPERTISES", "SOUDURE_ET_POSES_DE_CORPS_DE_TRAVERSES"],
};
// Designations de facturation reellement presentes, par type de qualification.
const ELEMENTS_PAR_QUALIF: Record<string, string[]> = {
  QualificationRaccordement: ["INSTALLATION", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "DEPLACEMENT", "GOULOTTE"],
  QualificationSAV:          ["INSTALLATION", "SUPPORT", "DEPLACEMENT", "JARRETIERES"],
  QualificationReseau:       ["INSTALLATION", "MATERIEL", "JARRETIERES", "DEPLACEMENT"],
};
const ELEMENTS_TOUS = ["INSTALLATION", "MES", "MATERIEL", "SUPPORT", "LOGISTIQUE", "DEPLACEMENT", "GOULOTTE", "JARRETIERES"];

/** Detail de facturation d'une version, quelle que soit sa provenance. */
const elementsDe = (v: any): Record<string, number> => {
  if (v?.elements && typeof v.elements === "object") return v.elements;
  const src = v?.qualifJson?.elementsFacturationCalcule ?? v?.brut?.elementsFacturationCalcule;
  if (!Array.isArray(src)) return {};
  const out: Record<string, number> = {};
  for (const e of src) {
    if (e?.designationElementFacturation) out[e.designationElementFacturation] = Number(e.montant ?? 0);
  }
  return out;
};

const totalElements = (el: Record<string, number>) =>
  Object.values(el || {}).reduce((a, b) => a + (Number(b) || 0), 0);

const ETAT_ACTIONNABLE = "EN_ATTENTE_VALIDATION_PARTENAIRE";

const fmtMontant = (m?: number | null) => {
  if (m === null || m === undefined) return "-";
  return `${Number(m).toFixed(2).replace(".", ",")} €`;
};

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  try { return new Date(d).toLocaleString("fr-FR"); } catch { return d; }
};

export default function BytelApiPage() {
  const [onglet, setOnglet] = useState<"LISTE" | "VERSIONS" | "DECISIONS">("LISTE");

  const [year, setYear] = useState<number | "TOUS">(new Date().getFullYear());
  const [month, setMonth] = useState<number | "TOUS">(new Date().getMonth() + 1);
  const [etat, setEtat] = useState(ETAT_ACTIONNABLE);
  const [type, setType] = useState("");
  const [qualifType, setQualifType] = useState("");
  const [traitement, setTraitement] = useState("");
  const [epsInput, setEpsInput] = useState("");
  // Recherche multiple : liste d'EPS collee (exacte), distincte du champ de saisie (partiel)
  const [epsListe, setEpsListe] = useState<string[]>([]);
  const [versEpsListe, setVersEpsListe] = useState<string[]>([]);
  const [listeModal, setListeModal] = useState<null | "LISTE" | "VERSIONS">(null);
  const [listeTexte, setListeTexte] = useState("");
  const [introuvables, setIntrouvables] = useState<string[]>([]);
  const [versIntrouvables, setVersIntrouvables] = useState<string[]>([]);
  const [voirIntrouvables, setVoirIntrouvables] = useState(false);
  // Export
  const [exportEtat, setExportEtat] = useState<any>(null);
  // Export equipe : EPS colles, periode propre, et mode de filtrage des commentaires
  const [equipeOuvert, setEquipeOuvert] = useState(false);
  const [equipeTexte, setEquipeTexte] = useState("");
  const [equipeAnnee, setEquipeAnnee] = useState<number | "TOUS">("TOUS");
  const [equipeMois, setEquipeMois] = useState<number | "TOUS">("TOUS");
  const [equipeDecisionsSeules, setEquipeDecisionsSeules] = useState(false);
  const [epsFiltre, setEpsFiltre] = useState("");

  const [rows, setRows] = useState<any[]>([]);
  const [nbVersionsParEps, setNbVersionsParEps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [etatsDispo, setEtatsDispo] = useState<string[]>([]);
  const [typesDispo, setTypesDispo] = useState<string[]>([]);
  const [qualifsDispo, setQualifsDispo] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  const [syncing, setSyncing] = useState(false);
  const [progres, setProgres] = useState<any>(null);
  const [mode, setMode] = useState<"DIRECT" | "BASE">("DIRECT");
  const [syncEtat, setSyncEtat] = useState<any>(null);
  const [dureeMs, setDureeMs] = useState<number | null>(null);
  const [patience, setPatience] = useState("");
  const [msg, setMsg] = useState("");
  const [erreur, setErreur] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [cible, setCible] = useState<any>(null);
  const [actionType, setActionType] = useState<"VALIDATION" | "CONTESTATION">("CONTESTATION");
  const [commentaire, setCommentaire] = useState("");
  const [nouveauType, setNouveauType] = useState("");
  const [nouveauRacc, setNouveauRacc] = useState("");
  const [apercu, setApercu] = useState<any>(null);
  const [showApercu, setShowApercu] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [timelineEps, setTimelineEps] = useState<string | null>(null);
  const [timelinePeriode, setTimelinePeriode] = useState("");
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [lotOuvert, setLotOuvert] = useState(false);
  const [lotCommentaire, setLotCommentaire] = useState("");
  const [lotType, setLotType] = useState<"VALIDATION" | "CONTESTATION">("VALIDATION");
  const [lotEnCours, setLotEnCours] = useState(false);
  const [lotResultat, setLotResultat] = useState<any>(null);

  // Onglet VERSIONS
  const [vers, setVers] = useState<any[]>([]);
  const [versLoading, setVersLoading] = useState(false);
  const [versEps, setVersEps] = useState("");
  const [versEtat, setVersEtat] = useState("");
  const [versDebut, setVersDebut] = useState("");
  const [versFin, setVersFin] = useState("");
  const [versDetail, setVersDetail] = useState(false);
  // Vue "historique par EPS" : chaque EPS avec toutes ses versions, de la plus ancienne a la plus recente
  const [versParEps, setVersParEps] = useState(false);
  const [versModeEtat, setVersModeEtat] = useState<"COURANTE" | "PREMIERE" | "TOUTE">("COURANTE");
  const [versGroupes, setVersGroupes] = useState<any[]>([]);
  const [qualifTypeVersions, setQualifTypeVersions] = useState("");
  const [versPage, setVersPage] = useState(0);
  const [versTotalPages, setVersTotalPages] = useState(0);
  const [versTotal, setVersTotal] = useState(0);

  // Onglet DECISIONS
  const [histo, setHisto] = useState<any[]>([]);
  const [histoLoading, setHistoLoading] = useState(false);
  const [histoType, setHistoType] = useState("");
  const [histoEps, setHistoEps] = useState("");
  const [histoPage, setHistoPage] = useState(0);
  const [histoTotalPages, setHistoTotalPages] = useState(0);
  const [histoTotal, setHistoTotal] = useState(0);

  // Periode exacte (ex : 2026_M07) quand annee ET mois sont choisis ;
  // sinon un libelle, et la lecture passe obligatoirement par la base.
  const periodeExacte = year !== "TOUS" && month !== "TOUS";
  const periode = useMemo(() => {
    if (year !== "TOUS" && month !== "TOUS") return `${year}_M${String(month).padStart(2, "0")}`;
    if (year === "TOUS" && month === "TOUS") return "TOUTES PERIODES";
    if (year === "TOUS") return `TOUTES ANNEES · M${String(month).padStart(2, "0")}`;
    return `${year} · TOUS MOIS`;
  }, [year, month]);
  // Parametres de periode pour l'API : le serveur traduit TOUS en joker
  const qPer = useMemo(() => `year=${year}&month=${month}`, [year, month]);

  // Filtres de l'onglet INTERVENTIONS. Partages par l'affichage et l'export :
  // le fichier contient exactement ce que montre l'ecran, toutes pages confondues.
  const filtresListe = () => ({
    year: String(year), month: String(month),
    etat, type, qualif: qualifType,
    eps: epsFiltre, epsList: epsListe,
    traitement, page, size,
  });

  // Filtres de l'onglet HISTORIQUE / VERSIONS
  const filtresVersions = () => ({
    year: String(year), month: String(month),
    etat: versEtat, qualif: qualifTypeVersions,
    eps: versEps, epsList: versEpsListe,
    dateDebut: versDebut, dateFin: versFin,
    page: versPage, size: versParEps ? 20 : 50,
    modeEtat: versModeEtat,
  });
  const auteur = useMemo(() => {
    if (typeof window === "undefined") return "INCONNU";
    try {
      const u = localStorage.getItem("kyntus_user") || localStorage.getItem("user");
      if (u) { const p = JSON.parse(u); return p?.username || p?.login || p?.nom || p?.email || "INCONNU"; }
      return localStorage.getItem("username") || "INCONNU";
    } catch { return "INCONNU"; }
  }, []);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 7000); };
  const flashErr = (m: string) => { setErreur(m); setTimeout(() => setErreur(""), 10000); };

  useEffect(() => { fetch(`${API_BASE}/api/bytel/config`).then(r => r.json()).then(setConfig).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(() => { setEpsFiltre(epsInput); setPage(0); }, 400); return () => clearTimeout(t); }, [epsInput]);

  useEffect(() => {
    (async () => {
      try {
        const [e, t, q, s] = await Promise.all([
          fetch(`${API_BASE}/api/bytel/etats?${qPer}`),
          fetch(`${API_BASE}/api/bytel/types?${qPer}`),
          fetch(`${API_BASE}/api/bytel/types-qualification?${qPer}`),
          fetch(`${API_BASE}/api/bytel/stats?${qPer}`),
        ]);
        if (e.ok) setEtatsDispo(await e.json());
        if (t.ok) setTypesDispo(await t.json());
        if (q.ok) setQualifsDispo(await q.json());
        if (s.ok) setStats(await s.json());
      } catch { /* silencieux */ }
    })();
  }, [qPer, refresh]);

  // Un filtre impose la base locale : l'API ne sait filtrer que par periode.
  const filtreActif = useMemo(
    () => Boolean(!periodeExacte || etat || type || qualifType || epsFiltre || traitement || epsListe.length > 0),
    [periodeExacte, etat, type, qualifType, epsFiltre, traitement, epsListe]);

  useEffect(() => {
    if (onglet !== "LISTE") return;
    let annule = false;

    (async () => {
      setLoading(true);
      try {
        if (!filtreActif) {
          // ---------- Lecture DIRECTE ----------
          // L'API source est parfois lente au premier acces sur une periode.
          // On reessaie en silence plutot que d'afficher une erreur.
          const p = new URLSearchParams({ period: periode, page: String(page), size: String(size) });
          let d: any = null;
          let derniere = "";

          for (let essai = 1; essai <= 4 && !annule; essai++) {
            if (essai > 1) setPatience(`Preparation des donnees, tentative ${essai}/4...`);
            try {
              const r = await fetch(`${API_BASE}/api/bytel/live?${p}`);
              if (r.ok) {
                const j = await r.json();
                if (!j.erreur) { d = j; break; }
                derniere = j.erreur;
              } else {
                derniere = `HTTP ${r.status}`;
              }
            } catch (e: any) {
              derniere = e?.message || String(e);
            }
            if (essai < 4) await new Promise(res => setTimeout(res, 1500 * essai));
          }

          if (annule) return;
          setPatience("");
          setMode("DIRECT");

          if (!d) {
            setRows([]); setNbVersionsParEps({}); setTotalPages(0); setTotalItems(0); setDureeMs(null);
            flashErr(`Lecture directe impossible apres 4 tentatives : ${derniere}`);
          } else {
            setRows(d.content || []);
            setNbVersionsParEps({});
            setTotalPages(d.totalPages || 0);
            setTotalItems(d.totalItems || 0);
            setDureeMs(d.dureeMs ?? null);
          }
        } else {
          // ---------- Lecture en BASE : necessite la synchronisation ----------
          // POST : une liste de centaines d'EPS ne tiendrait pas dans une URL
          const r = await fetch(`${API_BASE}/api/bytel/qualifications/recherche`, {
            method: "POST", headers: { "Content-Type": "application/json" },
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
        if (!annule) { setLoading(false); setPatience(""); }
      }
    })();

    return () => { annule = true; };
  }, [periode, qPer, page, size, etat, type, qualifType, epsFiltre, epsListe, traitement, refresh, onglet, filtreActif]);

  const chargerVersions = useCallback(async () => {
    setVersLoading(true);
    try {
      const url = versParEps ? "/api/bytel/versions/par-eps" : "/api/bytel/versions/recherche";
      const r = await fetch(`${API_BASE}${url}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtresVersions()),
      });
      if (r.ok) {
        const d = await r.json();
        if (versParEps) { setVersGroupes(d.content || []); setVers([]); }
        else { setVers(d.content || []); setVersGroupes([]); }
        setVersTotalPages(d.totalPages || 0); setVersTotal(d.totalItems || 0);
        setVersIntrouvables(d.epsIntrouvables || []);
        if (d.note) flashErr(d.note);
      }
    } catch { flashErr("Versions indisponibles."); } finally { setVersLoading(false); }
  }, [qPer, versEps, versEpsListe, versEtat, qualifTypeVersions, versDebut, versFin, versPage, versParEps, versModeEtat]);

  useEffect(() => { if (onglet === "VERSIONS") chargerVersions(); }, [onglet, chargerVersions]);

  const chargerDecisions = useCallback(async () => {
    setHistoLoading(true);
    try {
      const p = new URLSearchParams({ year: String(year), month: String(month), page: String(histoPage), size: "50" });
      if (histoType) p.append("actionType", histoType);
      if (histoEps) p.append("eps", histoEps);
      const r = await fetch(`${API_BASE}/api/bytel/historique?${p}`);
      if (r.ok) { const d = await r.json(); setHisto(d.content || []); setHistoTotalPages(d.totalPages || 0); setHistoTotal(d.totalItems || 0); }
    } catch { flashErr("Historique indisponible."); } finally { setHistoLoading(false); }
  }, [year, month, histoType, histoEps, histoPage]);

  useEffect(() => { if (onglet === "DECISIONS") chargerDecisions(); }, [onglet, chargerDecisions]);

  // Lit l'etat de synchronisation de la periode, sans rien declencher.
  const lireSyncEtat = useCallback(async (p: string) => {
    try {
      const r = await fetch(`${API_BASE}/api/bytel/sync/status?period=${p}`);
      if (r.ok) setSyncEtat(await r.json());
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    if (periodeExacte) lireSyncEtat(periode);
    else setSyncEtat(null);
  }, [periode, periodeExacte, refresh, lireSyncEtat]);

  /**
   * Lance la synchronisation en arriere-plan. L'ecran n'est JAMAIS bloque :
   * la liste continue de s'afficher en lecture directe pendant ce temps.
   */
  const synchroniser = useCallback(async (p: string, forcer: boolean) => {
    setSyncing(true);
    try {
      const r = await fetch(`${API_BASE}/api/bytel/sync?period=${p}&forcer=${forcer}`, { method: "POST" });
      const d = await r.json().catch(() => null);

      if (d?.ignoree) {
        flash(`${p} est deja synchronisee. Utilisez "Forcer" pour relancer.`);
        setSyncEtat(d);
        setSyncing(false);
        return;
      }

      // Suivi discret, sans overlay
      let fini = false, tours = 0;
      while (!fini && tours < 3000) {
        await new Promise(res => setTimeout(res, 2000));
        tours++;
        try {
          const rs = await fetch(`${API_BASE}/api/bytel/sync/status?period=${p}`);
          if (!rs.ok) continue;
          const st = await rs.json();
          setSyncEtat(st);
          setProgres(st);
          if (st.statut !== "EN_COURS") {
            fini = true;
            if (Array.isArray(st.erreurs) && st.erreurs.length > 0) {
              flashErr(`${st.erreurs[0]}${st.erreurs.length > 1 ? ` (+${st.erreurs.length - 1} autres)` : ""}`);
              console.warn("Erreurs de synchronisation :", st.erreurs);
            } else {
              flash(`Synchronisation de ${p} terminee : ${st.messageFinal || ""}`);
            }
            setRefresh(x => x + 1);
          }
        } catch { /* on retente */ }
      }
    } catch (e: any) {
      flashErr(`Synchronisation impossible : ${e?.message || e}`);
    } finally {
      setSyncing(false);
      setProgres(null);
    }
  }, []);

  const lancerSync = () => { if (periodeExacte) synchroniser(periode, false); };
  const forcerSync = () => { if (periodeExacte) synchroniser(periode, true); };

  const annulerSync = async () => {
    try { await fetch(`${API_BASE}/api/bytel/sync/annuler?period=${periode}`, { method: "POST" }); } catch { /* ignore */ }
  };

  const ouvrirAction = (row: any, t: "VALIDATION" | "CONTESTATION") => {
    setCible(row); setActionType(t);
    setCommentaire(t === "VALIDATION" ? "RAS" : "");
    setNouveauType(row.typeIntervention || ""); setNouveauRacc(row.typeRaccordement || "");
    setApercu(null); setShowApercu(false);
  };

  const chargerApercu = async () => {
    if (!cible) return;
    try {
      const p = new URLSearchParams({ qualificationId: cible.qualificationId, period: cible.periode || periode });
      if (nouveauType) p.append("typeInterventionApres", nouveauType);
      if (nouveauRacc) p.append("typeRaccordementApres", nouveauRacc);
      const r = await fetch(`${API_BASE}/api/bytel/actions/apercu?${p}`);
      if (r.ok) { setApercu(await r.json()); setShowApercu(true); }
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
          qualificationId: cible.qualificationId, period: cible.periode || periode, actionType,
          commentaire: commentaire.trim(),
          typeInterventionApres: nouveauType || null,
          typeRaccordementApres: nouveauRacc || null,
          auteur,
          // En lecture directe, la ligne n'est pas en base : on transmet la
          // qualification brute pour agir sans attendre une synchronisation.
          snapshot: cible?.versions?.[0]?.brut ?? null,
          eps: cible.idIntervention,
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
      // La selection porte des cles "uuid|periode" : en mode toutes periodes,
      // on envoie un lot par periode.
      const parPeriode: Record<string, string[]> = {};
      for (const cle of Array.from(selection)) {
        const [qid, per] = cle.split("|");
        const pp = per || periode;
        (parPeriode[pp] ||= []).push(qid);
      }
      const cumul = { traites: 0, succes: 0, echecs: 0, details: [] as any[] };
      for (const [pp, ids] of Object.entries(parPeriode)) {
        const r = await fetch(`${API_BASE}/api/bytel/actions/lot`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qualificationIds: ids, period: pp, actionType: lotType, commentaire: lotCommentaire.trim(), auteur }),
        });
        const d = await r.json();
        cumul.traites += d.traites || 0;
        cumul.succes += d.succes || 0;
        cumul.echecs += d.echecs || 0;
        cumul.details.push(...(d.details || []));
      }
      setLotResultat(cumul);
      flash(`Lot : ${cumul.succes} succes, ${cumul.echecs} echecs.`);
      setSelection(new Set()); setRefresh(x => x + 1);
    } catch { flashErr("Erreur reseau."); } finally { setLotEnCours(false); }
  };

  const voirTimeline = async (eps: string, ligne?: any) => {
    const per = ligne?.periode || periode;
    setTimelinePeriode(per);
    setTimelineEps(eps); setLoadingTimeline(true); setTimeline([]);
    try {
      // En lecture directe, la ligne contient deja toutes ses versions :
      // aucun appel n'est necessaire, l'affichage est immediat.
      if (ligne?.versions?.length) {
        const versions = [...ligne.versions]
          .sort((a: any, b: any) => String(a.dateQualification || "").localeCompare(String(b.dateQualification || "")))
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

        // On ajoute les decisions Kyntus, qui vivent en base
        try {
          const r = await fetch(`${API_BASE}/api/bytel/history/eps/${eps}?period=${per}`);
          if (r.ok) {
            const actions = await r.json();
            for (const a of actions) {
              if (a.actionType === "SYNC_ETAT" || a.actionType === "ETAT_INITIAL") continue;
              versions.push({
                source: "KYNTUS", version: a.versionNo, courante: false,
                date: a.actionAt, qualificationId: a.qualificationId,
                actionType: a.actionType, etat: a.etatApres, etatAvant: a.etatAvant,
                typeIntervention: a.typeInterventionApres, typeInterventionAvant: a.typeInterventionAvant,
                typeRaccordement: a.typeRaccordementApres, montant: a.montant,
                commentaire: a.commentaire, acteur: a.auteur,
                statutEnvoi: a.statutEnvoi, httpStatus: a.httpStatus,
              } as any);
            }
            versions.sort((a: any, b: any) => String(a.date || "").localeCompare(String(b.date || "")));
          }
        } catch { /* les versions Bytel suffisent */ }

        setTimeline(versions);
        return;
      }

      // Mode base : la chronologie est assemblee cote serveur
      const r = await fetch(`${API_BASE}/api/bytel/timeline/${eps}?period=${per}`);
      if (r.ok) setTimeline(await r.json());
    } catch { /* silencieux */ } finally { setLoadingTimeline(false); }
  };

  const toggleSel = (cle: string) =>
    setSelection(prev => { const n = new Set(prev); n.has(cle) ? n.delete(cle) : n.add(cle); return n; });

  const cleSel = (r: any) => `${r.qualificationId}|${r.periode || periode}`;

  // ---------------- Recherche multiple d'EPS ----------------
  /** Decoupe un texte colle (Excel, mail, liste) en identifiants distincts. */
  const parserListe = (t: string) =>
    Array.from(new Set(
      (t || "").split(/[\s,;|]+/)
        .map(x => x.trim().replace(/["']/g, "").toUpperCase())
        .filter(Boolean)));

  const ouvrirListe = (cibleListe: "LISTE" | "VERSIONS") => {
    setListeTexte((cibleListe === "LISTE" ? epsListe : versEpsListe).join("\n"));
    setListeModal(cibleListe);
  };

  const appliquerListe = () => {
    const l = parserListe(listeTexte);
    if (listeModal === "LISTE") {
      setEpsListe(l); setEpsInput(""); setEpsFiltre(""); setPage(0);
    } else {
      setVersEpsListe(l); setVersEps(""); setVersPage(0);
    }
    setVoirIntrouvables(false);
    setListeModal(null);
  };

  /** Coller plusieurs EPS dans le champ bascule directement en recherche multiple. */
  const collerEps = (e: React.ClipboardEvent<HTMLInputElement>, cibleListe: "LISTE" | "VERSIONS") => {
    const l = parserListe(e.clipboardData.getData("text"));
    if (l.length < 2) return;
    e.preventDefault();
    if (cibleListe === "LISTE") { setEpsListe(l); setEpsInput(""); setEpsFiltre(""); setPage(0); }
    else { setVersEpsListe(l); setVersEps(""); setVersPage(0); }
    setVoirIntrouvables(false);
    flash(`${l.length} EPS charges pour la recherche multiple.`);
  };

  // ---------------- Export Excel ----------------
  /**
   * Le fichier est genere cote serveur en arriere-plan, puis telecharge.
   * Il reprend exactement les filtres de l'onglet, toutes pages confondues.
   */
  const lancerExport = async (onglet: "INTERVENTIONS" | "VERSIONS" | "VERSIONS_EPS") => {
    if (exportEtat?.statut === "EN_COURS") return;
    // Les deux exports de l'onglet versions partagent ses filtres
    const filtres = onglet === "INTERVENTIONS" ? filtresListe() : filtresVersions();
    setExportEtat({ statut: "EN_COURS", onglet, ecrites: 0, total: 0, pourcentage: 0 });
    try {
      const r = await fetch(`${API_BASE}/api/bytel/export`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onglet, filtres }),
      });
      const d = await r.json().catch(() => null);
      if (!d?.id) { flashErr(`Export impossible : ${d?.erreur || "reponse inattendue"}`); return; }

      let fini = false, tours = 0;
      while (!fini && tours < 2400) {
        await new Promise(res => setTimeout(res, 1500));
        tours++;
        try {
          const rs = await fetch(`${API_BASE}/api/bytel/export/${d.id}/status`);
          if (!rs.ok) continue;
          const st = await rs.json();
          setExportEtat({ ...st, onglet });
          if (st.statut === "TERMINE") {
            fini = true;
            if (!st.ecrites) {
              flashErr(mode === "DIRECT" && onglet === "INTERVENTIONS"
                ? "Aucune ligne en base pour cette periode : l'export lit la base, synchronisez le mois d'abord."
                : "Aucune ligne a exporter avec ces filtres.");
            } else {
              const a = document.createElement("a");
              a.href = `${API_BASE}/api/bytel/export/${d.id}/fichier`;
              a.download = st.nomFichier || "export_bytel.xlsx";
              document.body.appendChild(a); a.click(); a.remove();
              flash(`Export termine : ${st.ecrites} lignes en ${st.dureeSecondes}s${st.tronque ? " · limite Excel atteinte, fichier tronque" : ""}.`);
            }
          } else if (st.statut === "ERREUR" || st.statut === "INCONNU") {
            fini = true;
            flashErr(`Export en echec : ${st.erreur || st.statut}`);
          }
        } catch { /* on retente au tour suivant */ }
      }
    } catch (e: any) {
      flashErr(`Export impossible : ${e?.message || e}`);
    } finally {
      setExportEtat(null);
    }
  };

  /**
   * Export equipe : une ligne par EPS demande, avec ses commentaires d'equipe.
   * Les EPS absents ressortent avec une ligne vide, ce qui permet de les reperer.
   */
  const lancerExportEquipe = async () => {
    const liste = parserListe(equipeTexte);
    if (!liste.length) { flashErr("Collez au moins un EPS."); return; }
    if (exportEtat?.statut === "EN_COURS") return;

    setExportEtat({ statut: "EN_COURS", onglet: "EQUIPE", ecrites: 0, total: liste.length, pourcentage: 0 });
    try {
      const r = await fetch(`${API_BASE}/api/bytel/export/equipe`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          epsList: liste,
          year: String(equipeAnnee), month: String(equipeMois),
          seulementDecisions: equipeDecisionsSeules,
        }),
      });
      const d = await r.json().catch(() => null);
      if (!d?.id) { flashErr(`Export equipe impossible : ${d?.erreur || "reponse inattendue"}`); return; }

      let fini = false, tours = 0;
      while (!fini && tours < 2400) {
        await new Promise(res => setTimeout(res, 1500));
        tours++;
        try {
          const rs = await fetch(`${API_BASE}/api/bytel/export/${d.id}/status`);
          if (!rs.ok) continue;
          const st = await rs.json();
          setExportEtat({ ...st, onglet: "EQUIPE" });
          if (st.statut === "TERMINE") {
            fini = true;
            const a = document.createElement("a");
            a.href = `${API_BASE}/api/bytel/export/${d.id}/fichier`;
            a.download = st.nomFichier || "export_equipe.xlsx";
            document.body.appendChild(a); a.click(); a.remove();
            flash(`Export equipe termine : ${liste.length} EPS en ${st.dureeSecondes}s.`);
            setEquipeOuvert(false);
          } else if (st.statut === "ERREUR" || st.statut === "INCONNU") {
            fini = true;
            flashErr(`Export equipe en echec : ${st.erreur || st.statut}`);
          }
        } catch { /* on retente */ }
      }
    } catch (e: any) {
      flashErr(`Export equipe impossible : ${e?.message || e}`);
    } finally {
      setExportEtat(null);
    }
  };

  const toutSelectionner = () => {
    const a = rows.filter(r => r.etat === ETAT_ACTIONNABLE).map(cleSel);
    setSelection(prev => prev.size === a.length ? new Set() : new Set(a));
  };

  const yearOptions = useMemo(() => [{ value: "TOUS", label: "TOUTES" }, ...[2024, 2025, 2026, 2027, 2028].map(y => ({ value: y, label: `${y}` }))], []);
  const monthOptions = useMemo(() => [{ value: "TOUS", label: "TOUS" }, ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `M-${String(i + 1).padStart(2, "0")}` }))], []);
  const etatOptions = useMemo(() => [{ value: "", label: "[ TOUS ETATS ]" }, ...etatsDispo.map(e => ({ value: e, label: e }))], [etatsDispo]);
  const typeOptions = useMemo(() => [{ value: "", label: "[ TOUS TYPES ]" }, ...typesDispo.map(t => ({ value: t, label: t }))], [typesDispo]);
  const qualifOptions = useMemo(() => [{ value: "", label: "[ TOUTES QUALIFS ]" }, ...qualifsDispo.map(q => ({ value: q, label: q.replace("Qualification", "") }))], [qualifsDispo]);
  /**
   * Colonnes de facturation affichees.
   * Si un type de qualification est filtre, on montre exactement ses
   * designations ; sinon l'union, les cases sans valeur restant vides.
   */
  const colonnesDetail = useMemo(() => {
    if (qualifTypeVersions && ELEMENTS_PAR_QUALIF[qualifTypeVersions]) {
      return ELEMENTS_PAR_QUALIF[qualifTypeVersions];
    }
    const presentes = new Set<string>();
    for (const v of vers) Object.keys(elementsDe(v)).forEach(k => presentes.add(k));
    const ordre = ELEMENTS_TOUS.filter(c => presentes.has(c));
    return ordre.length ? ordre : ELEMENTS_TOUS;
  }, [qualifTypeVersions, vers]);

  const typesPourCible = useMemo(() => (TYPES_PAR_QUALIF[cible?.typeQualification] || []).map(v => ({ value: v, label: v })), [cible]);

  return (
    <main style={{ padding: "1.5rem", minHeight: "100vh", position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: -2, backgroundImage: "linear-gradient(135deg,#020617,#08122a,#000c17,#130321)" }} />

      <style>{`
        .mecha-btn{display:flex;align-items:center;gap:7px;padding:.55rem 1.1rem;background:rgba(10,15,30,.85);color:#fff;border:1px solid rgba(255,255,255,.15);font-family:monospace;font-size:.8rem;font-weight:bold;cursor:pointer;text-transform:uppercase;letter-spacing:1px;border-radius:4px;transition:all .2s}
        .mecha-btn:disabled{opacity:.45;cursor:not-allowed}
        .btn-info{border-color:rgba(0,240,255,.5);color:#00f0ff}
        .btn-info:hover:not(:disabled){background:rgba(0,240,255,.15)}
        .btn-success{border-color:rgba(0,255,65,.5);color:#00ff41}
        .btn-success:hover:not(:disabled){background:rgba(0,255,65,.15)}
        .btn-warning{border-color:rgba(245,158,11,.5);color:#f59e0b}
        .btn-warning:hover:not(:disabled){background:rgba(245,158,11,.15)}
        .btn-purple{border-color:rgba(168,85,247,.5);color:#d8b4fe}
        .btn-purple:hover:not(:disabled){background:rgba(168,85,247,.15)}
        .cyber-input{background:rgba(6,11,25,.8);border:1px solid rgba(148,163,184,.3);color:#fff;padding:.55rem .8rem;border-radius:4px;font-family:monospace;font-size:.85rem;outline:none}
        .cyber-input:focus{border-color:#00f0ff}
        .cyber-textarea{background:rgba(6,11,25,.9);border:1px solid rgba(0,240,255,.4);color:#e2e8f0;padding:1rem;border-radius:6px;font-family:monospace;font-size:.88rem;outline:none;resize:vertical;width:100%}
        .cyber-scroll::-webkit-scrollbar{width:6px;height:6px}
        .cyber-scroll::-webkit-scrollbar-thumb{background:rgba(0,240,255,.4);border-radius:4px}
        table.bt{width:100%;border-collapse:collapse;font-family:monospace;font-size:.78rem}
        table.bt th{background:rgba(2,6,23,.97);color:#94a3b8;text-align:left;padding:.65rem .5rem;font-size:.66rem;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid rgba(0,240,255,.3);position:sticky;top:0;z-index:2;white-space:nowrap}
        table.bt td{padding:.5rem;border-bottom:1px solid rgba(148,163,184,.08);color:#cbd5e1;vertical-align:middle}
        table.bt tr:hover td{background:rgba(0,240,255,.04)}
        .tab{padding:.65rem 1.3rem;font-family:monospace;font-weight:bold;letter-spacing:2px;cursor:pointer;border:1px solid transparent;border-radius:6px 6px 0 0;font-size:.78rem;user-select:none}
        .tab-on{background:rgba(0,240,255,.12);border-color:rgba(0,240,255,.5);color:#00f0ff}
        .tab-off{color:#64748b;background:rgba(10,15,30,.5)}
        .tab-off:hover{color:#94a3b8;background:rgba(10,15,30,.8)}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ maxWidth: 1650, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15, borderBottom: "1px solid rgba(0,240,255,.3)", paddingBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Database size={28} color="#00f0ff" />
            <div>
              <h1 style={{ color: "#fff", margin: 0, fontFamily: "monospace", fontSize: "1.5rem", letterSpacing: 4 }}>
                SECTION <span style={{ color: "#00f0ff" }}>API</span>
              </h1>
              <div style={{ color: "#64748b", fontSize: ".7rem", fontFamily: "monospace", letterSpacing: 2, marginTop: 2 }}>
                1 LIGNE = 1 EPS · PERIODE {periode}
                {config && !config.envoiActive && <span style={{ color: "#f59e0b" }}> · ENVOI BYTEL DESACTIVE</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="mecha-btn btn-info" onClick={lancerSync} disabled={syncing || !periodeExacte}
              title={periodeExacte ? "Copie le mois en base pour permettre filtres et recherche" : "Choisissez une annee et un mois precis pour synchroniser"}>
              <RefreshCw size={15} style={syncing ? { animation: "spin 1s linear infinite" } : undefined} />
              {syncing ? "SYNCHRONISATION..." : "SYNCHRONISER"}
            </button>
            <button className="mecha-btn btn-success" onClick={() => setEquipeOuvert(true)}
              title="Exporter les commentaires de l'equipe pour une liste d'EPS">
              <Users size={15} /> TEAM EXPORT
            </button>
            <button className="mecha-btn btn-purple" onClick={forcerSync} disabled={syncing || !periodeExacte}
              title="Relance meme si le mois est deja a jour">
              FORCER
            </button>
            {selection.size > 0 && (
              <button className="mecha-btn btn-purple" onClick={() => { setLotOuvert(true); setLotResultat(null); }}>
                <ListChecks size={15} /> TRAITER {selection.size}
              </button>
            )}
          </div>
        </div>

        {/* Bandeau : mode de lecture et fraicheur de la base */}
        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap",
          fontFamily: "monospace", fontSize: ".72rem" }}>
          <span style={{ padding: ".35rem .7rem", borderRadius: 4,
            background: mode === "DIRECT" ? "rgba(0,255,65,.12)" : "rgba(168,85,247,.12)",
            border: `1px solid ${mode === "DIRECT" ? "rgba(0,255,65,.45)" : "rgba(168,85,247,.45)"}`,
            color: mode === "DIRECT" ? "#00ff41" : "#d8b4fe" }}>
            {mode === "DIRECT" ? "LECTURE DIRECTE" : (periodeExacte ? "LECTURE EN BASE" : "LECTURE EN BASE · PERIODES SYNCHRONISEES")}
            {dureeMs != null && mode === "DIRECT" ? ` · ${dureeMs} ms` : ""}
          </span>

          {syncing && progres && (
            <span style={{ padding: ".35rem .7rem", borderRadius: 4, background: "rgba(0,240,255,.12)",
              border: "1px solid rgba(0,240,255,.45)", color: "#00f0ff", display: "flex", alignItems: "center", gap: 7 }}>
              <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
              Synchronisation {progres.pourcentage ?? 0} % · page {progres.pagesLues ?? 0}/{progres.pagesTotal ?? "?"}
              <span onClick={annulerSync} style={{ cursor: "pointer", color: "#ff4d4d", marginLeft: 6 }}>ARRETER</span>
            </span>
          )}

          {!syncing && syncEtat && (
            <span style={{ padding: ".35rem .7rem", borderRadius: 4, background: "rgba(10,15,30,.8)",
              border: "1px solid rgba(148,163,184,.3)", color: syncEtat.aJour ? "#86efac" : "#94a3b8" }}>
              {syncEtat.statut === "JAMAIS"
                ? "Base vide pour ce mois : filtres et recherche indisponibles"
                : `Base synchronisee ${syncEtat.derniereSync ? new Date(syncEtat.derniereSync).toLocaleString("fr-FR") : ""} · ${syncEtat.totalEps ?? 0} EPS`}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          <div className={`tab ${onglet === "LISTE" ? "tab-on" : "tab-off"}`} onClick={() => setOnglet("LISTE")}>INTERVENTIONS</div>
          <div className={`tab ${onglet === "VERSIONS" ? "tab-on" : "tab-off"}`} onClick={() => setOnglet("VERSIONS")}>HISTORIQUE / VERSIONS</div>
          <div className={`tab ${onglet === "DECISIONS" ? "tab-on" : "tab-off"}`} onClick={() => setOnglet("DECISIONS")}>DECISIONS KYNTUS</div>
        </div>

        {msg && <div style={{ marginTop: 14, padding: ".9rem", borderLeft: "4px solid #00ff41", background: "rgba(0,255,65,.1)", color: "#00ff41", fontFamily: "monospace", fontSize: ".82rem", display: "flex", gap: 10, alignItems: "center", borderRadius: 4 }}><CheckCircle size={18} /> {msg}</div>}
        {erreur && <div style={{ marginTop: 14, padding: ".9rem", borderLeft: "4px solid #ff003c", background: "rgba(255,0,60,.1)", color: "#ff8080", fontFamily: "monospace", fontSize: ".82rem", display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 4, wordBreak: "break-all" }}><AlertTriangle size={18} style={{ flexShrink: 0 }} /> {erreur}</div>}

        {exportEtat && (
          <div style={{ marginTop: 14, padding: ".8rem 1rem", borderLeft: "4px solid #00f0ff", background: "rgba(0,240,255,.08)",
            color: "#00f0ff", fontFamily: "monospace", fontSize: ".8rem", display: "flex", gap: 12, alignItems: "center", borderRadius: 4, flexWrap: "wrap" }}>
            <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
            <span>EXPORT {exportEtat.onglet} EN COURS</span>
            <div style={{ flex: 1, minWidth: 160, height: 8, background: "rgba(148,163,184,.18)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${exportEtat.pourcentage ?? 0}%`, background: "linear-gradient(90deg,#00f0ff,#00ff41)", transition: "width .4s" }} />
            </div>
            <span>{exportEtat.ecrites ?? 0} / {exportEtat.total ?? "?"} lignes · {exportEtat.pourcentage ?? 0} %</span>
          </div>
        )}

        {/* ======================== LISTE ======================== */}
        {onglet === "LISTE" && (
          <>
            <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(10,15,30,.8)", padding: ".7rem 1rem", border: "1px solid rgba(0,255,65,.4)", borderRadius: 6 }}>
                <Calendar size={17} color="#00ff41" />
                <CyberSelect width="95px" value={year} options={yearOptions} onChange={(v: any) => { setYear(v); setPage(0); }} variant="green" />
                <CyberSelect width="95px" value={month} options={monthOptions} onChange={(v: any) => { setMonth(v); setPage(0); }} variant="green" />
              </div>
              <div style={{ display: "flex", gap: 9, padding: ".7rem 1rem", background: "rgba(10,15,30,.8)", border: "1px solid rgba(0,240,255,.4)", borderRadius: 6, alignItems: "center", flex: 1, minWidth: 340, flexWrap: "wrap" }}>
                <Search size={17} color="#00f0ff" />
                {epsListe.length === 0 && (
                  <input className="cyber-input" style={{ width: 150 }} placeholder="EPS..." value={epsInput}
                    onChange={e => setEpsInput(e.target.value)}
                    onPaste={e => collerEps(e, "LISTE")}
                    title="Un EPS : recherche partielle. Collez plusieurs EPS : recherche multiple." />
                )}
                {epsListe.length > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, padding: ".4rem .7rem", borderRadius: 4,
                    background: "rgba(0,240,255,.15)", border: "1px solid rgba(0,240,255,.5)", color: "#00f0ff",
                    fontFamily: "monospace", fontSize: ".72rem", whiteSpace: "nowrap" }}>
                    <span onClick={() => ouvrirListe("LISTE")} style={{ cursor: "pointer" }} title="Modifier la liste">
                      LISTE · {epsListe.length} EPS
                    </span>
                    <X size={12} style={{ cursor: "pointer", color: "#ff4d4d" }}
                      onClick={() => { setEpsListe([]); setPage(0); }} />
                  </span>
                )}
                <button className="mecha-btn btn-info" style={{ padding: ".45rem .7rem", fontSize: ".66rem" }}
                  onClick={() => ouvrirListe("LISTE")} title="Rechercher plusieurs EPS a la fois">
                  <ListChecks size={12} /> MULTI-EPS
                </button>
                <CyberSelect width="240px" value={etat} options={etatOptions} onChange={(v: string) => { setEtat(v); setPage(0); }} variant="orange" />
                <CyberSelect width="150px" value={qualifType} options={qualifOptions} onChange={(v: string) => { setQualifType(v); setPage(0); }} variant="purple" />
                <CyberSelect width="165px" value={type} options={typeOptions} onChange={(v: string) => { setType(v); setPage(0); }} />
                <CyberSelect width="150px" value={traitement} variant="green"
                  options={[{ value: "", label: "[ TOUTES ]" }, { value: "NON_TRAITEE", label: "NON TRAITEES" }, { value: "TRAITEE", label: "TRAITEES" }]}
                  onChange={(v: string) => { setTraitement(v); setPage(0); }} />
                {(etat || type || qualifType || epsInput || traitement || epsListe.length > 0) && (
                  <button className="mecha-btn" style={{ padding: ".45rem .7rem", fontSize: ".66rem", borderColor: "rgba(255,0,60,.5)", color: "#ff4d4d" }}
                    onClick={() => { setEtat(""); setType(""); setQualifType(""); setEpsInput(""); setEpsListe([]); setTraitement(""); setPage(0); }}>
                    <X size={12} /> RESET
                  </button>
                )}
                <button className="mecha-btn btn-success" style={{ padding: ".45rem .8rem", fontSize: ".68rem", marginLeft: "auto" }}
                  onClick={() => lancerExport("INTERVENTIONS")} disabled={exportEtat?.statut === "EN_COURS"}
                  title="Exporte toutes les lignes correspondant aux filtres, au format Excel. Lit la base synchronisee.">
                  <Download size={12} /> {exportEtat?.statut === "EN_COURS" && exportEtat?.onglet === "INTERVENTIONS" ? "EXPORT..." : "EXPORTER"}
                </button>
              </div>
            </div>

            {epsListe.length > 0 && (
              <BandeauIntrouvables demandes={epsListe.length} manquants={introuvables}
                voir={voirIntrouvables} setVoir={setVoirIntrouvables} flash={flash} />
            )}

            {stats && (
              <div style={{ display: "flex", gap: 9, marginTop: 13, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ padding: ".45rem .85rem", borderRadius: 4, fontFamily: "monospace", fontSize: ".72rem", background: "rgba(0,240,255,.1)", border: "1px solid rgba(0,240,255,.35)", color: "#00f0ff" }}>
                  {stats.totalEps} EPS · {stats.totalVersions} VERSIONS · {stats.traitees} TRAITES
                </div>
                {Object.entries(stats.parEtat || {}).map(([k, v]: any) => (
                  <div key={k} onClick={() => { setEtat(k); setPage(0); }}
                    style={{ cursor: "pointer", padding: ".45rem .85rem", borderRadius: 4, fontFamily: "monospace", fontSize: ".72rem",
                      background: `${ETAT_COLORS[k] || "#64748b"}18`, border: `1px solid ${ETAT_COLORS[k] || "#64748b"}55`, color: ETAT_COLORS[k] || "#94a3b8" }}>
                    {k} · <strong>{v.nb}</strong> · {fmtMontant(v.montant)}
                  </div>
                ))}
              </div>
            )}

            <div className="cyber-scroll" style={{ marginTop: 16, background: "rgba(6,11,25,.78)", border: "1px solid rgba(0,240,255,.25)", borderRadius: 8, overflow: "auto", maxHeight: "60vh" }}>
              {loading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#00f0ff", fontFamily: "monospace" }}>
                  <Activity size={30} style={{ animation: "spin 1.6s linear infinite" }} />
                  <div style={{ marginTop: 10 }}>CHARGEMENT...</div>
                  {patience && (
                    <div style={{ marginTop: 8, color: "#f59e0b", fontSize: ".78rem" }}>{patience}</div>
                  )}
                </div>
              ) : rows.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>
                  <Database size={30} /><div style={{ marginTop: 10 }}>AUCUNE DONNEE POUR {periode}</div>
                  <div style={{ fontSize: ".76rem", marginTop: 7 }}>Lancez une synchronisation.</div>
                </div>
              ) : (
                <table className="bt">
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}>
                        <input type="checkbox" onChange={toutSelectionner} style={{ accentColor: "#00f0ff", cursor: "pointer" }}
                          checked={selection.size > 0 && selection.size === rows.filter(r => r.etat === ETAT_ACTIONNABLE).length} />
                      </th>
                      <th>EPS</th><th>DATE VERSION</th><th>ETAT</th><th>QUALIF</th><th>TYPE</th><th>RACC</th>
                      <th>MONTANT</th><th>ACTEUR</th><th>VERSIONS</th><th style={{ width: 200 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const act = r.etat === ETAT_ACTIONNABLE;
                      const nbv = r.nbVersions ?? nbVersionsParEps[`${r.idIntervention}|${r.periode}`] ?? 1;
                      return (
                        <tr key={r.id}>
                          <td>{act && <input type="checkbox" checked={selection.has(cleSel(r))} onChange={() => toggleSel(cleSel(r))} style={{ accentColor: "#00f0ff", cursor: "pointer" }} />}</td>
                          <td><strong style={{ color: "#fff" }}>{r.idIntervention}</strong></td>
                          <td style={{ color: "#94a3b8", fontSize: ".7rem", whiteSpace: "nowrap" }}>{fmtDate(r.dateQualification)}</td>
                          <td>
                            <span style={{ padding: "3px 7px", borderRadius: 3, fontSize: ".64rem", fontWeight: "bold",
                              background: `${ETAT_COLORS[r.etat] || "#64748b"}22`, color: ETAT_COLORS[r.etat] || "#94a3b8",
                              border: `1px solid ${ETAT_COLORS[r.etat] || "#64748b"}50` }}>{r.etat}</span>
                          </td>
                          <td style={{ color: "#64748b", fontSize: ".7rem" }}>{(r.typeQualification || "").replace("Qualification", "")}</td>
                          <td style={{ color: "#d8b4fe" }}>{r.typeIntervention || "-"}</td>
                          <td style={{ color: "#86efac" }}>{r.typeRaccordement || "-"}</td>
                          <td style={{ color: "#f59e0b" }}>{fmtMontant(r.montant)}</td>
                          <td style={{ color: "#64748b", fontSize: ".69rem" }}>{r.etapeActeur || "-"}</td>
                          <td style={{ textAlign: "center" }}>
                            <span onClick={() => voirTimeline(r.idIntervention, r)} title="Voir la chronologie"
                              style={{ cursor: "pointer", color: nbv > 1 ? "#00f0ff" : "#475569", fontWeight: "bold" }}>
                              {nbv}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4 }}>
                              {act && (
                                <>
                                  <button className="mecha-btn btn-success" style={{ padding: ".28rem .5rem", fontSize: ".62rem" }} onClick={() => ouvrirAction(r, "VALIDATION")}>VALIDER</button>
                                  <button className="mecha-btn btn-warning" style={{ padding: ".28rem .5rem", fontSize: ".62rem" }} onClick={() => ouvrirAction(r, "CONTESTATION")}>CONTESTER</button>
                                </>
                              )}
                              <button className="mecha-btn btn-purple" style={{ padding: ".28rem .5rem", fontSize: ".62rem" }} onClick={() => voirTimeline(r.idIntervention, r)} title="Chronologie complete"><History size={11} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 13, flexWrap: "wrap", gap: 10 }}>
              <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".78rem" }}>
                {totalItems} EPS · page {page + 1}/{Math.max(totalPages, 1)}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CyberSelect width="105px" value={size} options={[25, 50, 100, 200].map(n => ({ value: n, label: `${n} / page` }))} onChange={(v: number) => { setSize(v); setPage(0); }} />
                <button className="mecha-btn btn-info" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>◀</button>
                <button className="mecha-btn btn-info" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>▶</button>
              </div>
            </div>
          </>
        )}

        {/* ======================== VERSIONS ======================== */}
        {onglet === "VERSIONS" && (
          <>
            <div style={{ display: "flex", gap: 11, marginTop: 18, alignItems: "center", flexWrap: "wrap", background: "rgba(10,15,30,.8)", padding: ".9rem", border: "1px solid rgba(168,85,247,.4)", borderRadius: 6 }}>
              <GitCommit size={17} color="#d8b4fe" />
              <CyberSelect width="95px" value={year} options={yearOptions} onChange={setYear} variant="green" />
              <CyberSelect width="95px" value={month} options={monthOptions} onChange={setMonth} variant="green" />
              {versEpsListe.length === 0 && (
                <input className="cyber-input" placeholder="EPS..." value={versEps}
                  onChange={e => { setVersEps(e.target.value); setVersPage(0); }}
                  onPaste={e => collerEps(e, "VERSIONS")}
                  style={{ width: 160 }}
                  title="Un EPS : recherche partielle. Collez plusieurs EPS : recherche multiple." />
              )}
              {versEpsListe.length > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, padding: ".4rem .7rem", borderRadius: 4,
                    background: "rgba(0,240,255,.15)", border: "1px solid rgba(0,240,255,.5)", color: "#00f0ff",
                    fontFamily: "monospace", fontSize: ".72rem", whiteSpace: "nowrap" }}>
                    <span onClick={() => ouvrirListe("VERSIONS")} style={{ cursor: "pointer" }} title="Modifier la liste">
                      LISTE · {versEpsListe.length} EPS
                    </span>
                    <X size={12} style={{ cursor: "pointer", color: "#ff4d4d" }}
                      onClick={() => { setVersEpsListe([]); setVersPage(0); }} />
                  </span>
                )}
              <button className="mecha-btn btn-info" style={{ padding: ".45rem .7rem", fontSize: ".66rem" }}
                onClick={() => ouvrirListe("VERSIONS")} title="Rechercher plusieurs EPS a la fois">
                <ListChecks size={12} /> MULTI-EPS
              </button>
              <CyberSelect width="235px" value={versEtat} options={etatOptions} onChange={(v: string) => { setVersEtat(v); setVersPage(0); }} variant="orange" />
              <CyberSelect width="155px" value={qualifTypeVersions} options={qualifOptions}
                onChange={(v: string) => { setQualifTypeVersions(v); setVersPage(0); }} variant="purple" />
              <label style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".73rem" }}>du</label>
              <input type="date" className="cyber-input" value={versDebut} onChange={e => { setVersDebut(e.target.value); setVersPage(0); }} />
              <label style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".73rem" }}>au</label>
              <input type="date" className="cyber-input" value={versFin} onChange={e => { setVersFin(e.target.value); setVersPage(0); }} />
              <button className="mecha-btn btn-purple" onClick={chargerVersions}><Search size={13} /> FILTRER</button>
              <button className={`mecha-btn ${versDetail ? "btn-warning" : "btn-info"}`}
                onClick={() => setVersDetail(v => !v)}
                title="Affiche le detail de facturation par designation">
                <Layers size={13} /> {versDetail ? "MASQUER LE DETAIL" : "DETAIL FACTURATION"}
              </button>
              <button className={`mecha-btn ${versParEps ? "btn-warning" : "btn-purple"}`}
                onClick={() => { setVersParEps(v => !v); setVersPage(0); }}
                title="Regroupe les versions par EPS, de la premiere a la plus recente">
                <GitCommit size={13} /> {versParEps ? "VUE PAR VERSION" : "HISTORIQUE PAR EPS"}
              </button>
              {versParEps && (
                <CyberSelect width="250px" value={versModeEtat} variant="orange"
                  options={[
                    { value: "COURANTE", label: "ETAT : VERSION COURANTE" },
                    { value: "PREMIERE", label: "ETAT : PREMIERE VERSION" },
                    { value: "TOUTE", label: "ETAT : UNE VERSION QUELCONQUE" },
                  ]}
                  onChange={(v: any) => { setVersModeEtat(v); setVersPage(0); }} />
              )}
              <button className="mecha-btn btn-success"
                onClick={() => lancerExport(versParEps ? "VERSIONS_EPS" : "VERSIONS")}
                disabled={exportEtat?.statut === "EN_COURS"}
                title={versParEps
                  ? "Exporte l'historique complet de chaque EPS selectionne, de la premiere a la derniere version"
                  : "Exporte toutes les versions correspondant aux filtres, avec le detail de facturation"}>
                <Download size={13} /> {exportEtat?.statut === "EN_COURS" && String(exportEtat?.onglet || "").startsWith("VERSIONS") ? "EXPORT..." : "EXPORTER"}
              </button>
            </div>

            {versEpsListe.length > 0 && (
              <BandeauIntrouvables demandes={versEpsListe.length} manquants={versIntrouvables}
                voir={voirIntrouvables} setVoir={setVoirIntrouvables} flash={flash} />
            )}

            <div style={{ marginTop: 11, color: "#64748b", fontFamily: "monospace", fontSize: ".73rem" }}>
              {versParEps
                ? (<>Chaque bloc est un EPS, avec toutes ses versions de la <strong style={{ color: "#d8b4fe" }}>plus ancienne a la plus recente</strong>.
                    Le filtre d&apos;etat porte sur {versModeEtat === "COURANTE" ? "la version courante" : versModeEtat === "PREMIERE" ? "la premiere version" : "n'importe quelle version"} ;
                    les autres versions de l&apos;EPS sont affichees quel que soit leur etat.</>)
                : "Chaque ligne est une version fournie par l'API, de la plus recente a la plus ancienne. La date affichee est celle de la qualification."}
            </div>

            <div className="cyber-scroll" style={{ marginTop: 11, background: "rgba(6,11,25,.78)", border: "1px solid rgba(168,85,247,.25)", borderRadius: 8, overflow: "auto", maxHeight: "62vh" }}>
              {versLoading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#d8b4fe", fontFamily: "monospace" }}>CHARGEMENT...</div>
              ) : versParEps ? (
                versGroupes.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>AUCUN EPS POUR CES CRITERES</div>
                ) : (
                  <table className="bt">
                    <thead>
                      <tr>
                        <th style={{ width: 62 }}>VER</th><th>DATE</th><th>ETAT</th><th>QUALIF</th><th>TYPE</th>
                        {!versDetail && <th>RACC</th>}
                        {versDetail && colonnesDetail.map(c => <th key={c} style={{ textAlign: "right" }}>{c}</th>)}
                        {versDetail && <th style={{ textAlign: "right" }}>TOTAL</th>}
                        {!versDetail && <th>MONTANT</th>}
                        <th>ETAPE</th><th>AVIS</th><th>ACTEUR</th>
                        {!versDetail && <th>COMMENTAIRE</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {versGroupes.map((g: any) => {
                        const vs: any[] = g.versions || [];
                        const n = vs.length;
                        return (
                          <React.Fragment key={`${g.idIntervention}|${g.periode}`}>
                            <tr>
                              <td colSpan={99} style={{ background: "rgba(168,85,247,.12)", borderTop: "1px solid rgba(168,85,247,.45)", padding: ".55rem .6rem" }}>
                                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                                  <strong style={{ color: "#fff", fontSize: ".82rem" }}>{g.idIntervention}</strong>
                                  <span style={{ color: "#64748b", fontSize: ".7rem" }}>{g.periode}</span>
                                  <span style={{ color: "#d8b4fe", fontSize: ".7rem" }}>{n} version{n > 1 ? "s" : ""}</span>
                                  <span style={{ fontSize: ".64rem", fontWeight: "bold", padding: "2px 7px", borderRadius: 3,
                                    background: `${ETAT_COLORS[g.etatCourant] || "#64748b"}22`, color: ETAT_COLORS[g.etatCourant] || "#94a3b8" }}>
                                    ACTUEL : {g.etatCourant}
                                  </span>
                                  <span style={{ color: "#64748b", fontSize: ".68rem" }}>{fmtDate(g.premiereDate)} → {fmtDate(g.derniereDate)}</span>
                                  <span onClick={() => voirTimeline(g.idIntervention, { periode: g.periode })}
                                    style={{ cursor: "pointer", color: "#00f0ff", fontSize: ".68rem", marginLeft: "auto" }}>
                                    CHRONOLOGIE
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {vs.map((v: any, i: number) => {
                              const prec = i > 0 ? vs[i - 1] : null;
                              const change = (a: any, b: any) => prec !== null && a !== b;
                              const el = elementsDe(v);
                              const tot = totalElements(el);
                              const courante = i === n - 1;
                              return (
                                <tr key={v.id} style={{ background: courante ? "rgba(0,255,65,.04)" : "transparent" }}>
                                  <td style={{ textAlign: "center", whiteSpace: "nowrap", fontWeight: "bold", fontSize: ".7rem",
                                    color: courante ? "#00ff41" : "#64748b" }}>{i + 1}/{n}</td>
                                  <td style={{ color: "#94a3b8", whiteSpace: "nowrap", fontSize: ".72rem" }}>{fmtDate(v.dateQualification)}</td>
                                  <td>
                                    <span style={{ padding: "3px 7px", borderRadius: 3, fontSize: ".62rem", fontWeight: "bold",
                                      background: `${ETAT_COLORS[v.etat] || "#64748b"}22`, color: ETAT_COLORS[v.etat] || "#94a3b8",
                                      outline: change(prec?.etat, v.etat) ? "1px solid #f59e0b" : "none" }}>{v.etat}</span>
                                  </td>
                                  <td style={{ color: "#64748b", fontSize: ".68rem" }}>{(v.typeQualification || "").replace("Qualification", "")}</td>
                                  <td style={{ color: change(prec?.typeIntervention, v.typeIntervention) ? "#f59e0b" : "#d8b4fe",
                                    fontWeight: change(prec?.typeIntervention, v.typeIntervention) ? "bold" : "normal" }}>{v.typeIntervention || "-"}</td>
                                  {!versDetail && (
                                    <td style={{ color: change(prec?.typeRaccordement, v.typeRaccordement) ? "#f59e0b" : "#86efac" }}>{v.typeRaccordement || "-"}</td>
                                  )}
                                  {versDetail && colonnesDetail.map(c => (
                                    <td key={c} style={{ textAlign: "right", whiteSpace: "nowrap", color: el[c] ? "#f59e0b" : "#475569" }}>
                                      {el[c] !== undefined ? fmtMontant(el[c]) : "-"}
                                    </td>
                                  ))}
                                  {versDetail && (
                                    <td style={{ textAlign: "right", whiteSpace: "nowrap", color: "#00f0ff", fontWeight: "bold" }}>{fmtMontant(tot)}</td>
                                  )}
                                  {!versDetail && (
                                    <td style={{ whiteSpace: "nowrap", color: "#f59e0b",
                                      fontWeight: change(prec?.montant, v.montant) ? "bold" : "normal",
                                      textDecoration: change(prec?.montant, v.montant) ? "underline" : "none" }}>{fmtMontant(v.montant)}</td>
                                  )}
                                  <td style={{ color: "#64748b", fontSize: ".66rem" }}>{(v.etapeType || "").replace("Etape", "")}</td>
                                  <td style={{ color: v.etapeAvis === "CONTESTATION" ? "#f59e0b" : v.etapeAvis === "ACCEPTATION" ? "#00ff41" : "#475569", fontSize: ".68rem" }}>{v.etapeAvis || "-"}</td>
                                  <td style={{ color: "#94a3b8", fontSize: ".68rem" }}>{v.etapeActeur || "-"}</td>
                                  {!versDetail && <td style={{ maxWidth: 260, color: "#cbd5e1", fontSize: ".69rem" }}>{v.etapeCommentaire || "-"}</td>}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : vers.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>AUCUNE VERSION</div>
              ) : (
                <table className="bt">
                  <thead>
                    <tr>
                      <th>DATE</th><th>EPS</th><th>RANG</th><th>ETAT</th><th>QUALIF</th><th>TYPE</th>
                      {!versDetail && <th>RACC</th>}
                      <th>PERIODE</th>
                      {versDetail && colonnesDetail.map(c => <th key={c} style={{ textAlign: "right" }}>{c}</th>)}
                      {versDetail && <th style={{ textAlign: "right" }}>TOTAL</th>}
                      {!versDetail && <th>MONTANT</th>}
                      {!versDetail && <th>ETAPE</th>}
                      <th>AVIS</th><th>ACTEUR</th>
                      {!versDetail && <th>COMMENTAIRE</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {vers.map(v => {
                      const el = elementsDe(v);
                      const tot = totalElements(el);
                      return (
                      <tr key={v.id}>
                        <td style={{ color: "#94a3b8", whiteSpace: "nowrap", fontSize: ".72rem" }}>{fmtDate(v.dateQualification)}</td>
                        <td><strong style={{ color: "#fff" }}>{v.idIntervention}</strong></td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ color: v.ordreApi === 0 ? "#00ff41" : "#64748b", fontWeight: "bold", fontSize: ".7rem" }}>
                            {v.ordreApi === 0 ? "COURANTE" : `-${v.ordreApi}`}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: "3px 7px", borderRadius: 3, fontSize: ".62rem", fontWeight: "bold",
                            background: `${ETAT_COLORS[v.etat] || "#64748b"}22`, color: ETAT_COLORS[v.etat] || "#94a3b8" }}>{v.etat}</span>
                        </td>
                        <td style={{ color: "#64748b", fontSize: ".68rem" }}>{(v.typeQualification || "").replace("Qualification", "")}</td>
                        <td style={{ color: "#d8b4fe" }}>{v.typeIntervention || "-"}</td>
                        {!versDetail && <td style={{ color: "#86efac" }}>{v.typeRaccordement || "-"}</td>}
                        <td style={{ color: "#64748b", fontSize: ".68rem" }}>{v.periode || periode}</td>

                        {versDetail && colonnesDetail.map(c => (
                          <td key={c} style={{ textAlign: "right", whiteSpace: "nowrap",
                            color: el[c] ? "#f59e0b" : "#475569" }}>
                            {el[c] !== undefined ? fmtMontant(el[c]) : "-"}
                          </td>
                        ))}
                        {versDetail && (
                          <td style={{ textAlign: "right", whiteSpace: "nowrap", color: "#00f0ff", fontWeight: "bold" }}>
                            {fmtMontant(tot)}
                          </td>
                        )}

                        {!versDetail && <td style={{ color: "#f59e0b" }}>{fmtMontant(v.montant)}</td>}
                        {!versDetail && <td style={{ color: "#64748b", fontSize: ".66rem" }}>{(v.etapeType || "").replace("Etape", "")}</td>}
                        <td style={{ color: v.etapeAvis === "CONTESTATION" ? "#f59e0b" : v.etapeAvis === "ACCEPTATION" ? "#00ff41" : "#475569", fontSize: ".68rem" }}>{v.etapeAvis || "-"}</td>
                        <td style={{ color: "#94a3b8", fontSize: ".68rem" }}>{v.etapeActeur || "-"}</td>
                        {!versDetail && <td style={{ maxWidth: 260, color: "#cbd5e1", fontSize: ".69rem" }}>{v.etapeCommentaire || "-"}</td>}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 13 }}>
              <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".78rem" }}>
                {versTotal} {versParEps ? "EPS" : "versions"} · page {versPage + 1}/{Math.max(versTotalPages, 1)}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="mecha-btn btn-purple" disabled={versPage === 0} onClick={() => setVersPage(p => Math.max(0, p - 1))}>◀</button>
                <button className="mecha-btn btn-purple" disabled={versPage + 1 >= versTotalPages} onClick={() => setVersPage(p => p + 1)}>▶</button>
              </div>
            </div>
          </>
        )}

        {/* ======================== DECISIONS KYNTUS ======================== */}
        {onglet === "DECISIONS" && (
          <>
            <div style={{ display: "flex", gap: 11, marginTop: 18, alignItems: "center", flexWrap: "wrap", background: "rgba(10,15,30,.8)", padding: ".9rem", border: "1px solid rgba(0,255,65,.4)", borderRadius: 6 }}>
              <Clock size={17} color="#86efac" />
              <CyberSelect width="95px" value={year} options={yearOptions} onChange={setYear} variant="green" />
              <CyberSelect width="95px" value={month} options={monthOptions} onChange={setMonth} variant="green" />
              <CyberSelect width="185px" value={histoType} variant="green"
                options={[{ value: "", label: "[ TOUT ]" }, { value: "VALIDATION", label: "VALIDATION" }, { value: "CONTESTATION", label: "CONTESTATION" }]}
                onChange={(v: string) => { setHistoType(v); setHistoPage(0); }} />
              <input className="cyber-input" placeholder="EPS..." value={histoEps} onChange={e => { setHistoEps(e.target.value); setHistoPage(0); }} style={{ width: 160 }} />
              <button className="mecha-btn btn-success" onClick={chargerDecisions}><Search size={13} /> FILTRER</button>
            </div>

            <div className="cyber-scroll" style={{ marginTop: 16, background: "rgba(6,11,25,.78)", border: "1px solid rgba(0,255,65,.2)", borderRadius: 8, overflow: "auto", maxHeight: "62vh" }}>
              {histoLoading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#86efac", fontFamily: "monospace" }}>CHARGEMENT...</div>
              ) : histo.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b", fontFamily: "monospace" }}>
                  AUCUNE DECISION ENREGISTREE
                  <div style={{ fontSize: ".74rem", marginTop: 8 }}>Validez ou contestez une intervention pour alimenter cet onglet.</div>
                </div>
              ) : (
                <table className="bt">
                  <thead><tr><th>DATE</th><th>EPS</th><th>UUID</th><th>VER</th><th>TYPE</th><th>ETAT AVANT</th><th>ETAT APRES</th><th>PARAMETRAGE</th><th>MONTANT</th><th>COMMENTAIRE</th><th>AUTEUR</th><th>ENVOI</th></tr></thead>
                  <tbody>
                    {histo.map(a => (
                      <tr key={a.id}>
                        <td style={{ color: "#94a3b8", whiteSpace: "nowrap", fontSize: ".72rem" }}>{fmtDate(a.actionAt)}</td>
                        <td><strong style={{ color: "#fff" }}>{a.idIntervention}</strong></td>
                        <td style={{ color: "#64748b", fontSize: ".66rem" }} title={a.qualificationId}>{String(a.qualificationId || "").slice(0, 8)}</td>
                        <td style={{ textAlign: "center", color: "#00f0ff" }}>v{a.versionNo}</td>
                        <td>
                          <span style={{ padding: "3px 7px", borderRadius: 3, fontSize: ".62rem", fontWeight: "bold",
                            background: a.actionType === "CONTESTATION" ? "rgba(245,158,11,.2)" : "rgba(0,255,65,.2)",
                            color: a.actionType === "CONTESTATION" ? "#f59e0b" : "#00ff41" }}>{a.actionType}</span>
                        </td>
                        <td style={{ color: "#64748b", fontSize: ".68rem" }}>{a.etatAvant || "-"}</td>
                        <td style={{ color: ETAT_COLORS[a.etatApres] || "#94a3b8", fontSize: ".68rem" }}>{a.etatApres || "-"}</td>
                        <td style={{ fontSize: ".68rem" }}>
                          {a.typeInterventionAvant !== a.typeInterventionApres
                            ? <span style={{ color: "#f59e0b" }}>{a.typeInterventionAvant} → <strong>{a.typeInterventionApres}</strong></span>
                            : <span style={{ color: "#475569" }}>{a.typeInterventionApres || "-"}</span>}
                        </td>
                        <td style={{ color: "#f59e0b" }}>{fmtMontant(a.montant)}</td>
                        <td style={{ maxWidth: 250, color: "#cbd5e1", fontSize: ".69rem" }}>{a.commentaire || "-"}</td>
                        <td style={{ color: "#94a3b8", fontSize: ".69rem" }}>{a.auteur}</td>
                        <td>
                          <span style={{ fontSize: ".6rem", padding: "2px 6px", borderRadius: 3,
                            background: a.statutEnvoi === "ENVOYE" ? "rgba(0,255,65,.2)" : a.statutEnvoi === "ERREUR" ? "rgba(255,0,60,.2)" : "rgba(100,116,139,.2)",
                            color: a.statutEnvoi === "ENVOYE" ? "#00ff41" : a.statutEnvoi === "ERREUR" ? "#ff4d4d" : "#94a3b8" }}>
                            {a.statutEnvoi}{a.httpStatus ? ` ${a.httpStatus}` : ""}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 13 }}>
              <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".78rem" }}>
                {histoTotal} decisions · page {histoPage + 1}/{Math.max(histoTotalPages, 1)}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="mecha-btn btn-success" disabled={histoPage === 0} onClick={() => setHistoPage(p => Math.max(0, p - 1))}>◀</button>
                <button className="mecha-btn btn-success" disabled={histoPage + 1 >= histoTotalPages} onClick={() => setHistoPage(p => p + 1)}>▶</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ======================== MODALE ACTION ======================== */}
      {cible && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.82)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(10px)" }}>
          <div className="cyber-scroll" style={{ background: "rgba(6,11,25,.97)", border: `1px solid ${actionType === "VALIDATION" ? "#00ff41" : "#f59e0b"}`, borderRadius: 14, width: 720, maxWidth: "95%", padding: "1.8rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${actionType === "VALIDATION" ? "rgba(0,255,65,.3)" : "rgba(245,158,11,.3)"}` }}>
              <h2 style={{ margin: 0, color: "#fff", fontFamily: "monospace", fontSize: "1.1rem", letterSpacing: 2 }}>
                {actionType} · {cible.idIntervention}
              </h2>
              <button onClick={() => setCible(null)} className="mecha-btn" style={{ padding: 5, borderColor: "rgba(255,0,60,.5)", color: "#ff4d4d" }}><X size={17} /></button>
            </div>

            <div style={{ background: "rgba(2,6,23,.85)", padding: ".9rem", borderRadius: 6, marginBottom: 15, fontFamily: "monospace", fontSize: ".76rem", color: "#94a3b8", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              <div>VERSION : <span style={{ color: "#fff" }}>{String(cible.qualificationId).slice(0, 13)}…</span></div>
              <div>DATE : <span style={{ color: "#fff" }}>{fmtDate(cible.dateQualification)}</span></div>
              <div>ETAT : <span style={{ color: ETAT_COLORS[cible.etat] }}>{cible.etat}</span></div>
              <div>MONTANT : <span style={{ color: "#f59e0b" }}>{fmtMontant(cible.montant)}</span></div>
            </div>

            {actionType === "CONTESTATION" && (
              <div style={{ marginBottom: 15 }}>
                <p style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: ".76rem", marginBottom: 9, letterSpacing: 1 }}>
                  [ PARAMETRAGE PROPOSE ] — inchange si vous ne touchez a rien
                </p>
                <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
                  <div>
                    <label style={{ color: "#64748b", fontSize: ".65rem", fontFamily: "monospace", display: "block", marginBottom: 4 }}>
                      TYPE INTERVENTION (actuel : {cible.typeIntervention})
                    </label>
                    <CyberSelect width="230px" value={nouveauType} options={typesPourCible} onChange={setNouveauType} variant="orange" />
                  </div>
                  {cible.typeQualification === "QualificationRaccordement" && (
                    <div>
                      <label style={{ color: "#64748b", fontSize: ".65rem", fontFamily: "monospace", display: "block", marginBottom: 4 }}>
                        TYPE RACCORDEMENT (actuel : {cible.typeRaccordement || "-"})
                      </label>
                      <CyberSelect width="195px" value={nouveauRacc} options={TYPES_RACCORDEMENT.map(v => ({ value: v, label: v }))} onChange={setNouveauRacc} variant="orange" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 15 }}>
              <p style={{ color: "#00f0ff", fontFamily: "monospace", fontSize: ".76rem", marginBottom: 7, letterSpacing: 1 }}>
                [ COMMENTAIRE ] {actionType === "CONTESTATION" && <span style={{ color: "#ff4d4d" }}>* obligatoire</span>}
              </p>
              <textarea className="cyber-textarea" rows={4} value={commentaire} onChange={e => setCommentaire(e.target.value)}
                placeholder={actionType === "VALIDATION" ? "RAS" : "Motif precis de la contestation..."} />
            </div>

            <button className="mecha-btn btn-info" style={{ marginBottom: 12, fontSize: ".72rem" }} onClick={chargerApercu}>
              <Eye size={14} /> {showApercu ? "RAFRAICHIR L'APERCU" : "VOIR LE CORPS ENVOYE"}
            </button>

            {showApercu && apercu && (
              <div className="cyber-scroll" style={{ marginBottom: 15, background: "rgba(2,6,23,.95)", padding: ".9rem", borderRadius: 6, border: "1px solid rgba(0,240,255,.3)", maxHeight: 230, overflowY: "auto" }}>
                <div style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".66rem", marginBottom: 7, wordBreak: "break-all" }}>
                  {actionType === "VALIDATION" ? apercu.urlValidation : apercu.urlContestation}
                </div>
                <pre style={{ margin: 0, color: "#86efac", fontSize: ".68rem", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(apercu.payload, null, 2)}
                </pre>
              </div>
            )}

            <button className={`mecha-btn ${actionType === "VALIDATION" ? "btn-success" : "btn-warning"}`}
              style={{ width: "100%", justifyContent: "center", padding: ".9rem", fontSize: ".95rem", letterSpacing: 3 }}
              disabled={envoiEnCours || (actionType === "CONTESTATION" && !commentaire.trim())} onClick={envoyerAction}>
              <Send size={17} /> {envoiEnCours ? "TRAITEMENT..." : `CONFIRMER LA ${actionType}`}
            </button>
            <p style={{ color: "#475569", fontFamily: "monospace", fontSize: ".65rem", textAlign: "center", marginTop: 10 }}>
              Auteur : {auteur} · periode {periode}
              {config && !config.envoiActive && " · enregistrement local seulement"}
            </p>
          </div>
        </div>
      )}

      {/* ======================== MODALE LOT ======================== */}
      {lotOuvert && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.82)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(10px)" }}>
          <div className="cyber-scroll" style={{ background: "rgba(6,11,25,.97)", border: "1px solid #a855f7", borderRadius: 14, width: 700, maxWidth: "95%", padding: "1.8rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(168,85,247,.3)" }}>
              <h2 style={{ margin: 0, color: "#fff", fontFamily: "monospace", fontSize: "1.1rem", letterSpacing: 2, display: "flex", gap: 9, alignItems: "center" }}>
                <Layers color="#d8b4fe" size={20} /> LOT · {selection.size} EPS
              </h2>
              <button onClick={() => setLotOuvert(false)} className="mecha-btn" style={{ padding: 5, borderColor: "rgba(255,0,60,.5)", color: "#ff4d4d" }}><X size={17} /></button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <CyberSelect width="220px" value={lotType} variant="purple"
                options={[{ value: "VALIDATION", label: "VALIDER TOUT" }, { value: "CONTESTATION", label: "CONTESTER TOUT" }]}
                onChange={setLotType} />
            </div>

            <div style={{ padding: ".85rem", background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.4)", borderRadius: 6, marginBottom: 14, color: "#fcd34d", fontFamily: "monospace", fontSize: ".74rem", lineHeight: 1.6 }}>
              Le meme commentaire est applique a toutes les lignes et le parametrage reste inchange.
              Pour modifier un parametrage, traitez l&apos;EPS individuellement.
            </div>

            <textarea className="cyber-textarea" rows={3} value={lotCommentaire} onChange={e => setLotCommentaire(e.target.value)}
              placeholder={lotType === "VALIDATION" ? "RAS" : "Motif commun..."} style={{ marginBottom: 14 }} />

            {lotResultat && (
              <div style={{ marginBottom: 14, padding: ".9rem", background: "rgba(2,6,23,.9)", borderRadius: 6, fontFamily: "monospace", fontSize: ".75rem" }}>
                <div style={{ color: "#00ff41", marginBottom: 7 }}>Succes : {lotResultat.succes} · Echecs : {lotResultat.echecs}</div>
                <div className="cyber-scroll" style={{ maxHeight: 150, overflowY: "auto" }}>
                  {(lotResultat.details || []).filter((d: any) => !d.ok).map((d: any, i: number) => (
                    <div key={i} style={{ color: "#ff8080", fontSize: ".7rem", marginBottom: 3 }}>
                      {String(d.qualificationId).slice(0, 8)} : {d.message || d.erreur}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="mecha-btn btn-purple" style={{ width: "100%", justifyContent: "center", padding: ".9rem", fontSize: ".95rem", letterSpacing: 3 }}
              disabled={lotEnCours || (lotType === "CONTESTATION" && !lotCommentaire.trim())} onClick={executerLot}>
              <ListChecks size={17} /> {lotEnCours ? "TRAITEMENT..." : `EXECUTER SUR ${selection.size}`}
            </button>
          </div>
        </div>
      )}

      {/* ======================== MODALE TEAM EXPORT ======================== */}
      {equipeOuvert && (() => {
        const detectes = parserListe(equipeTexte);
        const enCours = exportEtat?.statut === "EN_COURS" && exportEtat?.onglet === "EQUIPE";
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.82)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(10px)" }}>
            <div className="cyber-scroll" style={{ background: "rgba(6,11,25,.97)", border: "1px solid #00ff41", borderRadius: 14, width: 660, maxWidth: "95%", padding: "1.6rem", maxHeight: "92vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 11, borderBottom: "1px solid rgba(0,255,65,.3)" }}>
                <h2 style={{ margin: 0, color: "#fff", fontFamily: "monospace", fontSize: "1.05rem", letterSpacing: 2, display: "flex", gap: 9, alignItems: "center" }}>
                  <Users color="#00ff41" size={19} /> TEAM EXPORT
                </h2>
                <button onClick={() => setEquipeOuvert(false)} disabled={enCours} className="mecha-btn"
                  style={{ padding: 5, borderColor: "rgba(255,0,60,.5)", color: "#ff4d4d" }}><X size={17} /></button>
              </div>

              <p style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: ".75rem", lineHeight: 1.6, margin: "0 0 12px" }}>
                Le fichier contient une ligne par EPS : son identifiant, puis ses commentaires
                d&apos;equipe dans l&apos;ordre chronologique, et le sens de la derniere decision.
                Les EPS sans commentaire ressortent avec une ligne vide.
              </p>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <span style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".72rem" }}>PERIODE</span>
                <CyberSelect width="120px" value={equipeAnnee} options={yearOptions} onChange={setEquipeAnnee} variant="green" />
                <CyberSelect width="110px" value={equipeMois} options={monthOptions} onChange={setEquipeMois} variant="green" />
                <span style={{ color: "#475569", fontFamily: "monospace", fontSize: ".68rem" }}>
                  TOUTES / TOUS = toutes les periodes synchronisees
                </span>
              </div>

              <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, cursor: "pointer",
                color: "#cbd5e1", fontFamily: "monospace", fontSize: ".74rem" }}>
                <input type="checkbox" checked={equipeDecisionsSeules}
                  onChange={e => setEquipeDecisionsSeules(e.target.checked)}
                  style={{ accentColor: "#00ff41", cursor: "pointer" }} />
                Seulement les commentaires commencant par &laquo; valide &raquo; ou &laquo; contest &raquo;
              </label>
              <p style={{ color: "#64748b", fontFamily: "monospace", fontSize: ".69rem", margin: "0 0 14px", lineHeight: 1.5 }}>
                Decoche, le fichier reprend tous les commentaires de l&apos;equipe, y compris
                &laquo; RAS &raquo; ou les explications detaillees. Coche, il applique la regle
                de la section import, qui ne retient que les decisions.
              </p>

              <textarea className="cyber-textarea" rows={10} value={equipeTexte}
                onChange={e => setEquipeTexte(e.target.value)} disabled={enCours}
                placeholder={"Collez vos EPS, un par ligne\n\nEPS-0016243542\nEPS-0016677821\nEPS-M002973905"} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontSize: ".76rem", color: "#00ff41" }}>
                  {detectes.length} EPS distincts detectes
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="mecha-btn" disabled={enCours}
                    style={{ borderColor: "rgba(255,0,60,.5)", color: "#ff4d4d" }}
                    onClick={() => setEquipeTexte("")}>VIDER</button>
                  <button className="mecha-btn btn-success" onClick={lancerExportEquipe}
                    disabled={enCours || detectes.length === 0}>
                    <Download size={14} /> {enCours ? "EXPORT EN COURS..." : `EXPORTER ${detectes.length} EPS`}
                  </button>
                </div>
              </div>

              {!periodeExacte && equipeAnnee === "TOUS" && equipeMois === "TOUS" && (
                <p style={{ color: "#f59e0b", fontFamily: "monospace", fontSize: ".7rem", marginTop: 12, lineHeight: 1.5 }}>
                  L&apos;export lit la base : seules les periodes deja synchronisees y figurent.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ======================== MODALE MULTI-EPS ======================== */}
      {listeModal && (() => {
        const detectes = parserListe(listeTexte);
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.82)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(10px)" }}>
            <div style={{ background: "rgba(6,11,25,.97)", border: "1px solid #00f0ff", borderRadius: 14, width: 620, maxWidth: "95%", padding: "1.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 11, borderBottom: "1px solid rgba(0,240,255,.3)" }}>
                <h2 style={{ margin: 0, color: "#fff", fontFamily: "monospace", fontSize: "1.05rem", letterSpacing: 2, display: "flex", gap: 9, alignItems: "center" }}>
                  <ListChecks color="#00f0ff" size={19} /> RECHERCHE MULTI-EPS · {listeModal === "LISTE" ? "INTERVENTIONS" : "VERSIONS"}
                </h2>
                <button onClick={() => setListeModal(null)} className="mecha-btn" style={{ padding: 5, borderColor: "rgba(255,0,60,.5)", color: "#ff4d4d" }}><X size={17} /></button>
              </div>
              <p style={{ color: "#94a3b8", fontFamily: "monospace", fontSize: ".75rem", lineHeight: 1.6, margin: "0 0 10px" }}>
                Collez vos EPS : un par ligne, ou separes par des virgules, espaces ou points-virgules.
                Une colonne copiee depuis Excel fonctionne directement. Les doublons sont retires.
              </p>
              <textarea className="cyber-textarea" rows={12} value={listeTexte} onChange={e => setListeTexte(e.target.value)}
                placeholder={"EPS-0016243542\nEPS-0016677821\nEPS-M002973905"} autoFocus />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontSize: ".76rem", color: detectes.length > 10000 ? "#f59e0b" : "#00f0ff" }}>
                  {detectes.length} EPS distincts detectes
                  {detectes.length > 10000 && " · seuls les 10 000 premiers seront recherches"}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="mecha-btn" style={{ borderColor: "rgba(255,0,60,.5)", color: "#ff4d4d" }} onClick={() => setListeTexte("")}>VIDER</button>
                  <button className="mecha-btn btn-info" onClick={appliquerListe}>
                    <Search size={14} /> {detectes.length ? `RECHERCHER ${detectes.length} EPS` : "RETIRER LA LISTE"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================== MODALE CHRONOLOGIE ======================== */}
      {timelineEps && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.82)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(10px)" }}>
          <div style={{ background: "rgba(6,11,25,.97)", border: "1px solid #a855f7", borderRadius: 14, width: 860, maxWidth: "95%", maxHeight: "86vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "1.3rem", borderBottom: "1px solid rgba(168,85,247,.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, color: "#fff", fontFamily: "monospace", fontSize: "1rem", letterSpacing: 1, display: "flex", gap: 9, alignItems: "center" }}>
                <History color="#d8b4fe" size={19} /> CHRONOLOGIE · {timelineEps} · {timelinePeriode || periode}
              </h2>
              <button onClick={() => { setTimelineEps(null); setTimeline([]); }} className="mecha-btn" style={{ padding: 5, borderColor: "rgba(255,0,60,.5)", color: "#ff4d4d" }}><X size={17} /></button>
            </div>
            <div className="cyber-scroll" style={{ padding: "1.8rem", overflowY: "auto", flex: 1 }}>
              {loadingTimeline ? (
                <div style={{ textAlign: "center", color: "#d8b4fe", fontFamily: "monospace" }}>CHARGEMENT...</div>
              ) : timeline.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748b", fontFamily: "monospace", padding: "2rem" }}>AUCUNE VERSION</div>
              ) : (
                <div style={{ position: "relative", paddingLeft: 36 }}>
                  <div style={{ position: "absolute", left: 6, top: 10, bottom: 10, width: 2, background: "linear-gradient(to bottom,#475569,#00ff41)" }} />
                  {timeline.map((e, i) => {
                    const kyntus = e.source === "KYNTUS";
                    const prec = i > 0 ? timeline[i - 1] : null;
                    const diffs: string[] = [];
                    if (prec && !kyntus) {
                      if (prec.etat !== e.etat) diffs.push(`Etat : ${prec.etat || "-"} → ${e.etat || "-"}`);
                      if (prec.typeIntervention !== e.typeIntervention) diffs.push(`Type : ${prec.typeIntervention || "-"} → ${e.typeIntervention || "-"}`);
                      if (prec.typeRaccordement !== e.typeRaccordement) diffs.push(`Raccordement : ${prec.typeRaccordement || "-"} → ${e.typeRaccordement || "-"}`);
                      if (prec.montant !== e.montant) diffs.push(`Montant : ${fmtMontant(prec.montant)} → ${fmtMontant(e.montant)}`);
                      if (prec.avis !== e.avis) diffs.push(`Avis : ${prec.avis || "-"} → ${e.avis || "-"}`);
                      if (prec.acteur !== e.acteur) diffs.push(`Acteur : ${prec.acteur || "-"} → ${e.acteur || "-"}`);
                      if (prec.etape !== e.etape) diffs.push(`Etape : ${prec.etape || "-"} → ${e.etape || "-"}`);
                    }
                    return (
                      <div key={`${e.source}-${e.qualificationId}-${i}`} style={{ marginBottom: "1.5rem", position: "relative", padding: "1.1rem",
                        background: kyntus ? "rgba(168,85,247,.08)" : "rgba(10,15,30,.7)",
                        border: `1px solid ${kyntus ? "rgba(168,85,247,.45)" : "rgba(148,163,184,.2)"}`, borderRadius: 8 }}>
                        <div style={{ position: "absolute", left: -36, top: 20, width: 13, height: 13, borderRadius: "50%",
                          background: e.courante ? "#00ff41" : kyntus ? "#a855f7" : "#475569", border: "3px solid #020617" }} />
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 9, flexWrap: "wrap" }}>
                          <span style={{ background: kyntus ? "rgba(168,85,247,.2)" : "rgba(0,240,255,.15)", color: kyntus ? "#d8b4fe" : "#00f0ff",
                            padding: "3px 9px", borderRadius: 3, fontSize: ".72rem", fontWeight: 900, fontFamily: "monospace" }}>
                            {kyntus ? "KYNTUS" : `v${e.version}`}
                          </span>
                          {e.courante && <span style={{ background: "rgba(0,255,65,.2)", color: "#00ff41", padding: "3px 8px", borderRadius: 3, fontSize: ".65rem", fontWeight: "bold", fontFamily: "monospace" }}>COURANTE</span>}
                          {kyntus && <span style={{ background: e.actionType === "CONTESTATION" ? "rgba(245,158,11,.2)" : "rgba(0,255,65,.2)", color: e.actionType === "CONTESTATION" ? "#f59e0b" : "#00ff41", padding: "3px 8px", borderRadius: 3, fontSize: ".65rem", fontWeight: "bold", fontFamily: "monospace" }}>{e.actionType}</span>}
                          <span style={{ color: "#94a3b8", fontSize: ".73rem", fontFamily: "monospace" }}>{fmtDate(e.date)}</span>
                          <span style={{ color: "#475569", fontSize: ".66rem", fontFamily: "monospace" }} title={e.qualificationId}>{String(e.qualificationId || "").slice(0, 8)}</span>
                        </div>

                        <div style={{ fontFamily: "monospace", fontSize: ".76rem", color: "#cbd5e1", display: "flex", gap: 14, flexWrap: "wrap", marginBottom: diffs.length || e.commentaire ? 9 : 0 }}>
                          <span>ETAT <span style={{ color: ETAT_COLORS[e.etat] || "#fff", fontWeight: "bold" }}>{e.etat}</span></span>
                          <span>TYPE <span style={{ color: "#d8b4fe" }}>{e.typeIntervention || "-"}</span></span>
                          {e.typeRaccordement && <span>RACC <span style={{ color: "#86efac" }}>{e.typeRaccordement}</span></span>}
                          <span>MONTANT <span style={{ color: "#f59e0b" }}>{fmtMontant(e.montant)}</span></span>
                          {e.avis && <span>AVIS <span style={{ color: e.avis === "CONTESTATION" ? "#f59e0b" : "#00ff41" }}>{e.avis}</span></span>}
                          {e.acteur && <span>ACTEUR <span style={{ color: "#94a3b8" }}>{e.acteur}</span></span>}
                        </div>

                        {(() => {
                          const el = elementsDe(e);
                          const cles = Object.keys(el);
                          if (!cles.length) return null;
                          const tot = totalElements(el);
                          return (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 9 }}>
                              {cles.map(c => (
                                <span key={c} style={{ fontFamily: "monospace", fontSize: ".66rem",
                                  padding: "2px 7px", borderRadius: 3,
                                  background: el[c] ? "rgba(245,158,11,.12)" : "rgba(148,163,184,.08)",
                                  border: `1px solid ${el[c] ? "rgba(245,158,11,.35)" : "rgba(148,163,184,.2)"}`,
                                  color: el[c] ? "#fcd34d" : "#64748b" }}>
                                  {c} {fmtMontant(el[c])}
                                </span>
                              ))}
                              <span style={{ fontFamily: "monospace", fontSize: ".66rem", padding: "2px 7px",
                                borderRadius: 3, background: "rgba(0,240,255,.15)",
                                border: "1px solid rgba(0,240,255,.4)", color: "#00f0ff", fontWeight: "bold" }}>
                                TOTAL {fmtMontant(tot)}
                              </span>
                            </div>
                          );
                        })()}

                        {diffs.length > 0 && (
                          <div style={{ background: "rgba(2,6,23,.95)", padding: 10, borderRadius: 5, borderLeft: "3px solid #f59e0b", color: "#fcd34d", fontSize: ".72rem", fontFamily: "monospace", lineHeight: 1.6, marginBottom: e.commentaire ? 8 : 0 }}>
                            {diffs.map((d, k) => <div key={k}>{d}</div>)}
                          </div>
                        )}

                        {e.commentaire && (
                          <div style={{ background: "rgba(2,6,23,.95)", padding: 10, borderRadius: 5, borderLeft: "3px solid #a855f7", color: "#e2e8f0", fontSize: ".78rem", fontFamily: "monospace" }}>
                            <span style={{ color: "#64748b", fontSize: ".66rem", display: "block", marginBottom: 4 }}>COMMENTAIRE</span>
                            {e.commentaire}
                          </div>
                        )}

                        {kyntus && e.statutEnvoi && (
                          <div style={{ marginTop: 7, fontSize: ".64rem", fontFamily: "monospace", color: "#475569" }}>
                            ENVOI : {e.statutEnvoi}{e.httpStatus ? ` · HTTP ${e.httpStatus}` : ""}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
