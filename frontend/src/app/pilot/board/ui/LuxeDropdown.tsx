"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import styles from "./LuxeDropdown.module.css";

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
}: LuxeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen, searchable]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  const variantClass =
    variant === "royal"
      ? styles.triggerRoyal
      : variant === "hero"
      ? styles.triggerHero
      : "";

  return (
    <div
      ref={containerRef}
      className={`${styles.dropdownContainer} ${
        isOpen ? styles.dropdownContainerOpen : ""
      }`}
      style={{ minWidth }}
    >
      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${styles.trigger} ${variantClass} ${
          isOpen ? styles.triggerOpen : ""
        }`}
      >
        <div className={styles.triggerLeft}>
          {icon && <span className={styles.iconWrap}>{icon}</span>}
          {prefixLabel && <span className={styles.prefixLabel}>{prefixLabel}</span>}
          {selectedOption ? (
            <span className={styles.selectedText}>
              {selectedOption.icon && (
                <span className={styles.iconWrap}>{selectedOption.icon}</span>
              )}
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
          <ChevronDown
            size={16}
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
          />
        </div>
      </div>

      {/* Floating 3D Popover Menu */}
      {isOpen && (
        <div
          className={`${styles.menuPopover} ${
            align === "right" ? styles.menuAlignRight : ""
          }`}
        >
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
                onClick={(e) => e.stopPropagation()}
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearMiniBtn}
                  onClick={() => setQuery("")}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          <div className={styles.optionsList}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    className={`${styles.optionItem} ${
                      isSelected ? styles.optionSelected : ""
                    }`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                  >
                    <div className={styles.optionLeft}>
                      {opt.icon && (
                        <span className={styles.optionIcon}>{opt.icon}</span>
                      )}
                      <span>{opt.label}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {opt.badge !== undefined && (
                        <span className={styles.optionBadge}>{opt.badge}</span>
                      )}
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
      )}
    </div>
  );
}