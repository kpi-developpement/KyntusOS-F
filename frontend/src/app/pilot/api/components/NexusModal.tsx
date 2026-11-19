"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  ouvert: boolean;
  onClose: () => void;
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  icone?: React.ReactNode;
  /** Couleur d'accent de la bordure et du degrade d'en-tete */
  accent?: string;
  largeur?: number;
  verrouille?: boolean;
  children: React.ReactNode;
  pied?: React.ReactNode;
}

/** Coquille de modale commune, au style des protocoles de Terrain Records. */
export default function NexusModal({ ouvert, onClose, titre, sousTitre, icone, accent = "#38bdf8", largeur = 720, verrouille, children, pied }: Props) {
  useEffect(() => {
    if (!ouvert) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !verrouille) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ouvert, verrouille, onClose]);

  if (!ouvert) return null;
  return (
    <div className="nx-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !verrouille) onClose(); }}>
      <div className="nx-panel" style={{
        backgroundColor: "rgba(11,15,25,.96)", border: `1px solid ${accent}55`, borderRadius: 18,
        width: largeur, maxWidth: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: `0 24px 48px -12px rgba(0,0,0,.6), 0 0 0 1px ${accent}22, 0 0 60px -20px ${accent}66`, overflow: "hidden",
      }}>
        <div style={{
          padding: "1.15rem 1.5rem", borderBottom: "1px solid rgba(148,163,184,.15)", display: "flex",
          justifyContent: "space-between", alignItems: "center", gap: 12,
          background: `linear-gradient(90deg, ${accent}26 0%, rgba(11,15,25,0) 100%)`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            {icone && (
              <div style={{ width: 38, height: 38, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center",
                background: `${accent}22`, border: `1px solid ${accent}55`, color: accent, flexShrink: 0 }}>
                {icone}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h2 style={{ color: "#f8fafc", margin: 0, fontSize: "1.08rem", fontWeight: 800, letterSpacing: "-.01em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titre}</h2>
              {sousTitre && <div style={{ color: "#94a3b8", fontSize: ".76rem", marginTop: 2 }}>{sousTitre}</div>}
            </div>
          </div>
          <button onClick={onClose} disabled={verrouille} className="nx-btn icon" aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="nx-scroll" style={{ padding: "1.4rem 1.5rem", overflowY: "auto", flex: 1 }}>{children}</div>
        {pied && (
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(148,163,184,.12)", background: "rgba(15,23,42,.4)" }}>{pied}</div>
        )}
      </div>
    </div>
  );
}
