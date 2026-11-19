"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Database } from "lucide-react";
import CyberSelect from "../../recorde/CyberSelect";

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
  children: React.ReactNode;
}

/** Conteneur de grille au style du "Matrix Datagrid" de Terrain Records. */
export default function DataGrid({
  titre, icone, accent = "#0284c7", badgeLive, total, unite, outils, chargement, messageChargement, vide,
  messageVide, sousMessageVide, page, totalPages, setPage, taille, setTaille, options = [25, 50, 100, 200], children,
}: Props) {
  return (
    <div className="nx-card" style={{ borderRadius: 18, overflow: "hidden" }}>
      <div style={{
        padding: "1rem 1.4rem", borderBottom: "1px solid rgba(148,163,184,.15)", display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 12,
        background: `linear-gradient(90deg, ${accent}26 0%, rgba(11,15,25,0) 55%, rgba(14,165,233,.08) 100%)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, color: "#f8fafc", fontWeight: 800, fontSize: "1rem" }}>
          <div style={{ background: `linear-gradient(135deg, ${accent} 0%, #0369a1 100%)`, padding: 8, borderRadius: 10, display: "flex",
            boxShadow: `0 4px 12px ${accent}66` }}>
            {icone || <Database size={17} color="#fff" />}
          </div>
          <span>{titre}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {outils}
          {badgeLive}
          <div style={{ background: "rgba(15,23,42,.6)", color: "#94a3b8", padding: "5px 14px", borderRadius: 9, fontSize: ".8rem",
            fontWeight: 600, border: "1px solid rgba(148,163,184,.3)", fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: "#38bdf8", fontWeight: 800, fontSize: ".92rem" }}>{(total || 0).toLocaleString("fr-FR")}</span> {unite}
          </div>
        </div>
      </div>

      <div className="nx-grid-wrap nx-scroll">
        {chargement ? (
          <div className="nx-empty">
            <div className="nx-loader" />
            <div style={{ color: "#7dd3fc", fontWeight: 700, letterSpacing: ".06em", fontSize: ".85rem" }}>{messageChargement || "LECTURE DE L'API..."}</div>
          </div>
        ) : vide ? (
          <div className="nx-empty">
            <Database size={48} color="#334155" style={{ margin: "0 auto 1rem" }} />
            <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: "1rem" }}>{messageVide}</div>
            {sousMessageVide && <div style={{ color: "#94a3b8", fontSize: ".82rem", marginTop: 6 }}>{sousMessageVide}</div>}
          </div>
        ) : children}
      </div>

      {!chargement && !vide && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".85rem 1.4rem", flexWrap: "wrap", gap: 12,
          borderTop: "1px solid rgba(148,163,184,.12)", background: "rgba(15,23,42,.35)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
            {setTaille && taille !== undefined && (
              <>
                <span className="nx-eyebrow">Lignes par page</span>
                <CyberSelect width="120px" direction="up" value={taille}
                  options={options.map(n => ({ value: n, label: `${n} lignes` }))}
                  onChange={(v: number) => { setTaille(Number(v)); setPage(0); }} />
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="nx-btn icon" disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}><ChevronLeft size={17} /></button>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, color: "#94a3b8", fontSize: ".78rem", fontWeight: 700 }}>
              PAGE <span style={{ color: "#38bdf8", fontSize: "1rem", fontWeight: 800 }}>{page + 1}</span> SUR {Math.max(totalPages, 1)}
            </div>
            <button className="nx-btn icon" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight size={17} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
