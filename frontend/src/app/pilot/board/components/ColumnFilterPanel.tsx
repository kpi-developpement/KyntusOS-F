"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowUpAZ,
  ArrowDownZA,
  FileQuestion,
  FileCheck2,
  TextQuote,
  Maximize2,
  Minimize2,
  Search,
  X,
  Trash2,
  CheckSquare,
  Square,
  Filter,
  Check,
} from "lucide-react";
import { EMPTY_TOKEN } from "../lib/boardUtils";
import o from "../ui/BoardOverlays.module.css";

export type SortMode = "ASC" | "DESC" | "EMPTY_FIRST" | "FILLED_FIRST" | "LEN_DESC";
export type ColFilterMode = "CONTAINS" | "NOT_CONTAINS" | "EMPTY" | "NOT_EMPTY";

export interface ColumnFilterRule {
  mode: ColFilterMode;
  text: string;
  selectedValues: string[];
}

export const EMPTY_RULE: ColumnFilterRule = {
  mode: "CONTAINS",
  text: "",
  selectedValues: [],
};

interface ColumnFilterPanelProps {
  label: string;
  rule: ColumnFilterRule;
  distinct: [string, number][];
  sortMode: SortMode | null;
  canWrap: boolean;
  isWrapped: boolean;
  valueLabel?: (v: string) => string;
  onRuleChange: (patch: Partial<ColumnFilterRule>) => void;
  onClearFilter: () => void;
  onSort: (mode: SortMode | null) => void;
  onToggleWrap: () => void;
  onClose: () => void;
  pendingOnly: boolean;
  onTogglePending: () => void;
  pendingCount: number;
}

const SORTS: { id: SortMode; label: string; icon: React.ReactNode }[] = [
  { id: "ASC", label: "A → Z", icon: <ArrowUpAZ size={14} /> },
  { id: "DESC", label: "Z → A", icon: <ArrowDownZA size={14} /> },
  { id: "EMPTY_FIRST", label: "Vides en haut", icon: <FileQuestion size={14} /> },
  { id: "FILLED_FIRST", label: "Remplis en haut", icon: <FileCheck2 size={14} /> },
  { id: "LEN_DESC", label: "Textes longs", icon: <TextQuote size={14} /> },
];

const MODES: { id: ColFilterMode; label: string }[] = [
  { id: "CONTAINS", label: "Contient" },
  { id: "NOT_CONTAINS", label: "Exclut" },
  { id: "NOT_EMPTY", label: "Rempli" },
  { id: "EMPTY", label: "Vide" },
];

const MAX_RENDERED_VALUES = 600;

