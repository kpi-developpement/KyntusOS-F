"use client";

import React, { useState } from "react";
import { Activity, AlertTriangle, DownloadCloud, MessageSquare, ShieldCheck, Copy } from "lucide-react";

interface BandeauProps {
  couleur: string;
  clair: string;
  icone: React.ReactNode;
  titre: string;
  texte: React.ReactNode;
  eps: string[];
  exportEnCours: boolean;
  onExport: () => void;
  onEps: (eps: string) => void;
  onCopier: () => void;
}

function Bandeau({ couleur, clair, icone, titre, texte, eps, exportEnCours, onExport, onEps, onCopier }: BandeauProps) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div onClick={() => setOuvert(o => !o)} className="nx-panel" style={{
      marginBottom: "1rem", cursor: "pointer", backgroundColor: "rgba(15,23,42,.9)", backdropFilter: "blur(12px)",
      border: `1px solid ${couleur}4d`, borderLeft: `5px solid ${couleur}`, padding: "1rem 1.25rem", borderRadius: 14,
      boxShadow: `0 8px 24px -4px ${couleur}26`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ backgroundColor: `${couleur}1a`, padding: 8, borderRadius: 10, border: `1px solid ${couleur}33`, color: couleur, display: "flex" }}>
            {icone}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: ".95rem", fontWeight: 800, color: clair }}>{titre}</h3>
            <p style={{ margin: "2px 0 0", fontSize: ".82rem", fontWeight: 500, color: couleur }}>{texte}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={e => e.stopPropagation()}>
          <button onClick={onCopier} className="nx-btn sm" title="Copier la liste des EPS"
            style={{ borderColor: `${couleur}66`, color: clair, backgroundColor: `${couleur}14` }}>
            <Copy size={14} /> Copier
          </button>
          <button onClick={onExport} disabled={exportEnCours} className="nx-btn sm"
            style={{ borderColor: `${couleur}66`, color: clair, backgroundColor: `${couleur}1a` }}>
            <DownloadCloud size={14} /> {exportEnCours ? "Extraction..." : "Export Logs"}
          </button>
          <span onClick={() => setOuvert(o => !o)} style={{ fontSize: ".74rem", color: couleur, backgroundColor: `${couleur}1a`,
            border: `1px solid ${couleur}4d`, padding: ".42rem .8rem", fontWeight: 700, borderRadius: 8, cursor: "pointer" }}>
            {ouvert ? "Masquer" : "Voir les EPS"}
          </span>
        </div>
      </div>
      {ouvert && (
        <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, borderTop: `1px solid ${couleur}33`, backgroundColor: "rgba(0,0,0,.2)", padding: 12, borderRadius: 10 }}>
          <div className="nx-scroll" style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 150, overflowY: "auto" }}>
            {eps.map(e => (
              <span key={e} onClick={() => onEps(e)} title="Ouvrir la chronologie de cet EPS" style={{
                backgroundColor: `${couleur}1a`, border: `1px solid ${couleur}4d`, padding: "4px 10px", borderRadius: 6,
                fontSize: ".76rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: clair, cursor: "pointer",
              }}>{e}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  scan: boolean;
  attente: string[];
  commentaires: string[];
  base: boolean;
  aDesDonnees: boolean;
  exportEnCours: string | null;
  onExportAttente: () => void;
  onExportCommentaires: () => void;
  onEps: (eps: string) => void;
  flash: (m: string) => void;
}

/** Alertes de la periode : equivalent direct des alertes statut / commentaires de Terrain Records. */
export default function AlertBanners({ scan, attente, commentaires, base, aDesDonnees, exportEnCours, onExportAttente, onExportCommentaires, onEps, flash }: Props) {
  const copier = async (l: string[]) => {
    try { await navigator.clipboard.writeText(l.join("\n")); flash(`${l.length} EPS copies dans le presse-papiers.`); }
    catch { flash("Copie impossible depuis ce navigateur."); }
  };

  if (scan) {
    return (
      <div className="nx-card" style={{ marginBottom: "1.25rem", padding: ".9rem 1.25rem", backgroundColor: "rgba(2,132,199,.1)", display: "flex", alignItems: "center", gap: 12 }}>
        <Activity size={20} color="#38bdf8" className="nx-pulse" />
        <span style={{ color: "#7dd3fc", fontSize: ".85rem", fontWeight: 600 }}>Analyse de la periode : EPS en attente et commentaires figes...</span>
      </div>
    );
  }
  if (!base) return null;

  return (
    <>
      {attente.length > 0 && (
        <Bandeau couleur="#ef4444" clair="#fca5a5" icone={<AlertTriangle size={22} />}
          titre="ALERTE STATUT CRITIQUE"
          texte={<><strong>{attente.length} EPS</strong> en &quot;EN_ATTENTE_VALIDATION_PARTENAIRE&quot; sans aucune decision Kyntus.</>}
          eps={attente} exportEnCours={exportEnCours === "ALERTE_ATTENTE"} onExport={onExportAttente} onEps={onEps} onCopier={() => copier(attente)} />
      )}
      {commentaires.length > 0 && (
        <Bandeau couleur="#f59e0b" clair="#fcd34d" icone={<MessageSquare size={22} />}
          titre="COMMENTAIRES FIGES DETECTES"
          texte={<><strong>{commentaires.length} EPS</strong> ont un commentaire identique entre leurs deux dernieres versions.</>}
          eps={commentaires} exportEnCours={exportEnCours === "ALERTE_COMMENTAIRES"} onExport={onExportCommentaires} onEps={onEps} onCopier={() => copier(commentaires)} />
      )}
      {aDesDonnees && attente.length === 0 && commentaires.length === 0 && (
        <div className="nx-panel" style={{ marginBottom: "1.25rem", padding: ".85rem 1.25rem", backgroundColor: "rgba(16,185,129,.1)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(16,185,129,.3)", borderLeft: "4px solid #10b981", display: "flex", alignItems: "center", gap: 10, borderRadius: 12 }}>
          <ShieldCheck size={20} color="#34d399" />
          <span style={{ color: "#6ee7b7", fontSize: ".84rem", fontWeight: 700, letterSpacing: ".02em" }}>
            SECTEUR VERIFIE — 0 EPS EN ATTENTE NON TRAITE, 0 COMMENTAIRE FIGE
          </span>
        </div>
      )}
    </>
  );
}
