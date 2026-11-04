"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import FloatingLayer from "./FloatingLayer";
import styles from "./LuxeDropdown.module.css";

// ============================================================================
// LUXE DROPDOWN — the menu is rendered in a portal (FloatingLayer), so it is
// never hidden under a card / table / header and never shifted by a parent.
// Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
// ============================================================================

export interface LuxeOption {
  value: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

interface LuxeDropdownProps {
  options: LuxeOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  prefixLabel?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  clearable?: boolean;
  variant?: "default" | "royal" | "hero";
  align?: "left" | "right";
  minWidth?: number | string;
  menuWidth?: number;
}

export default function LuxeDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Sélectionner...",
  prefixLabel,
  icon,
  searchable = false,
  searchPlaceholder = "Rechercher...",
  clearable = false,
  variant = "default",
  align = "left",
  minWidth = 200,
  menuWidth = 280,
}: LuxeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIdx(-1);
      return;
    }
    setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)));
    if (searchable) {
      const id = setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 30);
      return () => clearTimeout(id);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActiveIdx(0), [query]);

  // keep the active option visible
  useEffect(() => {
    if (!isOpen || activeIdx < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, isOpen]);

  const pick = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filteredOptions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filteredOptions[activeIdx];
      if (opt) pick(opt.value);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const variantClass = variant === "royal" ? styles.triggerRoyal : variant === "hero" ? styles.triggerHero : "";

  return (
    <div className={styles.dropdownContainer} style={{ minWidth }}>
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={onKeyDown}
        className={`${styles.trigger} ${variantClass} ${isOpen ? styles.triggerOpen : ""}`}
      >
        <div className={styles.triggerLeft}>
          {icon && <span className={styles.iconWrap}>{icon}</span>}
          {prefixLabel && <span className={styles.prefixLabel}>{prefixLabel}</span>}
          {selectedOption ? (
            <span className={styles.selectedText}>
              {selectedOption.icon && <span className={styles.iconWrap}>{selectedOption.icon}</span>}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            <span className={styles.placeholderText}>{placeholder}</span>
          )}
        </div>

        <div className={styles.triggerRight}>
          {clearable && value && value !== "ALL" && (
            <button
              type="button"
              className={styles.clearMiniBtn}
              onClick={(e) => {
                e.stopPropagation();
                onChange("ALL");
              }}
              title="Réinitialiser"
            >
              <X size={11} />
            </button>
          )}
          <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} />
        </div>
      </div>

      <FloatingLayer
        anchor={triggerRef.current}
        open={isOpen}
        onClose={close}
        width={menuWidth}
        fitAnchor
        maxHeightCap={420}
        align={align}
      >
        <div className={styles.menuPopover} onKeyDown={onKeyDown}>
          {searchable && (
            <div className={styles.searchHeader}>
              <Search size={14} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className={styles.clearMiniBtn} onClick={() => setQuery("")}>
                  <X size={10} />
                </button>
              )}
              <span className={styles.searchCount}>{filteredOptions.length}</span>
            </div>
          )}

          <div ref={listRef} className={styles.optionsList} role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    data-idx={i}
                    role="option"
                    aria-selected={isSelected}
                    className={`${styles.optionItem} ${isSelected ? styles.optionSelected : ""} ${i === activeIdx ? styles.optionActive : ""}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => pick(opt.value)}
                  >
                    <div className={styles.optionLeft}>
                      {opt.icon && <span className={styles.optionIcon}>{opt.icon}</span>}
                      <span className={styles.optionLabel} title={opt.label}>
                        {opt.label}
                      </span>
                    </div>
                    <div className={styles.optionRight}>
                      {opt.badge !== undefined && <span className={styles.optionBadge}>{opt.badge}</span>}
                      {isSelected && <Check size={14} />}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyOptions}>Aucun résultat trouvé</div>
            )}
          </div>
        </div>
      </FloatingLayer>
    </div>
  );
}