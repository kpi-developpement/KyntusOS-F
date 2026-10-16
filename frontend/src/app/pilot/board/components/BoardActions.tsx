"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
  Sparkles,
  X,
  Edit3,
  ListFilter,
  RotateCcw,
} from "lucide-react";
import ActionButton from "../ui/ActionButton";
import LuxeDropdown, { LuxeOption } from "../ui/LuxeDropdown";
import styles from "../PilotBoard.module.css";

interface BoardActionsProps {
  tasksCount?: number;
  filteredCount?: number;
  selectedCount?: number;
  allowedFields?: string[];
  allColumns?: string[];
  columnDistinctOptions?: LuxeOption[];
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  filterColumn?: string;
  setFilterColumn?: (val: string) => void;
  columnExactValue?: string;
  setColumnExactValue?: (val: string) => void;
  statusFilter?: string;
  setStatusFilter?: (val: string) => void;
  onCopyEPS?: () => void;
  onPurgeDoublons?: () => void;
  onCoachSync?: () => void;
  onBulkEdit?: (col: string, val: string) => void;
  onClearSelection?: () => void;
  onResetFilters?: () => void;
}

export default function BoardActions({
  tasksCount = 0,
  filteredCount = 0,
  selectedCount = 0,
  allowedFields = [],
  allColumns = [],
  columnDistinctOptions = [],
  searchQuery = "",
  setSearchQuery = () => {},
  filterColumn = "ALL",
  setFilterColumn = () => {},
  columnExactValue = "ALL",
  setColumnExactValue = () => {},
  statusFilter = "ALL",
  setStatusFilter = () => {},
  onCopyEPS = () => {},
  onPurgeDoublons = () => {},
  onCoachSync = () => {},
  onBulkEdit = () => {},
  onClearSelection = () => {},
  onResetFilters = () => {},
}: BoardActionsProps) {
  const [bulkCol, setBulkCol] = useState<string>(allowedFields?.[0] || "");
  const [bulkVal, setBulkVal] = useState<string>("");

  useEffect(() => {
    if (allowedFields.length > 0 && (!bulkCol || !allowedFields.includes(bulkCol))) {
      setBulkCol(allowedFields[0]);
    }
  }, [allowedFields, bulkCol]);

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCol) return;
    onBulkEdit(bulkCol, bulkVal);
    setBulkVal("");
  };

  // Build LuxeOptions for Columns
  const columnDropdownOptions: LuxeOption[] = [
    { value: "ALL", label: "🌐 Toutes les colonnes" },
    { value: "EPS_ONLY", label: "⚡ Référence EPS (EPS-...)" },
    ...allColumns.map((col) => ({
      value: col,
      label: allowedFields.includes(col) ? `✍️ ${col}` : `📄 ${col}`,
      badge: allowedFields.includes(col) ? "ANALYSE" : undefined,
    })),
  ];

  // Build LuxeOptions for Status
  const statusDropdownOptions: LuxeOption[] = [
    { value: "ALL", label: "Tous les statuts", badge: tasksCount },
    { value: "A_FAIRE", label: "⚪ À Faire" },
    { value: "EN_COURS", label: "🔵 En Cours" },
    { value: "DONE", label: "🟢 Terminé (Validé)" },
  ];

  // Build LuxeOptions for Bulk Editable Columns
  const editableDropdownOptions: LuxeOption[] = allowedFields.map((f) => ({
    value: f,
    label: `✍️ ${f}`,
  }));

  const hasActiveFilters =
    filterColumn !== "ALL" ||
    columnExactValue !== "ALL" ||
    statusFilter !== "ALL" ||
    searchQuery.trim() !== "";

  return (
    <div className={styles.actionsContainer}>
      {/* TOP ROW: LUXE FILTER ENGINE & PRIMARY ACTIONS */}
      <div className={styles.toolbarRow}>
        <div className={styles.filterGroup}>
          {/* 1. COLUMN SELECTOR DROPDOWN */}
          <LuxeDropdown
            minWidth={230}
            icon={<Filter size={15} />}
            prefixLabel="COLONNE"
            options={columnDropdownOptions}
            value={filterColumn}
            onChange={(newCol) => {
              setFilterColumn(newCol);
              setColumnExactValue("ALL"); // Reset specific value when switching column
            }}
            searchable={allColumns.length > 5}
            searchPlaceholder="Chercher une colonne..."
            clearable
          />

          {/* 2. 🔥 CASCADING DISTINCT VALUES DROPDOWN (Appears when a specific column is selected) */}
          {filterColumn !== "ALL" && (
            <div className={styles.cascadingDropReveal}>
              <LuxeDropdown
                variant="royal"
                minWidth={260}
                icon={<ListFilter size={15} />}
                prefixLabel="VALEUR"
                placeholder={`Choisir dans ${filterColumn}...`}
                options={columnDistinctOptions}
                value={columnExactValue}
                onChange={setColumnExactValue}
                searchable
                searchPlaceholder={`Chercher une valeur de ${filterColumn}...`}
                clearable
              />
            </div>
          )}

          {/* 3. INSTANT TEXT SEARCH */}
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={
                filterColumn === "ALL"
                  ? "Recherche globale (EPS, texte, commentaire)..."
                  : `Affiner par texte dans [${filterColumn}]...`
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
                <X size={13} />
              </button>
            )}
          </div>

          {/* 4. STATUS DROPDOWN */}
          <LuxeDropdown
            minWidth={195}
            prefixLabel="STATUT"
            options={statusDropdownOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
          />

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetFiltersBtn}
              onClick={onResetFilters}
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw size={14} />
              <span>RESET</span>
            </button>
          )}
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

      {/* BOTTOM ROW: MASS EDIT BAR (Shows with smooth animation when rows are selected) */}
      {selectedCount > 0 && (
        <form onSubmit={handleBulkSubmit} className={styles.massActionBanner}>
          <div className={styles.massBadge}>
            <Sparkles size={16} className={styles.spinSlow} />
            <span>{selectedCount} LIGNES SÉLECTIONNÉES</span>
          </div>

          <div className={styles.massControls}>
            <div className={styles.massFieldGroup}>
              <Edit3 size={15} className={styles.massIcon} />
              <span className={styles.massLabel}>Cible :</span>
              {allowedFields.length > 0 ? (
                <LuxeDropdown
                  variant="royal"
                  minWidth={210}
                  options={editableDropdownOptions}
                  value={bulkCol}
                  onChange={setBulkCol}
                />
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
                  placeholder={`Saisir le commentaire / analyse à appliquer aux ${selectedCount} lignes...`}
                  value={bulkVal}
                  onChange={(e) => setBulkVal(e.target.value)}
                />
                <button type="submit" className={styles.massApplyBtn}>
                  APPLIQUER AUX {selectedCount} LIGNES ⚡
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