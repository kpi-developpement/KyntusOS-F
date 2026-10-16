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
  ClipboardCheck,
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
  onCopyColumnValues?: (targetColumn?: string) => void;
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
  onCopyColumnValues = () => {},
  onPurgeDoublons = () => {},
  onCoachSync = () => {},
  onBulkEdit = () => {},
  onClearSelection = () => {},
  onResetFilters = () => {},
}: BoardActionsProps) {
  const [bulkCol, setBulkCol] = useState<string>(allowedFields?.[0] || "");
  const [bulkVal, setBulkVal] = useState<string>("");
  const [copyTargetCol, setCopyTargetCol] = useState<string>("EPS_ONLY");

  useEffect(() => {
    if (allowedFields.length > 0 && (!bulkCol || !allowedFields.includes(bulkCol))) {
      setBulkCol(allowedFields[0]);
    }
  }, [allowedFields, bulkCol]);

  // Synchronize copyTargetCol with filterColumn when user selects a column in filter
  useEffect(() => {
    if (filterColumn && filterColumn !== "ALL") {
      setCopyTargetCol(filterColumn);
    } else {
      setCopyTargetCol("EPS_ONLY");
    }
  }, [filterColumn]);

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

  // Build LuxeOptions for Copy Column Selector
  const copyColumnOptions: LuxeOption[] = [
    { value: "EPS_ONLY", label: "⚡ Référence EPS (EPS-...)" },
    ...allColumns.map((col) => ({
      value: col,
      label: `📋 ${col}`,
    })),
  ];

  // Build LuxeOptions for Status
  const statusDropdownOptions: LuxeOption[] = [
    { value: "ALL", label: "Tous les statuts", badge: tasksCount },
    { value: "A_FAIRE", label: "⚪ À Faire" },
    { value: "EN_COURS", label: "🔵 En Cours" },
    { value: "DONE", label: "🟢 Terminé (Pilote)" },
    { value: "VALIDATED", label: "🔒 Validé (Admin Kanban)" },
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

  // Dynamic Label for the Copy Button
  const activeCopyColName =
    copyTargetCol === "EPS_ONLY" ? "EPS" : copyTargetCol.toUpperCase();
  const countToCopy = selectedCount > 0 ? selectedCount : filteredCount;

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
              setColumnExactValue("ALL");
            }}
            searchable={allColumns.length > 5}
            searchPlaceholder="Chercher une colonne..."
            clearable
          />

          {/* 2. CASCADING DISTINCT VALUES DROPDOWN */}
          {filterColumn !== "ALL" && (
            <div className={styles.cascadingDropReveal}>
              <LuxeDropdown
                variant="royal"
                minWidth={250}
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

        {/* Right: Quick Action Buttons (Smart Column Copy + Validation + Purge) */}
        <div className={styles.actionButtonsGroup}>
          <ActionButton
            icon={Copy}
            label={`COPIER (${countToCopy}) ${activeCopyColName}`}
            variant="primary"
            onClick={() => onCopyColumnValues(copyTargetCol)}
          />

          <ActionButton
            icon={CheckCircle2}
            label={
              selectedCount > 0
                ? `TERMINER (${selectedCount})`
                : "TERMINER SÉLECTION"
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

      {/* BOTTOM ROW: MASS EDIT & MULTI-LINE COLUMN COPY BAR (When rows are selected) */}
      {selectedCount > 0 && (
        <div className={styles.massActionBanner}>
          {/* Left: Selected Count + Multi-Line Column Copy Selector */}
          <div className={styles.massLeftZone}>
            <div className={styles.massBadge}>
              <Sparkles size={15} className={styles.spinSlow} />
              <span>{selectedCount} LIGNE(S) COCHÉE(S)</span>
            </div>

            {/* 🔥 EDIT 2: Copier les valeurs d'une colonne précise pour les lignes sélectionnées */}
            <div className={styles.massCopyBox}>
              <LuxeDropdown
                minWidth={200}
                prefixLabel="COPIER COL."
                options={copyColumnOptions}
                value={copyTargetCol}
                onChange={setCopyTargetCol}
                searchable={allColumns.length > 5}
              />
              <button
                type="button"
                className={styles.massCopyTriggerBtn}
                onClick={() => onCopyColumnValues(copyTargetCol)}
                title="Copier les valeurs de cette colonne pour les lignes sélectionnées"
              >
                <ClipboardCheck size={15} />
                <span>COPIER {selectedCount} VALEURS</span>
              </button>
            </div>
          </div>

          {/* Center/Right: Bulk Edit Comment/Analysis on Editable Columns */}
          <form onSubmit={handleBulkSubmit} className={styles.massControls}>
            <div className={styles.massFieldGroup}>
              <Edit3 size={15} className={styles.massIcon} />
              <span className={styles.massLabel}>Modifier :</span>
              {allowedFields.length > 0 ? (
                <LuxeDropdown
                  variant="royal"
                  minWidth={190}
                  options={editableDropdownOptions}
                  value={bulkCol}
                  onChange={setBulkCol}
                />
              ) : (
                <span className={styles.noEditableWarn}>
                  Aucune colonne modifiable
                </span>
              )}
            </div>

            {allowedFields.length > 0 && (
              <>
                {/* Smart Quick-Prefixes compatible with PilotEquipeService.java */}
                <div className={styles.quickTagsGroup}>
                  <button
                    type="button"
                    className={styles.quickTagValide}
                    onClick={() =>
                      setBulkVal((prev) =>
                        prev.toLowerCase().startsWith("valide")
                          ? prev
                          : `VALIDE - ${prev}`
                      )
                    }
                    title="Préfixe reconnu par l'Export Équipe"
                  >
                    + VALIDE
                  </button>
                  <button
                    type="button"
                    className={styles.quickTagContest}
                    onClick={() =>
                      setBulkVal((prev) =>
                        prev.toLowerCase().startsWith("contester")
                          ? prev
                          : `CONTESTER - ${prev}`
                      )
                    }
                    title="Préfixe reconnu par l'Export Équipe"
                  >
                    + CONTESTER
                  </button>
                </div>

                <input
                  type="text"
                  className={styles.massInput}
                  placeholder={`Commentaire / analyse pour les ${selectedCount} lignes...`}
                  value={bulkVal}
                  onChange={(e) => setBulkVal(e.target.value)}
                />
                <button type="submit" className={styles.massApplyBtn}>
                  APPLIQUER ⚡
                </button>
              </>
            )}
          </form>

          <button
            type="button"
            className={styles.massCancelBtn}
            onClick={onClearSelection}
            title="Désélectionner tout"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}