"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  ouvert: boolean;
  onClose: () => void;
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  icone?: React.ReactNode;
  /** Couleur d'accent optionnelle (par defaut Sapphire Blue) */
  accent?: string;
  largeur?: number;
  verrouille?: boolean;
  children: React.ReactNode;
  pied?: React.ReactNode;
}

/** Coquille de modale 2026 Enterprise (70% White / 30% Sapphire Blue). */
export default function NexusModal({
  ouvert,
  onClose,
  titre,
  sousTitre,
  icone,
  accent = "#2563eb",
  largeur = 740,
  verrouille,
  children,
  pied,
}: Props) {
  useEffect(() => {
    if (!ouvert) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !verrouille) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ouvert, verrouille, onClose]);

  if (!ouvert) return null;

  const isDanger = accent === "#ef4444" || accent === "#dc2626";
  const headerGradient = isDanger
    ? "linear-gradient(125deg, #dc2626 0%, #b91c1c 100%)"
    : "linear-gradient(125deg, #1d4ed8 0%, #2563eb 55%, #0284c7 100%)";

  return (
    <div
      className="nx-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !verrouille) onClose();
      }}
    >
      <div
        className="nx-panel"
        style={{
          backgroundColor: "#ffffff",
          border: `1px solid ${isDanger ? "#fecaca" : "#bfdbfe"}`,
          borderRadius: 22,
          width: largeur,
          maxWidth: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 36px 80px -20px rgba(15, 37, 87, 0.38), 0 12px 28px -10px rgba(37, 99, 235, 0.2)",
          overflow: "hidden",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "1.1rem 1.45rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            background: headerGradient,
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            {icone && (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ffffff",
                  color: isDanger ? "#dc2626" : "#1d4ed8",
                  boxShadow: "0 6px 14px rgba(0, 0, 0, 0.15)",
                  flexShrink: 0,
                }}
              >
                {icone}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  color: "#ffffff",
                  margin: 0,
                  fontSize: "1.04rem",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {titre}
              </h2>
              {sousTitre && (
                <div
                  style={{
                    color: "rgba(255, 255, 255, 0.86)",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    marginTop: 2,
                  }}
                >
                  {sousTitre}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={verrouille}
            aria-label="Fermer"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.28)",
              background: "rgba(255, 255, 255, 0.16)",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: verrouille ? "not-allowed" : "pointer",
              transition: "all 0.16s ease",
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div
          className="nx-scroll"
          style={{
            padding: "1.35rem 1.5rem",
            overflowY: "auto",
            flex: 1,
            background: "#f8fbff",
            color: "#0f2557",
          }}
        >
          {children}
        </div>

        {/* FOOTER */}
        {pied && (
          <div
            style={{
              padding: "0.95rem 1.5rem",
              borderTop: "1px solid #e2ecf8",
              background: "#ffffff",
            }}
          >
            {pied}
          </div>
        )}
      </div>
    </div>
  );
}