export default function ColumnFilterPanel({
  label,
  rule,
  distinct,
  sortMode,
  canWrap,
  isWrapped,
  valueLabel,
  onRuleChange,
  onClearFilter,
  onSort,
  onToggleWrap,
  onClose,
  pendingOnly,
  onTogglePending,
  pendingCount,
}: ColumnFilterPanelProps) {
  const [valueQuery, setValueQuery] = useState("");

  const display = (v: string) =>
    v === EMPTY_TOKEN ? "(Vide / Non renseigné)" : valueLabel ? valueLabel(v) : v;

  const visibleValues = useMemo(() => {
    const q = valueQuery.trim().toLowerCase();
    if (!q) return distinct;
    return distinct.filter(([v]) => display(v).toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distinct, valueQuery]);

  const selectedSet = useMemo(() => new Set(rule.selectedValues), [rule.selectedValues]);
  const isFilterActive =
    rule.mode !== "CONTAINS" || rule.text.trim() !== "" || rule.selectedValues.length > 0;

  const allVisibleChecked =
    visibleValues.length > 0 && visibleValues.every(([v]) => selectedSet.has(v));

  const toggleValue = (v: string) => {
    const next = selectedSet.has(v)
      ? rule.selectedValues.filter((x) => x !== v)
      : [...rule.selectedValues, v];
    onRuleChange({ selectedValues: next });
  };

  const toggleAllVisible = () => {
    if (allVisibleChecked) {
      const vis = new Set(visibleValues.map(([v]) => v));
      onRuleChange({ selectedValues: rule.selectedValues.filter((v) => !vis.has(v)) });
    } else {
      const merged = new Set([...rule.selectedValues, ...visibleValues.map(([v]) => v)]);
      onRuleChange({ selectedValues: Array.from(merged) });
    }
  };

  return (
    <div className={o.floatPanel}>
      {/* HEADER */}
      <div className={o.floatHeader}>
        <div className={o.floatTitle}>
          <Filter size={14} />
          <span title={label}>{label}</span>
        </div>
        <button type="button" className={o.iconGhostBtn} onClick={onClose} title="Fermer">
          <X size={15} />
        </button>
      </div>

      {/* SCROLLABLE BODY */}
      <div className={o.floatBody}>
        {/* PENDING ONLY SWITCH */}
        <button
          type="button"
          className={`${o.pendingSwitch} ${pendingOnly ? o.pendingSwitchOn : ""}`}
          onClick={onTogglePending}
          title="Les EPS terminés / validés disparaissent des filtres et des compteurs"
        >
          <span className={o.switchTrack}>
            <span className={o.switchThumb} />
          </span>
          <span className={o.pendingText}>
            <b>Seulement À faire / En cours</b>
            <small>
              {pendingOnly
                ? `${pendingCount} EPS restant(s) — les terminés sont exclus`
                : "Les EPS terminés et validés sont inclus"}
            </small>
          </span>
        </button>

        {/* SORT */}
        <section className={o.section}>
          <div className={o.sectionHead}>
            <span className={o.sectionLabel}>Trier</span>
            {sortMode && (
              <button type="button" className={o.linkDanger} onClick={() => onSort(null)}>
                Retirer le tri
              </button>
            )}
          </div>
          <div className={o.sortGrid}>
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSort(sortMode === s.id ? null : s.id)}
                className={`${o.sortChip} ${sortMode === s.id ? o.sortChipActive : ""}`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* WRAP */}
        {canWrap && (
          <section className={o.section}>
            <button
              type="button"
              onClick={onToggleWrap}
              className={`${o.wrapToggle} ${isWrapped ? o.wrapToggleActive : ""}`}
            >
              {isWrapped ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isWrapped ? "Texte complet : ON (compacter)" : "Afficher tout le texte"}</span>
            </button>
          </section>
        )}

        {/* FILTER MODE + TEXT */}
        <section className={o.section}>
          <span className={o.sectionLabel}>Condition</span>
          <div className={o.modeGrid}>
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onRuleChange({ mode: m.id })}
                className={`${o.modePill} ${rule.mode === m.id ? o.modePillActive : ""}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {(rule.mode === "CONTAINS" || rule.mode === "NOT_CONTAINS") && (
            <div className={o.inputWrap}>
              <Search size={13} className={o.inputIcon} />
              <input
                type="text"
                className={o.input}
                placeholder={rule.mode === "CONTAINS" ? "Texte contenu..." : "Texte à exclure..."}
                value={rule.text}
                onChange={(e) => onRuleChange({ text: e.target.value })}
              />
              {rule.text && (
                <button type="button" className={o.inputClear} onClick={() => onRuleChange({ text: "" })}>
                  <X size={11} />
                </button>
              )}
            </div>
          )}
        </section>

        {/* MULTI VALUES */}
        <section className={o.section}>
          <div className={o.sectionHead}>
            <span className={o.sectionLabel}>
              Valeurs {rule.selectedValues.length > 0 && <b>({rule.selectedValues.length} cochée(s))</b>}
            </span>
            {rule.selectedValues.length > 0 && (
              <button type="button" className={o.linkDanger} onClick={() => onRuleChange({ selectedValues: [] })}>
                Décocher tout
              </button>
            )}
          </div>

          <div className={o.inputWrap}>
            <Search size={13} className={o.inputIcon} />
            <input
              type="text"
              className={o.input}
              placeholder={`Chercher parmi ${distinct.length} valeur(s)...`}
              value={valueQuery}
              onChange={(e) => setValueQuery(e.target.value)}
            />
            {valueQuery && (
              <button type="button" className={o.inputClear} onClick={() => setValueQuery("")}>
                <X size={11} />
              </button>
            )}
          </div>

          {visibleValues.length > 0 ? (
            <div className={o.valueList}>
              <button type="button" className={o.valueRowAll} onClick={toggleAllVisible}>
                {allVisibleChecked ? <CheckSquare size={15} /> : <Square size={15} />}
                <span>{valueQuery ? "Cocher les résultats" : "Tout cocher"}</span>
                <span className={o.valueCount}>{visibleValues.length}</span>
              </button>

              {visibleValues.slice(0, MAX_RENDERED_VALUES).map(([v, count]) => {
                const checked = selectedSet.has(v);
                return (
                  <button
                    key={v}
                    type="button"
                    className={`${o.valueRow} ${checked ? o.valueRowChecked : ""}`}
                    onClick={() => toggleValue(v)}
                    title={display(v)}
                  >
                    <span className={o.checkBox}>{checked && <Check size={11} strokeWidth={3} />}</span>
                    <span className={`${o.valueText} ${v === EMPTY_TOKEN ? o.valueTextMuted : ""}`}>
                      {display(v)}
                    </span>
                    <span className={o.valueCount}>{count}</span>
                  </button>
                );
              })}
              {visibleValues.length > MAX_RENDERED_VALUES && (
                <div className={o.valueMore}>
                  + {visibleValues.length - MAX_RENDERED_VALUES} autres — affinez la recherche
                </div>
              )}
            </div>
          ) : (
            <div className={o.valueEmpty}>Aucune valeur</div>
          )}
          <p className={o.hint}>
            Les valeurs affichées tiennent compte des filtres des autres colonnes. Vous pouvez combiner
            plusieurs colonnes.
          </p>
        </section>
      </div>

      {/* FOOTER */}
      <div className={o.floatFooter}>
        <button
          type="button"
          className={o.btnDangerSoft}
          disabled={!isFilterActive}
          onClick={onClearFilter}
        >
          <Trash2 size={14} />
          <span>Supprimer le filtre</span>
        </button>
        <button type="button" className={o.btnPrimary} onClick={onClose}>
          <Check size={14} />
          <span>OK</span>
        </button>
      </div>
    </div>
  );
}