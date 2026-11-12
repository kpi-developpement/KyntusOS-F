"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookmarkCheck,
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Zap,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Save,
  Copy,
} from "lucide-react";
import LuxeModal from "../ui/LuxeModal";
import {
  DecisionChoice,
  DecisionKind,
  getDecisionKind,
  makeId,
} from "../lib/boardUtils";
import o from "../ui/BoardOverlays.module.css";

interface DecisionLibraryModalProps {
  open: boolean;
  onClose: () => void;
  choices: DecisionChoice[];
  onChoicesChange: (next: DecisionChoice[]) => void;
  onResetDefaults: () => void;
  editableColumns: string[];
  defaultColumn?: string;
  selectedCount: number;
  unlockedSelectedCount: number;
  onApply: (column: string, value: string) => void | Promise<void>;
}

type KindFilter = "ALL" | DecisionKind;

export default function DecisionLibraryModal({
  open,
  onClose,
  choices,
  onChoicesChange,
  onResetDefaults,
  editableColumns,
  defaultColumn,
  selectedCount,
  unlockedSelectedCount,
  onApply,
}: DecisionLibraryModalProps) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [targetCol, setTargetCol] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [newChoice, setNewChoice] = useState("");
  const [applying, setApplying] = useState(false);

  // Reset target column when opened
  useEffect(() => {
    if (!open) return;
    const fallback = editableColumns[0] || "";
    setTargetCol(defaultColumn && editableColumns.includes(defaultColumn) ? defaultColumn : fallback);
  }, [open, defaultColumn, editableColumns]);

  const counts = useMemo(() => {
    const c = { ALL: choices.length, VALIDE: 0, CONTESTABLE: 0, AUTRE: 0 };
    choices.forEach((ch) => {
      c[getDecisionKind(ch.label)]++;
    });
    return c;
  }, [choices]);

  const visibleChoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return choices.filter((ch) => {
      if (kindFilter !== "ALL" && getDecisionKind(ch.label) !== kindFilter) return false;
      if (q && !ch.label.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [choices, query, kindFilter]);

  const activeChoice = choices.find((c) => c.id === activeId) || null;
  const draftDiffers = activeChoice ? draftValue.trim() !== activeChoice.label.trim() : draftValue.trim() !== "";

  const pickChoice = (ch: DecisionChoice) => {
    setActiveId(ch.id);
    setDraftValue(ch.label);
  };

  const startEdit = (ch: DecisionChoice) => {
    setEditingId(ch.id);
    setEditingText(ch.label);
  };

  const saveEdit = () => {
    const txt = editingText.trim();
    if (!editingId || !txt) return;
    onChoicesChange(choices.map((c) => (c.id === editingId ? { ...c, label: txt } : c)));
    if (activeId === editingId) setDraftValue(txt);
    setEditingId(null);
  };

  const removeChoice = (id: string) => {
    onChoicesChange(choices.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setDraftValue("");
    }
  };

  const duplicateChoice = (ch: DecisionChoice) => {
    const idx = choices.findIndex((c) => c.id === ch.id);
    const copy = { id: makeId(), label: `${ch.label} (copie)` };
    const next = [...choices];
    next.splice(idx + 1, 0, copy);
    onChoicesChange(next);
    startEdit(copy);
  };

  const addChoice = () => {
    const txt = newChoice.trim();
    if (!txt) return;
    const created = { id: makeId(), label: txt };
    onChoicesChange([...choices, created]);
    setNewChoice("");
    pickChoice(created);
  };

  const saveDraftAsChoice = () => {
    const txt = draftValue.trim();
    if (!txt) return;
    if (activeChoice) {
      onChoicesChange(choices.map((c) => (c.id === activeChoice.id ? { ...c, label: txt } : c)));
    } else {
      const created = { id: makeId(), label: txt };
      onChoicesChange([...choices, created]);
      setActiveId(created.id);
    }
  };

  const canApply =
    !!targetCol && draftValue.trim() !== "" && unlockedSelectedCount > 0 && !applying;

  const handleApply = async () => {
    if (!canApply) return;
    setApplying(true);
    try {
      await onApply(targetCol, draftValue.trim());
      // Le motif choisi ne reste pas sélectionné pour la prochaine ouverture
      setActiveId(null);
      setDraftValue("");
      onClose();
    } finally {
      setApplying(false);
    }
  };

  const kindBadge = (label: string) => {
    const k = getDecisionKind(label);
    if (k === "VALIDE")
      return (
        <span className={`${o.kindBadge} ${o.kindValide}`}>
          <CheckCircle2 size={11} /> Validé
        </span>
      );
    if (k === "CONTESTABLE")
      return (
        <span className={`${o.kindBadge} ${o.kindContest}`}>
          <AlertTriangle size={11} /> Contestable
        </span>
      );
    return <span className={`${o.kindBadge} ${o.kindOther}`}>Autre</span>;
  };

  return (
    <LuxeModal
      open={open}
      onClose={onClose}
      width={1080}
      icon={<BookmarkCheck size={20} />}
      title="Bibliothèque Contester / Valider"
      subtitle="Choisissez un motif, modifiez-le si besoin, puis appliquez-le à toutes les lignes cochées."
      footer={
        <>
          <div className={o.footerInfo}>
            {selectedCount === 0 ? (
              <span className={o.footerWarn}>
                <AlertTriangle size={14} /> Aucune ligne cochée — cochez des lignes dans le tableau pour appliquer.
              </span>
            ) : (
              <span>
                <b>{unlockedSelectedCount}</b> ligne(s) modifiable(s) sur {selectedCount} cochée(s)
                {selectedCount - unlockedSelectedCount > 0 && (
                  <em> · {selectedCount - unlockedSelectedCount} verrouillée(s) Admin ignorée(s)</em>
                )}
              </span>
            )}
          </div>
          <div className={o.footerActions}>
            <button type="button" className={o.btnGhost} onClick={onClose}>
              Annuler
            </button>
            <button type="button" className={o.btnPrimary} disabled={!canApply} onClick={handleApply}>
              <Zap size={15} />
              <span>
                {applying ? "Application..." : `Appliquer à ${unlockedSelectedCount} ligne(s)`}
              </span>
            </button>
          </div>
        </>
      }
    >
      <div className={o.decisionLayout}>
        {/* LEFT: LIBRARY */}
        <div className={o.decisionLibrary}>
          <div className={o.libraryToolbar}>
            <div className={o.inputWrap} style={{ flex: 1 }}>
              <Search size={14} className={o.inputIcon} />
              <input
                className={o.input}
                placeholder="Chercher un motif (PTO, PBO, Façade, TELENCO...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className={o.inputClear} onClick={() => setQuery("")}>
                  <X size={11} />
                </button>
              )}
            </div>
            <button
              type="button"
              className={o.btnGhostSm}
              onClick={() => {
                if (window.confirm("Remettre la liste par défaut ? Vos modifications seront perdues.")) {
                  onResetDefaults();
                  setActiveId(null);
                  setDraftValue("");
                }
              }}
              title="Restaurer la liste par défaut"
            >
              <RotateCcw size={13} />
              <span>Défaut</span>
            </button>
          </div>

          <div className={o.segmented}>
            {(
              [
                { id: "ALL", label: "Tous" },
                { id: "CONTESTABLE", label: "Contestable" },
                { id: "VALIDE", label: "Validé" },
                { id: "AUTRE", label: "Autres" },
              ] as { id: KindFilter; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${o.segment} ${kindFilter === t.id ? o.segmentActive : ""}`}
                onClick={() => setKindFilter(t.id)}
              >
                {t.label}
                <span className={o.segmentCount}>{counts[t.id]}</span>
              </button>
            ))}
          </div>

          <div className={o.choiceList}>
            {visibleChoices.length === 0 && <div className={o.valueEmpty}>Aucun motif trouvé</div>}

            {visibleChoices.map((ch) => {
              const isActive = ch.id === activeId;
              const isEditing = ch.id === editingId;
              const kind = getDecisionKind(ch.label);

              if (isEditing) {
                return (
                  <div key={ch.id} className={`${o.choiceCard} ${o.choiceCardEditing}`}>
                    <textarea
                      autoFocus
                      className={o.textarea}
                      rows={2}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          saveEdit();
                        }
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setEditingId(null);
                        }
                      }}
                    />
                    <div className={o.choiceEditActions}>
                      <button type="button" className={o.btnGhostSm} onClick={() => setEditingId(null)}>
                        Annuler
                      </button>
                      <button type="button" className={o.btnPrimarySm} onClick={saveEdit}>
                        <Check size={13} /> Enregistrer
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={ch.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => pickChoice(ch)}
                  onDoubleClick={() => startEdit(ch)}
                  onKeyDown={(e) => e.key === "Enter" && pickChoice(ch)}
                  className={`${o.choiceCard} ${isActive ? o.choiceCardActive : ""} ${
                    kind === "VALIDE" ? o.choiceValide : kind === "CONTESTABLE" ? o.choiceContest : ""
                  }`}
                >
                  <span className={o.radio}>{isActive && <span className={o.radioDot} />}</span>
                  <div className={o.choiceMain}>
                    {kindBadge(ch.label)}
                    <span className={o.choiceText}>{ch.label}</span>
                  </div>
                  <div className={o.choiceActions} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={o.iconGhostBtn} title="Modifier" onClick={() => startEdit(ch)}>
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className={o.iconGhostBtn}
                      title="Dupliquer"
                      onClick={() => duplicateChoice(ch)}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      className={`${o.iconGhostBtn} ${o.iconDanger}`}
                      title="Supprimer"
                      onClick={() => removeChoice(ch.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={o.addChoiceRow}>
            <input
              className={o.inputPlain}
              placeholder="Nouveau motif (ex : Contestable - ...)"
              value={newChoice}
              onChange={(e) => setNewChoice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addChoice()}
            />
            <button type="button" className={o.btnPrimarySm} onClick={addChoice} disabled={!newChoice.trim()}>
              <Plus size={14} /> Ajouter
            </button>
          </div>
        </div>

        {/* RIGHT: APPLY PANEL */}
        <div className={o.decisionApply}>
          <div className={o.applyBlock}>
            <span className={o.sectionLabel}>1 · Colonne d&apos;analyse cible</span>
            {editableColumns.length === 0 ? (
              <div className={o.footerWarn}>Aucune colonne modifiable dans cette mission.</div>
            ) : (
              <div className={o.chipWrap}>
                {editableColumns.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${o.colChip} ${targetCol === c ? o.colChipActive : ""}`}
                    onClick={() => setTargetCol(c)}
                  >
                    <Edit3 size={12} />
                    <span>{c}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={o.applyBlock}>
            <div className={o.sectionHead}>
              <span className={o.sectionLabel}>2 · Valeur à appliquer (modifiable)</span>
              {draftValue && kindBadge(draftValue)}
            </div>
            <textarea
              className={`${o.textarea} ${o.textareaLarge}`}
              rows={5}
              placeholder="Cliquez sur un motif à gauche, ou écrivez directement ici..."
              value={draftValue}
              onChange={(e) => setDraftValue(e.target.value)}
            />
            <div className={o.applyHelpers}>
              <button
                type="button"
                className={o.btnGhostSm}
                disabled={!draftValue.trim() || !draftDiffers}
                onClick={saveDraftAsChoice}
                title={activeChoice ? "Mettre à jour le motif sélectionné" : "Ajouter à la bibliothèque"}
              >
                <Save size={13} />
                <span>{activeChoice ? "Mettre à jour le motif" : "Ajouter à la bibliothèque"}</span>
              </button>
              {draftValue && (
                <button
                  type="button"
                  className={o.btnGhostSm}
                  onClick={() => {
                    setDraftValue("");
                    setActiveId(null);
                  }}
                >
                  <X size={13} />
                  <span>Vider</span>
                </button>
              )}
            </div>
          </div>

          <div className={o.applyPreview}>
            <span className={o.sectionLabel}>Aperçu</span>
            <p>
              La colonne <b>{targetCol || "—"}</b> de <b>{unlockedSelectedCount}</b> ligne(s) recevra :
            </p>
            <div className={o.previewValue}>{draftValue.trim() || <em>— aucune valeur —</em>}</div>
          </div>

          <p className={o.hint}>
            Astuce : double-cliquez sur un motif pour le modifier. La bibliothèque est gardée sur ce poste.
          </p>
        </div>
      </div>
    </LuxeModal>
  );
}