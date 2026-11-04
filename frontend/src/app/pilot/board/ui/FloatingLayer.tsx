"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ============================================================================
// FLOATING LAYER — renders a panel in document.body (portal), anchored to an
// element. Never clipped by any overflow / stacking context of the page,
// always above everything (max z-index), stays inside the viewport and gets
// its own internal scroll when space is short.
// ============================================================================

interface FloatingLayerProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  width?: number;
  /** panel is at least as wide as the anchor (dropdowns) */
  fitAnchor?: boolean;
  /** max height of the panel even when there is more room */
  maxHeightCap?: number;
  align?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}

const GAP = 8;
const MARGIN = 12;
export const TOP_LAYER_Z = 2147483000;

interface Pos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placeAbove: boolean;
  ready: boolean;
}

export default function FloatingLayer({
  anchor,
  open,
  onClose,
  width = 320,
  fitAnchor = false,
  maxHeightCap,
  align = "left",
  className,
  children,
}: FloatingLayerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Pos>({ top: -9999, left: -9999, width, maxHeight: 400, placeAbove: false, ready: false });

  useEffect(() => setMounted(true), []);

  // Position (open, scroll of ANY ancestor, resize) — one calc per frame max
  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPos((p) => (p.ready ? { ...p, ready: false } : p));
      return;
    }

    let frame = 0;
    const calc = () => {
      if (!anchor.isConnected) {
        onCloseRef.current();
        return;
      }
      const r = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(fitAnchor ? Math.max(width, r.width) : width, vw - MARGIN * 2);

      let left = align === "right" ? r.right - w : r.left;
      left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));

      const spaceBelow = vh - r.bottom - GAP - MARGIN;
      const spaceAbove = r.top - GAP - MARGIN;
      const placeAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
      let maxHeight = Math.max(160, placeAbove ? spaceAbove : spaceBelow);
      if (maxHeightCap) maxHeight = Math.min(maxHeight, maxHeightCap);
      const top = placeAbove ? r.top - GAP : r.bottom + GAP;

      setPos((p) =>
        p.ready && p.top === top && p.left === left && p.width === w && p.maxHeight === maxHeight && p.placeAbove === placeAbove
          ? p
          : { top, left, width: w, maxHeight, placeAbove, ready: true }
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(calc);
    };

    calc(); // synchronous first placement → no visual jump
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [open, anchor, width, fitAnchor, maxHeightCap, align]);

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
        width: pos.width,
        maxHeight: pos.maxHeight,
        transform: pos.placeAbove ? "translateY(-100%)" : undefined,
        visibility: pos.ready ? "visible" : "hidden",
        zIndex: TOP_LAYER_Z,
        display: "flex",
        flexDirection: "column",
        isolation: "isolate",
      }}
    >
      {children}
    </div>,
    document.body
  );
}