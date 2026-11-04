"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import o from "./BoardOverlays.module.css";

// ============================================================================
// LUXE MODAL — portal into <body>, locks page scroll, Esc to close,
// header/footer fixed and body scrolls on its own.
// ============================================================================

interface LuxeModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export default function LuxeModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  width = 980,
  footer,
  children,
}: LuxeModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className={o.modalBackdrop} onMouseDown={onClose}>
      <div
        className={o.modalCard}
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={o.modalHeader}>
          <div className={o.modalHeaderLeft}>
            {icon && <span className={o.modalIcon}>{icon}</span>}
            <div>
              <h3 className={o.modalTitle}>{title}</h3>
              {subtitle && <p className={o.modalSubtitle}>{subtitle}</p>}
            </div>
          </div>
          <button type="button" className={o.modalClose} onClick={onClose} title="Fermer (Échap)">
            <X size={18} />
          </button>
        </div>

        <div className={o.modalBody}>{children}</div>

        {footer && <div className={o.modalFooter}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}