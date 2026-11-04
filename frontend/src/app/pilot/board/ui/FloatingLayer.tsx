"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ============================================================================
// FLOATING LAYER — renders a panel in document.body (portal), anchored to an
// element. It is never clipped by the table's overflow, always stays inside
// the viewport, and gets its own internal scroll when space is short.
// ============================================================================

interface FloatingLayerProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  width?: number;
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}

const GAP = 8;
const MARGIN = 12;

export default function FloatingLayer({
  anchor,
  open,
  onClose,
  width = 320,
  align = "left",
  className,
  children,
}: FloatingLayerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number; placeAbove: boolean }>({
    top: -9999,
    left: -9999,
    maxHeight: 400,
    placeAbove: false,
  });

  useEffect(() => setMounted(true), []);

  // Position calculation (runs on open, scroll of ANY ancestor, resize)
  useLayoutEffect(() => {
    if (!open || !anchor) return;

    let frame = 0;
    const compute = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!anchor.isConnected) {
          onCloseRef.current();
          return;
        }
        const r = anchor.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = Math.min(width, vw - MARGIN * 2);

        let left = align === "right" ? r.right - w : r.left;
        left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));

        const spaceBelow = vh - r.bottom - GAP - MARGIN;
        const spaceAbove = r.top - GAP - MARGIN;
        const placeAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
        const maxHeight = Math.max(180, placeAbove ? spaceAbove : spaceBelow);
        const top = placeAbove ? r.top - GAP : r.bottom + GAP;

        setPos({ top, left, maxHeight, placeAbove });
      });
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, anchor, width, align]);

  // Outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchor?.contains(t)) return;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchor]);

  if (!mounted || !open || !anchor) return null;

  return createPortal(
    <div
      ref={panelRef}
      className={className}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: Math.min(width, typeof window !== "undefined" ? window.innerWidth - MARGIN * 2 : width),
        maxHeight: pos.maxHeight,
        transform: pos.placeAbove ? "translateY(-100%)" : undefined,
        zIndex: 100000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>,
    document.body
  );
}