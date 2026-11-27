"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, X } from "lucide-react";

export interface NexusSelectOption {
  value: any;
  label: string;
  badge?: string | number;
  dotColor?: string;
}

interface NexusSelectProps {
  value: any;
  options: NexusSelectOption[];
  onChange: (value: any) => void;
  disabled?: boolean;
  width?: string;
  prefix?: string;
  icon?: React.ReactNode;
  variant?: "default" | "royal" | "sky" | "hero";
  direction?: "down" | "up" | "auto";
  searchable?: boolean;
  placeholder?: string;
}

const NexusSelect = React.memo(({
  value,
  options,
  onChange,
  disabled = false,
  width = "160px",
  prefix,
  icon,
  variant = "default",
  direction = "auto",
  searchable,
  placeholder = "Sélectionner...",
}: NexusSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  }>({ top: 0, left: 0, width: 180, openUpward: false });

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const showSearch = searchable ?? options.length > 6;

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) =>
        String(o.label).toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q)
    );
  }, [options, query]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const estimatedMenuHeight = Math.min(options.length * 38 + (showSearch ? 54 : 14), 310);

    const shouldOpenUp =
      direction === "up" ||
      (direction === "auto" && spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight);

    const menuW = Math.max(rect.width, showSearch ? 220 : 160);
    const leftPos = Math.min(Math.max(12, rect.left), vw - menuW - 12);

    setCoords({
      top: shouldOpenUp ? rect.top - 8 : rect.bottom + 8,
      left: leftPos,
      width: menuW,
      openUpward: shouldOpenUp,
    });
  }, [options.length, direction, showSearch]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setQuery("");
      const idx = options.findIndex((o) => o.value === value);
      setActiveIdx(idx >= 0 ? idx : 0);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    if (showSearch) {
      const t = setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 20);
      return () => clearTimeout(t);
    }
  }, [isOpen, updatePosition, showSearch]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(filteredOptions.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" && filteredOptions[activeIdx]) {
        e.preventDefault();
        onChange(filteredOptions[activeIdx].value);
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => updatePosition();

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition, filteredOptions, activeIdx, onChange]);

  const isRoyal = variant === "royal" || variant === "hero";
  const isSky = variant === "sky";

  const dropdownMenu =
    isOpen && mounted && !disabled
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.openUpward ? "auto" : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : "auto",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              backgroundColor: "#ffffff",
              border: "1px solid #bfdbfe",
              borderRadius: "15px",
              overflow: "hidden",
              boxShadow:
                "0 28px 60px -14px rgba(15, 37, 87, 0.28), 0 8px 22px -8px rgba(37, 99, 235, 0.2), 0 0 0 1px rgba(37, 99, 235, 0.06)",
              zIndex: 2147483647,
              transformOrigin: coords.openUpward ? "bottom center" : "top center",
              animation: "nxDropdownPortalIn 0.18s cubic-bezier(0.22, 1, 0.36, 1) forwards",
              fontFamily: "var(--k-font-display)",
            }}
          >
            <style>{`
              @keyframes nxDropdownPortalIn {
                0%   { opacity: 0; transform: scale(0.96) translateY(-5px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
              }
              .nx-select-list::-webkit-scrollbar { width: 6px; }
              .nx-select-list::-webkit-scrollbar-track { background: #f8fbff; }
              .nx-select-list::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 12px; }
              .nx-select-list::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
            `}</style>

            {showSearch && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 11px",
                  background: "#eff6ff",
                  borderBottom: "1px solid #dbeafe",
                }}
              >
                <Search size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActiveIdx(0);
                  }}
                  placeholder="Filtrer..."
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "#0f2557",
                    fontFamily: "inherit",
                  }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: "none",
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <X size={10} />
                  </button>
                )}
                <span
                  style={{
                    fontSize: "0.64rem",
                    fontWeight: 800,
                    color: "#1d4ed8",
                    background: "#ffffff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 99,
                    padding: "1px 7px",
                  }}
                >
                  {filteredOptions.length}
                </span>
              </div>
            )}

            <div
              className="nx-select-list"
              style={{
                maxHeight: 260,
                overflowY: "auto",
                padding: 6,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isActive = idx === activeIdx;
                  return (
                    <div
                      key={String(opt.value)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "8px 11px",
                        borderRadius: 10,
                        fontSize: "0.79rem",
                        fontWeight: isSelected ? 800 : 600,
                        color: isSelected ? "#1e3a8a" : isActive ? "#1d4ed8" : "#334e7b",
                        backgroundColor: isSelected
                          ? "#dbeafe"
                          : isActive
                          ? "#eff6ff"
                          : "transparent",
                        cursor: "pointer",
                        transition: "all 0.14s ease",
                        userSelect: "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          minWidth: 0,
                          overflow: "hidden",
                        }}
                      >
                        {opt.dotColor && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: "50%",
                              backgroundColor: opt.dotColor,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={opt.label}
                        >
                          {opt.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {opt.badge !== undefined && (
                          <span
                            style={{
                              fontSize: "0.64rem",
                              fontWeight: 800,
                              padding: "1px 7px",
                              borderRadius: 99,
                              background: isSelected ? "#ffffff" : "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check size={14} color="#2563eb" strokeWidth={2.8} />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "16px 10px",
                    textAlign: "center",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    color: "#647a9e",
                  }}
                >
                  Aucune option trouvée
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={triggerRef}
      style={{
        position: "relative",
        width,
        flexShrink: 0,
        zIndex: isOpen ? 50 : 1,
      }}
    >
      <div
        onClick={toggleOpen}
        role="combobox"
        aria-expanded={isOpen}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            toggleOpen();
          }
        }}
        style={{
          height: 38,
          backgroundColor: disabled
            ? "#f1f5f9"
            : isOpen
            ? "#ffffff"
            : isRoyal
            ? "#eff6ff"
            : isSky
            ? "#f8fbff"
            : "#ffffff",
          border: `1px solid ${
            isOpen
              ? "#2563eb"
              : isRoyal
              ? "#bfdbfe"
              : "#cbdcf2"
          }`,
          padding: "0 11px",
          borderRadius: "11px",
          color: disabled ? "#94a3b8" : isRoyal ? "#1e3a8a" : "#0f2557",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--k-font-display)",
          fontSize: "0.79rem",
          fontWeight: 700,
          transition: "all 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
          boxShadow: isOpen
            ? "0 0 0 3.5px rgba(37, 99, 235, 0.14), 0 6px 14px -6px rgba(29, 78, 216, 0.2)"
            : "0 1px 2px rgba(15, 37, 87, 0.04)",
          opacity: disabled ? 0.6 : 1,
          userSelect: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {icon && (
            <span style={{ color: "#2563eb", display: "inline-flex", flexShrink: 0 }}>
              {icon}
            </span>
          )}
          {prefix && (
            <span
              style={{
                flexShrink: 0,
                padding: "2px 7px",
                borderRadius: 10,
                fontSize: "0.6rem",
                fontWeight: 900,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#ffffff",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              }}
            >
              {prefix}
            </span>
          )}
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              color: selectedOption ? "#0f2557" : "#647a9e",
              fontWeight: selectedOption ? 700 : 600,
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={15}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
            color: "#2563eb",
            flexShrink: 0,
          }}
        />
      </div>

      {dropdownMenu}
    </div>
  );
});

NexusSelect.displayName = "NexusSelect";

export default NexusSelect;
