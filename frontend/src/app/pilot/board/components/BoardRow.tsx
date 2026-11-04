"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { Lock, Copy, Check, CheckCircle2, Clock, CircleDot, ShieldCheck, Sparkles, BookmarkCheck, Maximize2 } from "lucide-react";
import { getDecisionKind } from "../lib/boardUtils";
import styles from "../PilotBoard.module.css";

// ============================================================================
// BOARD ROW — memoized row + editable cell with LOCAL draft state.
// Typing in a cell only re-renders that cell (not the whole table) → smooth.
// ============================================================================

export type RowStatus = "VALIDATED" | "DONE" | "EN_COURS" | "A_FAIRE";

export const rowStatusOf = (task: any, locked: boolean): RowStatus =>
  locked ? "VALIDATED" : ((["DONE", "EN_COURS"].includes(task.status) ? task.status : "A_FAIRE") as RowStatus);

// ---------------------------------------------------------------------------
// STATUS PILL
// ---------------------------------------------------------------------------
const STATUS_CFG: Record<RowStatus, { cls: string; icon: React.ReactNode; label: string; step: string; title: string }> = {
  VALIDATED: { cls: styles.statusLockedAdmin, icon: <ShieldCheck size={13} />, label: "VALIDÉ ADMIN", step: "", title: "Validé par l'Admin dans le Kanban — lecture seule" },
  DONE: { cls: styles.statusDone, icon: <CheckCircle2 size={13} />, label: "TERMINÉ", step: "2/2", title: "Terminé (en attente validation Admin). Cliquer pour rouvrir." },
  EN_COURS: { cls: styles.statusProgress, icon: <Clock size={13} />, label: "EN COURS", step: "1/2", title: "Cliquer pour marquer Terminé" },
  A_FAIRE: { cls: styles.statusTodo, icon: <CircleDot size={13} />, label: "À FAIRE", step: "0/2", title: "Cliquer pour démarrer" },
};

export function StatusPill({ status, onClick, readOnly }: { status: RowStatus; onClick?: () => void; readOnly?: boolean }) {
  const c = STATUS_CFG[status];
  const locked = status === "VALIDATED";
  return (
    <button
      type="button"
      disabled={locked || readOnly}
      onClick={onClick}
      title={readOnly ? c.label : c.title}
      className={`${styles.statusBtn} ${c.cls} ${readOnly ? styles.statusReadOnly : ""}`}
    >
      <span className={styles.statusIcon}>{c.icon}</span>
      <span>{c.label}</span>
      {locked ? <Lock size={11} /> : <i className={styles.statusStep}>{c.step}</i>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// EDITABLE CELL
// ---------------------------------------------------------------------------
interface EditableCellProps {
  taskId: number;
  col: string;
  value: string;
  locked: boolean;
  saving: boolean;
  wrapped: boolean;
  isDropCol: boolean;
  onCommit: (taskId: number, col: string, value: string) => void;
  onOpenPicker: (taskId: number, col: string, anchor: HTMLElement) => void;
}

const EditableCell = memo(function EditableCell({ taskId, col, value, locked, saving, wrapped, isDropCol, onCommit, onOpenPicker }: EditableCellProps) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);

  // external update (bulk edit, picker, live refresh) → sync when not typing
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  const multi = wrapped || value.length > 42;
  const kind = draft.trim() ? getDecisionKind(draft) : "EMPTY";

  const commit = () => {
    focused.current = false;
    if (!locked && draft !== value) onCommit(taskId, col, draft);
  };

  const common = {
    disabled: locked,
    value: draft,
    placeholder: locked ? "Validé par l'Admin" : "Saisir une analyse…",
    onFocus: () => {
      focused.current = true;
    },
    onBlur: commit,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    className: `${multi ? styles.pilotTextarea : styles.pilotInput} ${locked ? styles.pilotInputDisabled : ""}`,
  };

  return (
    <td className={`${styles.tdEditableCell} ${multi ? styles.tdWrappedCell : ""} ${isDropCol ? styles.tdDropCol : ""}`}>
      <div className={styles.pilotInputWrapper} data-kind={kind}>
        {multi ? (
          <textarea
            {...common}
            rows={Math.min(5, Math.max(2, Math.ceil(draft.length / 38)))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
              if (e.key === "Escape") {
                setDraft(value);
                setTimeout(() => (e.target as HTMLTextAreaElement).blur(), 0);
              }
            }}
          />
        ) : (
          <input
            {...common}
            type="text"
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setDraft(value);
                setTimeout(() => (e.target as HTMLInputElement).blur(), 0);
              }
            }}
          />
        )}
        {locked ? (
          <Lock size={13} className={styles.lockedInputIcon} />
        ) : saving ? (
          <Sparkles size={14} className={styles.savedIndicator} />
        ) : (
          <button
            type="button"
            className={styles.cellPickBtn}
            title="Choisir un motif Contestable / Validé"
            onClick={(e) => onOpenPicker(taskId, col, e.currentTarget)}
          >
            <BookmarkCheck size={13} />
          </button>
        )}
      </div>
    </td>
  );
});

