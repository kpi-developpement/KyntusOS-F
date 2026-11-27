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

const champ = (label: string, valeur: React.ReactNode, couleur = "#0f2557") => (
  <span
    style={{
      display: "inline-flex",
      gap: 6,
      alignItems: "baseline",
      padding: "3px 9px",
      borderRadius: 12,
      background: "#f8fbff",
      border: "1px solid #e2ecf8",
    }}
  >
    <span className="nx-eyebrow" style={{ fontSize: "0.58rem" }}>
      {label}
    </span>
    <span style={{ color: couleur, fontWeight: 800, fontSize: "0.78rem" }}>{valeur}</span>
  </span>
);

/** Chronologie d'un EPS (Design 2026 70% White / 30% Sapphire Blue). */
export default function TimelineModal({ eps, periode, entrees, chargement, onClose }: Props) {
  const nbBytel = entrees.filter((e) => e.source !== "KYNTUS").length;
  const nbKyntus = entrees.length - nbBytel;

  return (
    <NexusModal
      ouvert={!!eps}
      onClose={onClose}
      largeur={920}
      accent="#2563eb"
      icone={<Crosshair size={20} />}
      titre={
        <>
          CHRONOLOGIE ·{" "}
          <span
            style={{
              color: "#dbeafe",
              fontFamily: "var(--k-font-mono)",
            }}
          >
            {eps}
          </span>
        </>
      }
      sousTitre={
        <>
          Période {periode} · {nbBytel} version{nbBytel > 1 ? "s" : ""} Bytel ·{" "}
          {nbKyntus} décision{nbKyntus > 1 ? "s" : ""} Kyntus · lecture API
        </>
      }
    >
      {chargement && (
        <div className="nx-empty" style={{ borderRadius: 16 }}>
          <div className="nx-loader" />
          <p style={{ color: "#1d4ed8", fontWeight: 800, fontSize: "0.88rem" }}>
            Lecture de l&apos;historique...
          </p>
        </div>
      )}

      {!chargement && entrees.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            border: "1.5px dashed #bfdbfe",
            backgroundColor: "#ffffff",
            borderRadius: 16,
          }}
        >
          <ShieldAlert size={42} color="#3b82f6" style={{ margin: "0 auto 0.75rem" }} />
          <p style={{ color: "#0f2557", fontSize: "1rem", fontWeight: 800, margin: 0 }}>
            Aucune version trouvée
          </p>
          <p style={{ color: "#647a9e", fontSize: "0.82rem", marginTop: 4 }}>
            Vérifiez l&apos;EPS ou la période, ou synchronisez le mois.
          </p>
        </div>
      )}

      {!chargement && entrees.length > 0 && (
        <div style={{ position: "relative", paddingLeft: 36, marginLeft: 8 }}>
          <div
            style={{
              position: "absolute",
              left: 7,
              top: 14,
              bottom: 14,
              width: 2.5,
              borderRadius: 8,
              background: "linear-gradient(to bottom, #93c5fd, #2563eb, #059669)",
            }}
          />
          {entrees.map((e, i) => {
            const kyntus = e.source === "KYNTUS";
            const prec = (() => {
              for (let k = i - 1; k >= 0; k--)
                if (entrees[k].source !== "KYNTUS") return entrees[k];
              return null;
            })();
            const diffs: [string, string, string][] = [];
            if (prec && !kyntus) {
              if (prec.etat !== e.etat) diffs.push(["État", prec.etat || "-", e.etat || "-"]);
              if (prec.typeIntervention !== e.typeIntervention)
                diffs.push(["Type", prec.typeIntervention || "-", e.typeIntervention || "-"]);
              if (prec.typeRaccordement !== e.typeRaccordement)
                diffs.push([
                  "Raccordement",
                  prec.typeRaccordement || "-",
                  e.typeRaccordement || "-",
                ]);
              if (prec.montant !== e.montant)
                diffs.push(["Montant", fmtMontant(prec.montant), fmtMontant(e.montant)]);
              if (prec.avis !== e.avis) diffs.push(["Avis", prec.avis || "-", e.avis || "-"]);
              if (prec.acteur !== e.acteur)
                diffs.push(["Acteur", prec.acteur || "-", e.acteur || "-"]);
              if (prec.etape !== e.etape)
                diffs.push([
                  "Étape",
                  (prec.etape || "-").replace("Etape", ""),
                  (e.etape || "-").replace("Etape", ""),
                ]);
            }
            const commentaireFige =
              !kyntus && prec && e.commentaire && prec.commentaire === e.commentaire;
            const accent = e.courante
              ? "#059669"
              : kyntus
              ? e.actionType === "CONTESTATION"
                ? "#d97706"
                : "#1d4ed8"
              : "#2563eb";
            const el = elementsDe(e);
            const cles = Object.keys(el);

            return (
              <div
                key={`${e.source}-${e.qualificationId}-${i}`}
                className="nx-panel"
                style={{
                  marginBottom: "1rem",
                  position: "relative",
                  padding: "1.05rem 1.2rem",
                  borderRadius: 16,
                  backgroundColor: e.courante ? "#f0fdf4" : kyntus ? "#eff6ff" : "#ffffff",
                  border: `1px solid ${
                    e.courante ? "#a7f3d0" : kyntus ? "#93c5fd" : "#dbeafe"
                  }`,
                  boxShadow: "0 6px 18px -10px rgba(15, 37, 87, 0.1)",
                  animationDelay: `${Math.min(i * 35, 350)}ms`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -35,
                    top: 18,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: accent,
                    border: "3px solid #ffffff",
                    boxShadow: `0 0 0 2px ${accent}55`,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <span
                    className="nx-badge"
                    style={{
                      background: kyntus ? "#1d4ed8" : e.courante ? "#059669" : "#eff6ff",
                      color: kyntus || e.courante ? "#ffffff" : "#1d4ed8",
                      borderColor: kyntus || e.courante ? "transparent" : "#bfdbfe",
                      fontSize: "0.7rem",
                    }}
                  >
                    {kyntus ? (
                      <>
                        <Bot size={12} /> KYNTUS
                      </>
                    ) : (
                      <>
                        <GitCommit size={12} /> V{e.version}
                        {e.courante ? " • COURANTE" : ""}
                      </>
                    )}
                  </span>

                  {kyntus && (
                    <span
                      className="nx-badge"
                      style={{
                        color: e.actionType === "CONTESTATION" ? "#b45309" : "#059669",
                        background: e.actionType === "CONTESTATION" ? "#fffbeb" : "#ecfdf5",
                        borderColor: e.actionType === "CONTESTATION" ? "#fde68a" : "#a7f3d0",
                      }}
                    >
                      {e.actionType}
                    </span>
                  )}

                  <span
                    style={{
                      color: "#334e7b",
                      fontSize: "0.75rem",
                      fontFamily: "var(--k-font-mono)",
                      fontWeight: 700,
                    }}
                  >
                    {fmtDate(e.date)}
                  </span>

                  <span
                    style={{
                      color: "#647a9e",
                      fontSize: "0.66rem",
                      fontFamily: "var(--k-font-mono)",
                      marginLeft: "auto",
                      background: "#f1f5f9",
                      padding: "2px 7px",
                      borderRadius: 10,
                    }}
                    title={e.qualificationId}
                  >
                    {String(e.qualificationId || "").slice(0, 8)}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {champ("ÉTAT", e.etat || "-", couleurEtat(e.etat))}
                  {champ("TYPE", e.typeIntervention || "-", "#1e40af")}
                  {e.typeRaccordement && champ("RACC", e.typeRaccordement, "#0369a1")}
                  {champ("MONTANT", fmtMontant(e.montant), "#0f2557")}
                  {e.avis &&
                    champ("AVIS", e.avis, e.avis === "CONTESTATION" ? "#d97706" : "#059669")}
                  {e.acteur && champ("ACTEUR", e.acteur, "#334e7b")}
                </div>

                {cles.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {cles.map((c) => (
                      <span
                        key={c}
                        style={{
                          fontSize: "0.66rem",
                          padding: "3px 8px",
                          borderRadius: 7,
                          fontWeight: 700,
                          background: el[c] ? "#eff6ff" : "#f8fafc",
                          border: `1px solid ${el[c] ? "#bfdbfe" : "#e2e8f0"}`,
                          color: el[c] ? "#1e40af" : "#64748b",
                        }}
                      >
                        {c} {fmtMontant(el[c])}
                      </span>
                    ))}
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "3px 10px",
                        borderRadius: 7,
                        fontWeight: 900,
                        background: "#2563eb",
                        color: "#ffffff",
                      }}
                    >
                      TOTAL {fmtMontant(totalElements(el))}
                    </span>
                  </div>
                )}

                {diffs.length > 0 && (
                  <div
                    style={{
                      background: "#fffbeb",
                      padding: "8px 11px",
                      borderRadius: 10,
                      border: "1px solid #fde68a",
                      borderLeft: "3.5px solid #d97706",
                      marginBottom: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {diffs.map(([k, a, b]) => (
                      <div
                        key={k}
                        style={{
                          fontSize: "0.74rem",
                          color: "#92400e",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ color: "#b45309", fontWeight: 800, minWidth: 92 }}>
                          {k}
                        </span>
                        <span style={{ textDecoration: "line-through", opacity: 0.7 }}>{a}</span>
                        <ArrowRight size={12} />
                        <strong style={{ color: "#78350f" }}>{b}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    backgroundColor: "#f8fbff",
                    padding: "10px 12px",
                    borderRadius: 10,
                    color: "#0f2557",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    border: "1px solid #dbeafe",
                    borderLeft: `3.5px solid ${commentaireFige ? "#d97706" : accent}`,
                  }}
                >
                  {commentaireFige && (
                    <span
                      className="nx-badge"
                      style={{
                        color: "#b45309",
                        borderColor: "#fde68a",
                        background: "#fffbeb",
                        marginBottom: 6,
                      }}
                    >
                      COMMENTAIRE IDENTIQUE À LA VERSION PRÉCÉDENTE
                    </span>
                  )}
                  <div style={{ marginTop: commentaireFige ? 6 : 0 }}>
                    {e.commentaire || (
                      <span style={{ color: "#647a9e", fontStyle: "italic" }}>
                        Aucun commentaire pour cette version.
                      </span>
                    )}
                  </div>
                </div>

                {kyntus && e.statutEnvoi && (
                  <div
                    style={{
                      marginTop: 7,
                      fontSize: "0.66rem",
                      color: "#647a9e",
                      fontWeight: 700,
                    }}
                  >
                    ENVOI : {e.statutEnvoi}
                    {e.httpStatus ? ` · HTTP ${e.httpStatus}` : ""}
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
