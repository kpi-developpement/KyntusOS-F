"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface CyberSelectOption {
  value: any;
  label: string;
}

interface CyberSelectProps {
  value: any;
  options: CyberSelectOption[];
  onChange: (value: any) => void;
  disabled?: boolean;
  width?: string;
  variant?: "default" | "purple" | "green" | "matrix" | "sky";
  direction?: "down" | "up" | "auto";
}

const CyberSelect = React.memo(({
  value,
  options,
  onChange,
  disabled = false,
  width = "140px",
  variant = "default",
  direction = "auto"
}: CyberSelectProps) => {
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

  // Palette Dark Mode adapted for #02040a background
  const theme = useMemo(() => {
    if (variant === "green" || variant === "matrix") {
      return {
        accent: "#10b981",
        accentDark: "#34d399",
        bgActive: "rgba(16, 185, 129, 0.15)",
        borderActive: "#10b981",
        ring: "rgba(16, 185, 129, 0.2)"
      };
    }
    if (variant === "purple") {
      return {
        accent: "#a855f7",
        accentDark: "#c084fc",
        bgActive: "rgba(168, 85, 247, 0.15)",
        borderActive: "#a855f7",
        ring: "rgba(168, 85, 247, 0.2)"
      };
    }
    return {
      accent: "#38bdf8",
      accentDark: "#7dd3fc",
      bgActive: "rgba(56, 189, 248, 0.15)",
      borderActive: "#38bdf8",
      ring: "rgba(56, 189, 248, 0.2)"
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
            className="cyber-select-portal-menu"
            style={{
              position: "fixed",
              top: coords.openUpward ? "auto" : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : "auto",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              backgroundColor: "rgba(11, 15, 25, 0.98)", // Deep dark
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${theme.borderActive}`,
              borderRadius: "12px",
              maxHeight: "250px",
              overflowY: "auto",
              padding: "6px",
              boxShadow:
                "0 20px 45px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
              zIndex: 2147483647,
              transformOrigin: coords.openUpward ? "bottom center" : "top center",
              animation: "cyberDropdownPortalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <style>{`
              @keyframes cyberDropdownPortalIn {
                0% {
                  opacity: 0;
                  transform: scale(0.95) translateY(-6px);
                }
                100% {
                  opacity: 1;
                  transform: scale(1) translateY(0);
                }
              }
              .cyber-select-portal-menu::-webkit-scrollbar {
                width: 5px;
              }
              .cyber-select-portal-menu::-webkit-scrollbar-track {
                background: rgba(15, 23, 42, 0.5);
                border-radius: 8px;
              }
              .cyber-select-portal-menu::-webkit-scrollbar-thumb {
                background: rgba(56, 189, 248, 0.3);
                border-radius: 8px;
              }
              .cyber-select-portal-menu::-webkit-scrollbar-thumb:hover {
                background: #38bdf8;
              }
              .cyber-select-option {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.55rem 0.75rem;
                border-radius: 8px;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 0.82rem;
                cursor: pointer;
                transition: all 0.16s cubic-bezier(0.16, 1, 0.3, 1);
                user-select: none;
                margin-bottom: 2px;
              }
              .cyber-select-option:last-child {
                margin-bottom: 0;
              }
              .cyber-select-option:hover {
                background-color: rgba(56, 189, 248, 0.15);
                color: #e0f2fe;
                transform: translateX(3px);
              }
            `}</style>
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={String(opt.value)}
                  className="cyber-select-option"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    backgroundColor: isSelected ? theme.bgActive : "transparent",
                    color: isSelected ? theme.accentDark : "#94a3b8",
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
          backgroundColor: disabled ? "rgba(15, 23, 42, 0.4)" : isOpen ? "rgba(15, 23, 42, 0.9)" : "rgba(15, 23, 42, 0.6)",
          border: `1px solid ${isOpen ? theme.borderActive : "rgba(148, 163, 184, 0.3)"}`,
          padding: "0.52rem 0.8rem",
          borderRadius: "10px",
          color: disabled ? "#475569" : isOpen ? theme.accentDark : "#f8fafc",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "0.82rem",
          fontWeight: 600,
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: isOpen
            ? `0 0 0 3.5px ${theme.ring}, 0 4px 12px rgba(0, 0, 0, 0.3)`
            : "0 1px 2px rgba(0, 0, 0, 0.2)",
          opacity: disabled ? 0.6 : 1,
          userSelect: "none"
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
            e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.8)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.3)";
            e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.6)";
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

CyberSelect.displayName = "CyberSelect";

export default CyberSelect;