// ---------------------------------------------------------------------------
// ROW
// ---------------------------------------------------------------------------
export interface BoardRowProps {
  task: any;
  epsCode: string;
  locked: boolean;
  isSelected: boolean;
  cols: string[];
  isEditable: (col: string) => boolean;
  globalWrap: boolean;
  wrappedSet: Set<string>;
  ruleCols: Set<string>;
  expanded?: Record<string, boolean>;
  copied: boolean;
  savingCol: string | null;
  dropCol: string | null;
  onToggleSelect: (id: number) => void;
  onCopyEps: (id: number, eps: string) => void;
  onStatus: (task: any) => void;
  onCommit: (taskId: number, col: string, value: string) => void;
  onOpenPicker: (taskId: number, col: string, anchor: HTMLElement) => void;
  onToggleExpand: (taskId: number, col: string) => void;
}

function BoardRowImpl({
  task, epsCode, locked, isSelected, cols, isEditable, globalWrap, wrappedSet, ruleCols, expanded, copied, savingCol, dropCol,
  onToggleSelect, onCopyEps, onStatus, onCommit, onOpenPicker, onToggleExpand,
}: BoardRowProps) {
  const status = rowStatusOf(task, locked);
  const dyn = task.dynamicData || {};

  return (
    <tr data-status={status} className={`${styles.trRow} ${isSelected ? styles.trSelected : ""} ${locked ? styles.trLockedAdmin : ""}`}>
      <td className={`${styles.tdCell} ${styles.stickyColCheck}`}>
        <input type="checkbox" className={styles.luxeCheckbox} checked={isSelected} onChange={() => onToggleSelect(task.id)} />
      </td>
      <td className={`${styles.tdCell} ${styles.stickyColEps}`}>
        <div className={styles.epsPillGroup}>
          <span className={styles.epsBadge} title={epsCode}>
            {epsCode}
          </span>
          <button type="button" className={`${styles.copyMiniBtn} ${copied ? styles.copyMiniBtnDone : ""}`} onClick={() => onCopyEps(task.id, epsCode)} title="Copier cet EPS">
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </td>
      <td className={`${styles.tdCell} ${styles.stickyColStatus}`}>
        <StatusPill status={status} onClick={() => onStatus(task)} />
      </td>

      {cols.map((col) => {
        const wrapped = globalWrap || wrappedSet.has(col) || !!expanded?.[col];
        const isDropCol = dropCol === col;

        if (isEditable(col)) {
          return (
            <EditableCell
              key={col}
              taskId={task.id}
              col={col}
              value={String(dyn[col] ?? "")}
              locked={locked}
              saving={savingCol === col}
              wrapped={wrapped}
              isDropCol={isDropCol}
              onCommit={onCommit}
              onOpenPicker={onOpenPicker}
            />
          );
        }

        const raw = dyn[col] !== undefined && dyn[col] !== null && dyn[col] !== "" ? String(dyn[col]) : "";
        const isLong = raw.length > 36;
        return (
          <td
            key={col}
            onClick={isLong ? () => onToggleExpand(task.id, col) : undefined}
            className={[
              styles.tdCell,
              wrapped && styles.tdWrappedCell,
              isLong && styles.tdExpandableCursor,
              ruleCols.has(col) && styles.tdActiveRuleHighlight,
              isDropCol && styles.tdDropCol,
            ]
              .filter(Boolean)
              .join(" ")}
            title={isLong && !wrapped ? `${raw}\n\n(Cliquez pour tout afficher)` : raw}
          >
            {raw ? (
              <div className={wrapped ? styles.wrappedBentoContent : styles.compactCellContent}>
                <span className={styles.lockedValue}>{raw}</span>
                {isLong && !wrapped && (
                  <span className={styles.expandCellBadge}>
                    <Maximize2 size={10} />
                  </span>
                )}
              </div>
            ) : (
              <span className={styles.emptyDash}>—</span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

const BoardRow = memo(BoardRowImpl);
export default BoardRow;