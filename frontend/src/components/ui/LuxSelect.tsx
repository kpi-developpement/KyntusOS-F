"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, ChevronsUpDown } from "lucide-react";
import styles from "./LuxSelect.module.css";

interface Option {
  value: string;
  label: string;
}

interface LuxSelectProps {
  label: string;
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
    const handleClick = (e: any) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div className={`${styles.wrapper} ${disabled ? styles.disabled : ''}`} ref={ref}>
      <span className={styles.label}>{label}</span>
      
      <div 
        className={`${styles.trigger} ${isOpen ? styles.active : ''}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? styles.textVal : styles.placeholder}>
          {selectedLabel || placeholder || "SÉLECTIONNER..."}
        </span>
        
        {/* Icone qui change selon l'état */}
        {isOpen ? (
            <ChevronDown size={16} className={styles.rotated} />
        ) : (
            <ChevronsUpDown size={14} className={styles.arrow} />
        )}
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {options.length > 0 ? (
            options.map((opt) => (
              <div 
                key={opt.value} 
                className={`${styles.option} ${opt.value === value ? styles.selected : ''}`}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
              >
                {opt.label}
                {opt.value === value && <Check size={14} />}
              </div>
            ))
          ) : (
            <div className={styles.empty}>// NO DATA FOUND</div>
          )}
        </div>
      )}
    </div>
  );
}