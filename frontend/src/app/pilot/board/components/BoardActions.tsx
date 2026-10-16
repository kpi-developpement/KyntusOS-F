"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Trash2,
  CheckCircle2,
  Layers,
  Search,
  Filter,
  Sparkles,
  X,
  Lock,
  Edit3,
} from "lucide-react";
import ActionButton from "../ui/ActionButton";
import styles from "../PilotBoard.module.css";

interface BoardActionsProps {
  tasksCount?: number;
  filteredCount?: number;
  selectedCount?: number;
  allowedFields?: string[];
  allColumns?: string[];
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  filterColumn?: string;
  setFilterColumn?: (val: string) => void;
  statusFilter?: string;
  setStatusFilter?: (val: string) => void;
  onCopyEPS?: () => void;
  onPurgeDoublons?: () => void;
  onCoachSync?: () => void;
  onBulkEdit?: (col: string, val: string) => void;
  onClearSelection?: () => void;
}

export default function BoardActions({
  tasksCount = 0,
  filteredCount = 0,
  selectedCount = 0,
  allowedFields = [],
  allColumns = [],
  searchQuery = "",
  setSearchQuery = () => {},
  filterColumn = "ALL",
  setFilterColumn = () => {},
  statusFilter = "ALL",
  setStatusFilter = () => {},
  onCopyEPS = () => {},
  onPurgeDoublons = () => {},
  onCoachSync = () => {},
  onBulkEdit = () => {},
  onClearSelection = () => {},
}: BoardActionsProps) {
  const [bulkCol, setBulkCol] = useState<string>(allowedFields?.[0] || "");
  const [bulkVal, setBulkVal] = useState<string>("");

  useEffect(() => {
    if (allowedFields.length > 0 && (!bulkCol || !allowedFields.includes(bulkCol))) {
      setBulkCol(allowedFields[0]);
    }
  }, [allowedFields, bulkCol]);

  const TriggerBulkApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCol) return;
    onBulkEdit(bulkCol, bulkVal);
    setBulkVal("");
  };

  return (
    <div className={styles.actionsContainer}>
      {/* TOP ROW: FILTER ENGINE & PRIMARY ACTIONS */}
      <div className={styles.toolbarRow}>
        {/* Left: Dynamic Column Filter Bar */}
        <div className={styles.filterGroup}>
          <div className={styles.filterPill}>
            <Filter size={15} className={styles.filterIcon} />
            <span className={styles.filterLabel}>COLONNE :</span>
            <select
              className={styles.filterSelect}
              value={filterColumn}
              onChange={(e) => setFilterColumn(e.target.value)}
            >
              <option value="ALL">Toutes les colonnes</option>
              <option value="EPS_ONLY">Référence EPS (EPS-...)</option>
              {allColumns.map((col) => (
                <option key={col} value={col}>
                  {allowedFields.includes(col) ? `✍️ ${col} (Analyse)` : `${col}`}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={
                filterColumn === "ALL"
                  ? "Rechercher un EPS, une valeur, un commentaire..."
                  : `Filtrer dans [${filterColumn}]...`
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.filterPill}>
            <span className={styles.filterLabel}>STATUT :</span>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tous ({tasksCount})</option>
              <option value="A_FAIRE">À Faire</option>
              <option value="EN_COURS">En Cours</option>
              <option value="DONE">Terminé (Validé)</option>
            </select>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className={styles.actionButtonsGroup}>
          <ActionButton
            icon={Copy}
            label={
              selectedCount > 0
                ? `COPIER ${selectedCount} EPS`
                : `COPIER ${filteredCount} EPS`
            }
            variant="primary"
            onClick={onCopyEPS}
          />

          <ActionButton
            icon={CheckCircle2}
            label={
              selectedCount > 0
                ? `VALIDER (${selectedCount})`
                : "VALIDER SÉLECTION"
            }
            variant="secondary"
            onClick={onCoachSync}
          />

          <ActionButton
            icon={Trash2}
            label="PURGER DOUBLONS"
            variant="danger"
            onClick={onPurgeDoublons}
          />
        </div>
      </div>

      {/* BOTTOM ROW: MASS EDIT BAR (Shows when rows are selected) */}
      {selectedCount > 0 && (
        <form onSubmit={TriggerBulkApply} className={styles.massActionBanner}>
          <div className={styles.massBadge}>
            <Sparkles size={16} />
            <span>{selectedCount} LIGNES SÉLECTIONNÉES</span>
          </div>

          <div className={styles.massControls}>
            <div className={styles.massFieldGroup}>
              <Edit3 size={14} className={styles.massIcon} />
              <span className={styles.massLabel}>Colonne d&apos;analyse :</span>
              {allowedFields.length > 0 ? (
                <select
                  className={styles.massSelect}
                  value={bulkCol}
                  onChange={(e) => setBulkCol(e.target.value)}
                >
                  {allowedFields.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={styles.noEditableWarn}>
                  Aucune colonne d&apos;analyse ajoutée par l&apos;Admin
                </span>
              )}
            </div>

            {allowedFields.length > 0 && (
              <>
                <input
                  type="text"
                  className={styles.massInput}
                  placeholder={`Saisir le commentaire / analyse pour les ${selectedCount} lignes...`}
                  value={bulkVal}
                  onChange={(e) => setBulkVal(e.target.value)}
                />
                <button type="submit" className={styles.massApplyBtn}>
                  APPLIQUER AUX {selectedCount} LIGNES
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className={styles.massCancelBtn}
            onClick={onClearSelection}
            title="Désélectionner tout"
          >
            <X size={16} />
          </button>
        </form>
      )}
    </div>
  );
}