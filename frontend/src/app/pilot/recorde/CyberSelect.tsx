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

  // Palette 70% White / 30% Blue
  const theme = useMemo(() => {
    if (variant === "green" || variant === "matrix" || variant === "sky") {
      return {
        accent: "#0284c7",
        accentDark: "#0369a1",
        bgActive: "#f0f9ff",
        borderActive: "#38bdf8",
        ring: "rgba(2, 132, 199, 0.18)",
        badgeBg: "#e0f2fe"
      };
    }
    return {
      accent: "#2563eb",
      accentDark: "#1d4ed8",
      bgActive: "#eff6ff",
      borderActive: "#3b82f6",
      ring: "rgba(37, 99, 235, 0.18)",
      badgeBg: "#dbeafe"
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
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: `1px solid ${theme.borderActive}`,
              borderRadius: "12px",
              maxHeight: "250px",
              overflowY: "auto",
              padding: "6px",
              boxShadow:
                "0 20px 45px -10px rgba(15, 23, 42, 0.18), 0 8px 20px -6px rgba(37, 99, 235, 0.14), 0 0 0 1px rgba(37, 99, 235, 0.08)",
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
                background: #f1f5f9;
                border-radius: 8px;
              }
              .cyber-select-portal-menu::-webkit-scrollbar-thumb {
                background: #93c5fd;
                border-radius: 8px;
              }
              .cyber-select-portal-menu::-webkit-scrollbar-thumb:hover {
                background: #2563eb;
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
                background-color: #eff6ff;
                color: #1d4ed8;
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
                    color: isSelected ? theme.accentDark : "#334155",
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
          backgroundColor: disabled ? "#f1f5f9" : isOpen ? theme.bgActive : "#ffffff",
          border: `1px solid ${isOpen ? theme.borderActive : "#cbd5e1"}`,
          padding: "0.52rem 0.8rem",
          borderRadius: "10px",
          color: disabled ? "#94a3b8" : isOpen ? theme.accentDark : "#0f172a",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: "0.82rem",
          fontWeight: 600,
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: isOpen
            ? `0 0 0 3.5px ${theme.ring}, 0 4px 12px rgba(37, 99, 235, 0.08)`
            : "0 1px 2px rgba(15, 23, 42, 0.04)",
          opacity: disabled ? 0.6 : 1,
          userSelect: "none"
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = "#60a5fa";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.08)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
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