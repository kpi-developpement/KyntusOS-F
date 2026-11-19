"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Database, Rows3, Rows4, Search, X } from "lucide-react";
import NexusSelect from "./NexusSelect";

interface Props {
  titre: string;
  icone?: React.ReactNode;
  accent?: string;
  badgeLive?: React.ReactNode;
  total: number;
  unite: string;
  outils?: React.ReactNode;
  chargement: boolean;
  messageChargement?: React.ReactNode;
  vide: boolean;
  messageVide: React.ReactNode;
  sousMessageVide?: React.ReactNode;
  page: number;
  totalPages: number;
  setPage: (p: number) => void;
  taille?: number;
  setTaille?: (t: number) => void;
  options?: number[];
  density?: "comfort" | "compact";
  setDensity?: (d: "comfort" | "compact") => void;
  quickFilter?: string;
  setQuickFilter?: (q: string) => void;
  children: React.ReactNode;
}

/** Conteneur de grille 2026 Enterprise (70% White / 30% Sapphire Blue). */
export default function DataGrid({
  titre,
  icone,
  accent = "#2563eb",
  badgeLive,
  total,
  unite,
  outils,
  chargement,
  messageChargement,
  vide,
  messageVide,
  sousMessageVide,
  page,
  totalPages,
  setPage,
  taille,
  setTaille,
  options = [25, 50, 100, 200],
  density,
  setDensity,
  quickFilter,
  setQuickFilter,
  children,
}: Props) {
  const [internalDensity, setInternalDensity] = useState<"comfort" | "compact">("comfort");
  const activeDensity = density ?? internalDensity;
  const updateDensity = setDensity ?? setInternalDensity;

  return (
    <div
      className="nx-card"
      style={{
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid #dbeafe",
        background: "#ffffff",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          padding: "0.95rem 1.35rem",
          borderBottom: "1px solid #e2ecf8",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background:
            "linear-gradient(90deg, #eff6ff 0%, #ffffff 55%, #f0f9ff 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            color: "#0f2557",
            fontWeight: 900,
            fontSize: "0.96rem",
            letterSpacing: "-0.01em",
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, #1d4ed8 100%)`,
              padding: 8,
              borderRadius: 11,
              display: "flex",
              boxShadow: "0 6px 14px -4px rgba(37, 99, 235, 0.45)",
            }}
          >
            {icone || <Database size={17} color="#fff" />}
          </div>
          <span>{titre}</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {setQuickFilter && (
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={14}
                color="#2563eb"
                style={{ position: "absolute", left: 10, pointerEvents: "none" }}
              />
              <input
                type="text"
                value={quickFilter || ""}
                onChange={(e) => setQuickFilter(e.target.value)}
                placeholder="Filtrer cette page..."
                className="nx-input"
                style={{
                  height: 33,
                  width: 195,
                  paddingLeft: 30,
                  paddingRight: quickFilter ? 26 : 10,
                  fontSize: "0.75rem",
                  borderRadius: 9,
                }}
              />
              {quickFilter && (
                <button
                  type="button"
                  onClick={() => setQuickFilter("")}
                  style={{
                    position: "absolute",
                    right: 7,
                    width: 17,
                    height: 17,
                    borderRadius: "50%",
                    border: "none",
                    background: "#dbeafe",
                    color: "#1d4ed8",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          {outils}

          {/* DENSITY SWITCHER */}
          <div
            style={{
              display: "inline-flex",
              padding: 2,
              borderRadius: 9,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
            }}
            title="Densité d'affichage de la table"
          >
            <button
              type="button"
              onClick={() => updateDensity("comfort")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                height: 27,
                padding: "0 8px",
                borderRadius: 7,
                border: "none",
                fontSize: "0.68rem",
                fontWeight: 800,
                cursor: "pointer",
                background: activeDensity === "comfort" ? "#2563eb" : "transparent",
                color: activeDensity === "comfort" ? "#ffffff" : "#1e40af",
                transition: "all 0.15s ease",
              }}
            >
              <Rows3 size={13} /> Confort
            </button>
            <button
              type="button"
              onClick={() => updateDensity("compact")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                height: 27,
                padding: "0 8px",
                borderRadius: 7,
                border: "none",
                fontSize: "0.68rem",
                fontWeight: 800,
                cursor: "pointer",
                background: activeDensity === "compact" ? "#2563eb" : "transparent",
                color: activeDensity === "compact" ? "#ffffff" : "#1e40af",
                transition: "all 0.15s ease",
              }}
            >
              <Rows4 size={13} /> Compact
            </button>
          </div>

          {badgeLive}

          <div
            style={{
              background: "#eff6ff",
              color: "#1e3a8a",
              padding: "5px 13px",
              borderRadius: 10,
              fontSize: "0.78rem",
              fontWeight: 700,
              border: "1px solid #bfdbfe",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: "#2563eb", fontWeight: 900, fontSize: "0.9rem" }}>
              {(total || 0).toLocaleString("fr-FR")}
            </span>{" "}
            {unite}
          </div>
        </div>
      </div>

      {/* GRID BODY */}
      <div className={`nx-grid-wrap nx-scroll ${activeDensity === "compact" ? "nx-density-compact" : ""}`}>
        <style>{`
          .nx-density-compact table.nx-table td {
            padding-top: 0.36rem !important;
            padding-bottom: 0.36rem !important;
            font-size: 0.76rem !important;
          }
          .nx-density-compact table.nx-table th {
            padding-top: 0.56rem !important;
            padding-bottom: 0.56rem !important;
          }
        `}</style>
        {chargement ? (
          <div className="nx-empty">
            <div className="nx-loader" />
            <div
              style={{
                color: "#1d4ed8",
                fontWeight: 800,
                letterSpacing: "0.06em",
                fontSize: "0.84rem",
              }}
            >
              {messageChargement || "LECTURE DE L'API..."}
            </div>
          </div>
        ) : vide ? (
          <div className="nx-empty">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                color: "#2563eb",
              }}
            >
              <Database size={30} />
            </div>
            <div style={{ color: "#0f2557", fontWeight: 800, fontSize: "1.02rem" }}>
              {messageVide}
            </div>
            {sousMessageVide && (
              <div style={{ color: "#647a9e", fontSize: "0.82rem", marginTop: 6, fontWeight: 500 }}>
                {sousMessageVide}
              </div>
            )}
          </div>
        ) : (
          children
        )}
      </div>

      {/* FOOTER PAGINATION */}
      {!chargement && !vide && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.8rem 1.35rem",
            flexWrap: "wrap",
            gap: 12,
            borderTop: "1px solid #e2ecf8",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {setTaille && taille !== undefined && (
              <>
                <span className="nx-eyebrow">Lignes par page</span>
                <NexusSelect
                  width="130px"
                  direction="up"
                  searchable={false}
                  value={taille}
                  options={options.map((n) => ({ value: n, label: `${n} lignes` }))}
                  onChange={(v: number) => {
                    setTaille(Number(v));
                    setPage(0);
                  }}
                />
              </>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="nx-btn icon"
              disabled={page === 0}
              onClick={() => setPage(Math.max(0, page - 1))}
              title="Page précédente"
            >
              <ChevronLeft size={17} />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                color: "#334e7b",
                fontSize: "0.76rem",
                fontWeight: 800,
                padding: "4px 12px",
                borderRadius: 10,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              PAGE{" "}
              <span style={{ color: "#2563eb", fontSize: "0.95rem", fontWeight: 900 }}>
                {page + 1}
              </span>{" "}
              SUR {Math.max(totalPages, 1)}
            </div>

            <button
              className="nx-btn icon"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage(page + 1)}
              title="Page suivante"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
