"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface TissueSelectOption {
  value: any;
  label: string;
}

interface TissueSelectProps {
  value: any;
  options: TissueSelectOption[];
  onChange: (value: any) => void;
  disabled?: boolean;
  width?: string;
  variant?: "emerald" | "teal" | "amber" | "violet";
  direction?: "down" | "up" | "auto";
}

const TissueSelect = React.memo(({
  value,
  options,
  onChange,
  disabled = false,
  width = "140px",
  variant = "emerald",
  direction = "auto"
}: TissueSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  }>({ top: 0, left: 0, width: 140, openUpward: false });

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? value,
    [options, value]
  );

  const theme = useMemo(() => {
    if (variant === "teal") {
      return {
        accent: "#2dd4bf",
        accentBright: "#99f6e4",
        bgActive: "rgba(20, 184, 166, 0.18)",
        borderActive: "#14b8a6",
        ring: "rgba(20, 184, 166, 0.22)"
      };
    }
    if (variant === "amber") {
      return {
        accent: "#fbbf24",
        accentBright: "#fde68a",
        bgActive: "rgba(245, 158, 11, 0.18)",
        borderActive: "#f6a723",
        ring: "rgba(245, 158, 11, 0.22)"
      };
    }
    if (variant === "violet") {
      return {
        accent: "#c084fc",
        accentBright: "#e9d5ff",
        bgActive: "rgba(168, 85, 247, 0.18)",
        borderActive: "#8f24f5",
        ring: "rgba(168, 85, 247, 0.22)"
      };
    }
    return {
      accent: "#34d399",
      accentBright: "#a7f3d0",
      bgActive: "rgba(16, 185, 129, 0.18)",
      borderActive: "#10b981",
      ring: "rgba(16, 185, 129, 0.22)"
    };
  }, [variant]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const estimatedMenuHeight = Math.min(options.length * 40 + 16, 260);

    const shouldOpenUp =
      direction === "up" ||
      (direction === "auto" && spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight);

    setCoords({
      top: shouldOpenUp ? rect.top - 8 : rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 140),
      openUpward: shouldOpenUp
    });
  }, [options.length, direction]);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

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
      if (e.key === "Escape") setIsOpen(false);
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

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
  }, [isOpen, updatePosition]);

  const dropdownMenu =
    isOpen && mounted && !disabled
      ? createPortal(
          <div
            ref={menuRef}
            className="tissue-select-portal-menu"
            style={{
              position: "fixed",
              top: coords.openUpward ? "auto" : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : "auto",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              backgroundColor: "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(22px)",
              WebkitBackdropFilter: "blur(22px)",
              border: `1px solid ${theme.borderActive}`,
              borderRadius: "13px",
              maxHeight: "250px",
              overflowY: "auto",
              padding: "6px",
              boxShadow:
                "0 22px 48px -10px rgba(15, 30, 61, 0.18), 0 0 24px -6px rgba(16, 185, 129, 0.15)",
              zIndex: 2147483647,
              transformOrigin: coords.openUpward ? "bottom center" : "top center",
              animation: "tissueDropdownIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <style>{`
              @keyframes tissueDropdownIn {
                0% { opacity: 0; transform: scale(0.95) translateY(-6px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
              }
              .tissue-select-portal-menu::-webkit-scrollbar { width: 5px; }
              .tissue-select-portal-menu::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.85); border-radius: 8px; }
              .tissue-select-portal-menu::-webkit-scrollbar-thumb { background: rgba(52, 211, 153, 0.35); border-radius: 8px; }
              .tissue-select-portal-menu::-webkit-scrollbar-thumb:hover { background: #34d399; }
              .tissue-select-option {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.55rem 0.78rem;
                border-radius: 9px;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 0.82rem;
                cursor: pointer;
                transition: all 0.16s cubic-bezier(0.16, 1, 0.3, 1);
                user-select: none;
                margin-bottom: 2px;
              }
              .tissue-select-option:last-child { margin-bottom: 0; }
              .tissue-select-option:hover {
                background-color: rgba(16, 185, 129, 0.16);
                color: #0f1e3d;
                transform: translateX(3px);
              }
            `}</style>
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={String(opt.value)}
                  className="tissue-select-option"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    backgroundColor: isSelected ? theme.bgActive : "transparent",
                    color: isSelected ? theme.accentBright : "#475569",
                    fontWeight: isSelected ? 700 : 500
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check
                      size={14}
                      color={theme.accent}
                      style={{ flexShrink: 0, marginLeft: "8px", strokeWidth: 2.8 }}
                    />
                  )}
                </div>
              );
            })}
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
        zIndex: isOpen ? 50 : 1
      }}
    >
      <div
        onClick={toggleOpen}
        style={{
          backgroundColor: disabled ? "rgba(255, 255, 255, 0.7)" : isOpen ? "rgba(255, 255, 255, 0.92)" : "rgba(255, 255, 255, 0.92)",
          border: `1px solid ${isOpen ? theme.borderActive : "rgba(52, 211, 153, 0.22)"}`,
          padding: "0.52rem 0.82rem",
          borderRadius: "11px",
          color: disabled ? "#475569" : isOpen ? theme.accentBright : "#0f1e3d",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "0.82rem",
          fontWeight: 600,
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: isOpen
            ? `0 0 0 3.5px ${theme.ring}, 0 4px 14px rgba(0, 0, 0, 0.35)`
            : "0 1px 2px rgba(0, 0, 0, 0.25)",
          opacity: disabled ? 0.6 : 1,
          userSelect: "none"
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.5)";
            e.currentTarget.style.backgroundColor = "rgba(6, 24, 22, 0.88)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.22)";
            e.currentTarget.style.backgroundColor = "rgba(6, 20, 19, 0.7)";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "0.01em"
          }}
        >
          {displayLabel || "SELECT..."}
        </span>
        <ChevronDown
          size={15}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            color: isOpen ? theme.accent : "#64748b",
            marginLeft: "8px",
            flexShrink: 0
          }}
        />
      </div>

      {dropdownMenu}
    </div>
  );
});

TissueSelect.displayName = "TissueSelect";

export default TissueSelect;
