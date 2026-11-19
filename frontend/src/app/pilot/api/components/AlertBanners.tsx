"use client";

import React, { useState } from "react";
import { Activity, AlertTriangle, DownloadCloud, MessageSquare, ShieldCheck, Copy, ChevronDown } from "lucide-react";

interface BandeauProps {
  couleur: string;
  fond: string;
  bordure: string;
  icone: React.ReactNode;
  titre: string;
  texte: React.ReactNode;
  eps: string[];
  exportEnCours: boolean;
  onExport: () => void;
  onEps: (eps: string) => void;
  onCopier: () => void;
}

function Bandeau({
  couleur,
  fond,
  bordure,
  icone,
  titre,
  texte,
  eps,
  exportEnCours,
  onExport,
  onEps,
  onCopier,
}: BandeauProps) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div
      onClick={() => setOuvert((o) => !o)}
      className="nx-panel"
      style={{
        cursor: "pointer",
        backgroundColor: "#ffffff",
        border: `1px solid ${bordure}`,
        borderLeft: `5px solid ${couleur}`,
        padding: "0.85rem 1.2rem",
        borderRadius: 16,
        boxShadow: "0 10px 26px -12px rgba(15, 37, 87, 0.12)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              backgroundColor: fond,
              padding: 9,
              borderRadius: 12,
              border: `1px solid ${bordure}`,
              color: couleur,
              display: "flex",
            }}
          >
            {icone}
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "0.88rem",
                fontWeight: 900,
                color: "#0f2557",
                letterSpacing: "0.01em",
              }}
            >
              {titre}
            </h3>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: "0.79rem",
                fontWeight: 600,
                color: "#334e7b",
              }}
            >
              {texte}
            </p>
          </div>
        </div>

        <div
          style={{ display: "flex", gap: 7, alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onCopier}
            className="nx-btn sm"
            title="Copier la liste des EPS"
          >
            <Copy size={13} /> Copier ({eps.length})
          </button>
          <button
            onClick={onExport}
            disabled={exportEnCours}
            className="nx-btn sm nx-soft"
          >
            <DownloadCloud size={13} />{" "}
            {exportEnCours ? "Extraction..." : "Export Logs"}
          </button>
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            className="nx-btn sm"
            style={{
              background: fond,
              borderColor: bordure,
              color: couleur,
            }}
          >
            {ouvert ? "Masquer" : "Voir les EPS"}
            <ChevronDown
              size={13}
              style={{
                transform: ouvert ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
          </button>
        </div>
      </div>

      {ouvert && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 12,
            borderTop: `1px solid ${bordure}`,
            backgroundColor: "#f8fbff",
            padding: 11,
            borderRadius: 12,
          }}
        >
          <div
            className="nx-scroll"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              maxHeight: 150,
              overflowY: "auto",
            }}
          >
            {eps.map((e) => (
              <span
                key={e}
                onClick={() => onEps(e)}
                title="Ouvrir la chronologie de cet EPS"
                className="nx-eps"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: bordure,
                  color: "#0f2557",
                }}
              >
                {e}
              </span>
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

/** Alertes de la periode (Design 2026 70% White / 30% Blue). */
export default function AlertBanners({
  scan,
  attente,
  commentaires,
  base,
  aDesDonnees,
  exportEnCours,
  onExportAttente,
  onExportCommentaires,
  onEps,
  flash,
}: Props) {
  const copier = async (l: string[]) => {
    try {
      await navigator.clipboard.writeText(l.join("\n"));
      flash(`${l.length} EPS copiés dans le presse-papiers.`);
    } catch {
      flash("Copie impossible depuis ce navigateur.");
    }
  };

  if (scan) {
    return (
      <div
        className="nx-card"
        style={{
          padding: "0.75rem 1.2rem",
          backgroundColor: "#eff6ff",
          borderColor: "#bfdbfe",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 14,
        }}
      >
        <Activity size={18} color="#2563eb" className="nx-pulse" />
        <span style={{ color: "#1d4ed8", fontSize: "0.81rem", fontWeight: 700 }}>
          Analyse de la période : EPS en attente et commentaires figés...
        </span>
      </div>
    );
  }
  if (!base) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      {attente.length > 0 && (
        <Bandeau
          couleur="#dc2626"
          fond="#fef2f2"
          bordure="#fecaca"
          icone={<AlertTriangle size={20} />}
          titre="ALERTE STATUT CRITIQUE"
          texte={
            <>
              <strong style={{ color: "#dc2626" }}>{attente.length} EPS</strong> en{" "}
              &quot;EN_ATTENTE_VALIDATION_PARTENAIRE&quot; sans aucune décision Kyntus.
            </>
          }
          eps={attente}
          exportEnCours={exportEnCours === "ALERTE_ATTENTE"}
          onExport={onExportAttente}
          onEps={onEps}
          onCopier={() => copier(attente)}
        />
      )}
      {commentaires.length > 0 && (
        <Bandeau
          couleur="#d97706"
          fond="#fffbeb"
          bordure="#fde68a"
          icone={<MessageSquare size={20} />}
          titre="COMMENTAIRES FIGÉS DÉTECTÉS"
          texte={
            <>
              <strong style={{ color: "#d97706" }}>{commentaires.length} EPS</strong> ont un
              commentaire identique entre leurs deux dernières versions.
            </>
          }
          eps={commentaires}
          exportEnCours={exportEnCours === "ALERTE_COMMENTAIRES"}
          onExport={onExportCommentaires}
          onEps={onEps}
          onCopier={() => copier(commentaires)}
        />
      )}
      {aDesDonnees && attente.length === 0 && commentaires.length === 0 && (
        <div
          className="nx-panel"
          style={{
            padding: "0.72rem 1.15rem",
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderLeft: "4px solid #059669",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 13,
          }}
        >
          <ShieldCheck size={19} color="#059669" />
          <span
            style={{
              color: "#065f46",
              fontSize: "0.8rem",
              fontWeight: 800,
              letterSpacing: "0.02em",
            }}
          >
            SECTEUR VÉRIFIÉ — 0 EPS EN ATTENTE NON TRAITÉ, 0 COMMENTAIRE FIGÉ
          </span>
        </div>
      )}
    </div>
  );
}
