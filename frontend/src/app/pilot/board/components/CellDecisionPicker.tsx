"use client";

import React, { useMemo, useState } from "react";
import { Search, X, BookmarkCheck, AlertTriangle, CheckCircle2, Settings2, Eraser } from "lucide-react";
import { DecisionChoice, getDecisionKind } from "../lib/boardUtils";
import o from "../ui/BoardOverlays.module.css";

// Quick picker opened from one editable cell: 1 click = value written in this cell.
interface CellDecisionPickerProps {
  column: string;
  eps: string;
  currentValue: string;
  choices: DecisionChoice[];
  onPick: (value: string) => void;
  onClear: () => void;
  onManage: () => void;
  onClose: () => void;
}

export default function CellDecisionPicker({
  column,
  eps,
  currentValue,
  choices,
  onPick,
  onClear,
  onManage,
  onClose,
}: CellDecisionPickerProps) {
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? choices.filter((c) => c.label.toLowerCase().includes(s)) : choices;
  }, [choices, q]);

  return (
    <div className={o.floatPanel}>
      <div className={o.floatHeader}>
        <div className={o.floatTitle}>
          <BookmarkCheck size={14} />
          <span>
            {column} · <small>{eps}</small>
          </span>
        </div>
        <button type="button" className={o.iconGhostBtn} onClick={onClose}>
          <X size={15} />
        </button>
      </div>

      <div className={o.floatBody}>
        <div className={o.inputWrap}>
          <Search size={13} className={o.inputIcon} />
          <input
            autoFocus
            className={o.input}
            placeholder="Chercher un motif..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && visible[0]) onPick(visible[0].label);
            }}
          />
        </div>

        <div className={o.pickList}>
          {visible.map((c) => {
            const kind = getDecisionKind(c.label);
            const isCurrent = c.label.trim() === currentValue.trim();
            return (
              <button
                key={c.id}
                type="button"
                className={`${o.pickRow} ${isCurrent ? o.pickRowCurrent : ""}`}
                onClick={() => onPick(c.label)}
                title={c.label}
              >
                <span
                  className={
                    kind === "VALIDE" ? o.pickIconValide : kind === "CONTESTABLE" ? o.pickIconContest : o.pickIconOther
                  }
                >
                  {kind === "VALIDE" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                </span>
                <span className={o.pickText}>{c.label}</span>
              </button>
            );
          })}
          {visible.length === 0 && <div className={o.valueEmpty}>Aucun motif</div>}
        </div>
      </div>

      <div className={o.floatFooter}>
        <button type="button" className={o.btnDangerSoft} onClick={onClear} disabled={!currentValue}>
          <Eraser size={13} />
          <span>Vider la case</span>
        </button>
        <button type="button" className={o.btnGhostSm} onClick={onManage}>
          <Settings2 size={13} />
          <span>Gérer la liste</span>
        </button>
      </div>
    </div>
  );
}