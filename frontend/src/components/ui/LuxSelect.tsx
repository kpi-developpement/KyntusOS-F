"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, ChevronsUpDown } from "lucide-react";
import styles from "./LuxSelect.module.css";

interface Option {
  value: string;
  label: string;
}

interface LuxSelectProps {
  label?: string;
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function LuxSelect({ label, options, value, onChange, disabled, placeholder }: LuxSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // L-Shield 🛡️
  const safeOptions = options || [];
  const selectedLabel = safeOptions.find((o) => o.value === value)?.label;

  return (
    <div className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`} ref={ref}>
      {label && <span className={styles.label}>{label}</span>}
      
      <button
        type="button"
        className={`${styles.trigger} ${isOpen ? styles.active : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => { if (e.key === "Escape") setIsOpen(false); }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span className={value ? styles.textVal : styles.placeholder}>
          {selectedLabel || placeholder || "Sélectionner…"}
        </span>
        
        {isOpen ? (
            <ChevronDown size={16} className={styles.rotated} />
        ) : (
            <ChevronsUpDown size={14} className={styles.arrow} />
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {safeOptions.length > 0 ? (
            safeOptions.map((opt) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                tabIndex={0}
                className={`${styles.option} ${opt.value === value ? styles.selected : ''}`}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(opt.value); setIsOpen(false); }
                  if (e.key === "Escape") setIsOpen(false);
                }}
              >
                {opt.label}
                {opt.value === value && <Check size={16} />}
              </div>
            ))
          ) : (
            <div className={styles.empty}>Aucune option disponible</div>
          )}
        </div>
      )}
    </div>
  );
}