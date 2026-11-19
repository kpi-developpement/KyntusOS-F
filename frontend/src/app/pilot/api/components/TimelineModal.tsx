"use client";

import React from "react";
import { Crosshair, ShieldAlert, GitCommit, Bot, ArrowRight } from "lucide-react";
import NexusModal from "./NexusModal";
import { couleurEtat, elementsDe, fmtDate, fmtMontant, totalElements } from "../lib/apiUtils";

interface Props {
  eps: string | null;
  periode: string;
  entrees: any[];
  chargement: boolean;
  onClose: () => void;
}

const champ = (label: string, valeur: React.ReactNode, couleur = "#e2e8f0") => (
  <span style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
    <span className="nx-eyebrow" style={{ fontSize: ".6rem" }}>{label}</span>
    <span style={{ color: couleur, fontWeight: 700, fontSize: ".8rem" }}>{valeur}</span>
  </span>
);

/** Chronologie d'un EPS : versions Bytel et decisions Kyntus, de la plus ancienne a la plus recente. */
export default function TimelineModal({ eps, periode, entrees, chargement, onClose }: Props) {
  const nbBytel = entrees.filter(e => e.source !== "KYNTUS").length;
  const nbKyntus = entrees.length - nbBytel;

  return (
    <NexusModal ouvert={!!eps} onClose={onClose} largeur={880} accent="#38bdf8"
      icone={<Crosshair size={20} />}
      titre={<>CHRONOLOGIE · <span style={{ color: "#7dd3fc", fontFamily: "'JetBrains Mono', monospace" }}>{eps}</span></>}
      sousTitre={<>Periode {periode} · {nbBytel} version{nbBytel > 1 ? "s" : ""} Bytel · {nbKyntus} decision{nbKyntus > 1 ? "s" : ""} Kyntus · lecture API</>}>
      {chargement && (
        <div className="nx-empty"><div className="nx-loader" /><p style={{ color: "#7dd3fc", fontWeight: 600, fontSize: ".9rem" }}>Lecture de l&apos;historique...</p></div>
      )}

      {!chargement && entrees.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", border: "1px dashed rgba(148,163,184,.3)", backgroundColor: "rgba(15,23,42,.4)", borderRadius: 12 }}>
          <ShieldAlert size={42} color="#64748b" style={{ margin: "0 auto .75rem" }} />
          <p style={{ color: "#f8fafc", fontSize: "1rem", fontWeight: 700, margin: 0 }}>Aucune version trouvee</p>
          <p style={{ color: "#94a3b8", fontSize: ".82rem", marginTop: 4 }}>Verifiez l&apos;EPS ou la periode, ou synchronisez le mois.</p>
        </div>
      )}

      {!chargement && entrees.length > 0 && (
        <div style={{ position: "relative", paddingLeft: 34, marginLeft: 6 }}>
          <div style={{ position: "absolute", left: 7, top: 12, bottom: 12, width: 2, background: "linear-gradient(to bottom, #0369a1, #38bdf8, #10b981)" }} />
          {entrees.map((e, i) => {
            const kyntus = e.source === "KYNTUS";
            const prec = (() => { for (let k = i - 1; k >= 0; k--) if (entrees[k].source !== "KYNTUS") return entrees[k]; return null; })();
            const diffs: [string, string, string][] = [];
            if (prec && !kyntus) {
              if (prec.etat !== e.etat) diffs.push(["Etat", prec.etat || "-", e.etat || "-"]);
              if (prec.typeIntervention !== e.typeIntervention) diffs.push(["Type", prec.typeIntervention || "-", e.typeIntervention || "-"]);
              if (prec.typeRaccordement !== e.typeRaccordement) diffs.push(["Raccordement", prec.typeRaccordement || "-", e.typeRaccordement || "-"]);
              if (prec.montant !== e.montant) diffs.push(["Montant", fmtMontant(prec.montant), fmtMontant(e.montant)]);
              if (prec.avis !== e.avis) diffs.push(["Avis", prec.avis || "-", e.avis || "-"]);
              if (prec.acteur !== e.acteur) diffs.push(["Acteur", prec.acteur || "-", e.acteur || "-"]);
              if (prec.etape !== e.etape) diffs.push(["Etape", (prec.etape || "-").replace("Etape", ""), (e.etape || "-").replace("Etape", "")]);
            }
            const commentaireFige = !kyntus && prec && e.commentaire && prec.commentaire === e.commentaire;
            const accent = e.courante ? "#10b981" : kyntus ? (e.actionType === "CONTESTATION" ? "#f59e0b" : "#a855f7") : "#38bdf8";
            const el = elementsDe(e);
            const cles = Object.keys(el);

            return (
              <div key={`${e.source}-${e.qualificationId}-${i}`} className="nx-panel" style={{
                marginBottom: "1.1rem", position: "relative", padding: "1rem 1.15rem", borderRadius: 12,
                backgroundColor: e.courante ? "rgba(16,185,129,.08)" : kyntus ? "rgba(168,85,247,.07)" : "rgba(15,23,42,.45)",
                border: `1px solid ${accent}${e.courante || kyntus ? "66" : "33"}`, animationDelay: `${Math.min(i * 40, 400)}ms`,
              }}>
                <div style={{ position: "absolute", left: -34, top: 18, width: 16, height: 16, borderRadius: "50%",
                  backgroundColor: accent, border: "3px solid #0b0f19", boxShadow: `0 0 0 3px ${accent}40` }} />

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <span className="nx-badge" style={{ background: kyntus ? "rgba(168,85,247,.18)" : e.courante ? "#059669" : "rgba(2,132,199,.2)",
                    color: kyntus ? "#d8b4fe" : e.courante ? "#fff" : "#7dd3fc", borderColor: "transparent", fontSize: ".72rem" }}>
                    {kyntus ? <><Bot size={12} /> KYNTUS</> : <><GitCommit size={12} /> V{e.version}{e.courante ? " • COURANTE" : ""}</>}
                  </span>
                  {kyntus && (
                    <span className="nx-badge" style={{ color: e.actionType === "CONTESTATION" ? "#fbbf24" : "#34d399",
                      background: e.actionType === "CONTESTATION" ? "rgba(245,158,11,.12)" : "rgba(16,185,129,.12)", borderColor: "transparent" }}>
                      {e.actionType}
                    </span>
                  )}
                  <span style={{ color: "#94a3b8", fontSize: ".76rem", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{fmtDate(e.date)}</span>
                  <span style={{ color: "#475569", fontSize: ".66rem", fontFamily: "monospace", marginLeft: "auto" }} title={e.qualificationId}>
                    {String(e.qualificationId || "").slice(0, 8)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
                  {champ("ETAT", e.etat || "-", couleurEtat(e.etat))}
                  {champ("TYPE", e.typeIntervention || "-", "#c4b5fd")}
                  {e.typeRaccordement && champ("RACC", e.typeRaccordement, "#6ee7b7")}
                  {champ("MONTANT", fmtMontant(e.montant), "#fbbf24")}
                  {e.avis && champ("AVIS", e.avis, e.avis === "CONTESTATION" ? "#fbbf24" : "#34d399")}
                  {e.acteur && champ("ACTEUR", e.acteur, "#cbd5e1")}
                </div>

                {cles.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {cles.map(c => (
                      <span key={c} style={{ fontSize: ".66rem", padding: "2px 8px", borderRadius: 6, fontWeight: 600,
                        background: el[c] ? "rgba(245,158,11,.1)" : "rgba(148,163,184,.06)", border: `1px solid ${el[c] ? "rgba(245,158,11,.3)" : "rgba(148,163,184,.15)"}`,
                        color: el[c] ? "#fcd34d" : "#64748b" }}>{c} {fmtMontant(el[c])}</span>
                    ))}
                    <span style={{ fontSize: ".66rem", padding: "2px 8px", borderRadius: 6, fontWeight: 800, background: "rgba(56,189,248,.14)",
                      border: "1px solid rgba(56,189,248,.35)", color: "#7dd3fc" }}>TOTAL {fmtMontant(totalElements(el))}</span>
                  </div>
                )}

                {diffs.length > 0 && (
                  <div style={{ background: "rgba(2,6,23,.6)", padding: "8px 10px", borderRadius: 8, borderLeft: "3px solid #f59e0b", marginBottom: e.commentaire ? 8 : 0,
                    display: "flex", flexDirection: "column", gap: 3 }}>
                    {diffs.map(([k, a, b]) => (
                      <div key={k} style={{ fontSize: ".74rem", color: "#fcd34d", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ color: "#94a3b8", fontWeight: 700, minWidth: 92 }}>{k}</span>
                        <span style={{ textDecoration: "line-through", opacity: .7 }}>{a}</span><ArrowRight size={12} /><strong>{b}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ backgroundColor: "rgba(15,23,42,.6)", padding: "10px 12px", borderRadius: 8, color: "#f8fafc", fontSize: ".84rem",
                  border: "1px solid rgba(148,163,184,.15)", borderLeft: `3px solid ${commentaireFige ? "#f59e0b" : accent}` }}>
                  {commentaireFige && <span className="nx-badge" style={{ color: "#fbbf24", borderColor: "rgba(245,158,11,.4)", background: "rgba(245,158,11,.1)", marginBottom: 6 }}>COMMENTAIRE IDENTIQUE A LA VERSION PRECEDENTE</span>}
                  <div style={{ marginTop: commentaireFige ? 6 : 0 }}>
                    {e.commentaire || <span style={{ color: "#64748b", fontStyle: "italic" }}>Aucun commentaire pour cette version.</span>}
                  </div>
                </div>

                {kyntus && e.statutEnvoi && (
                  <div style={{ marginTop: 7, fontSize: ".66rem", color: "#64748b", fontWeight: 600 }}>
                    ENVOI : {e.statutEnvoi}{e.httpStatus ? ` · HTTP ${e.httpStatus}` : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </NexusModal>
  );
}
