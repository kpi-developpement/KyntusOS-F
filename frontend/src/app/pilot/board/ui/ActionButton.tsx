"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import styles from "./ActionButton.module.css";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  variant?: "cyan" | "danger" | "warning";
  onClick: () => void;
}

export default function ActionButton({ icon: Icon, label, variant = "cyan", onClick }: ActionButtonProps) {
  return (
    <button className={`${styles.cyberBtn} ${styles[variant]}`} onClick={onClick}>
      {/* L-Khtet li kay-dowez d-dow (Scanner) */}
      <span className={styles.scanner}></span>
      
      {/* L-Contenu dyal l-bouton */}
      <span className={styles.content}>
        <Icon size={16} className={styles.icon} />
        <span className={styles.label}>{label}</span>
      </span>
      
      {/* L-Glitch / Brackets f j-jnab */}
      <span className={styles.brackets}></span>
    </button>
  );
}